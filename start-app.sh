#!/usr/bin/env zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${ROOT_DIR}"

# Ajout automatique des binaires Homebrew (OpenJDK, Maven, MySQL 8.4, Node) au PATH
export PATH="/opt/homebrew/opt/openjdk/bin:/opt/homebrew/opt/mysql@8.4/bin:/opt/homebrew/bin:${PATH}"
export JAVA_HOME="/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home"

mkdir -p "${ROOT_DIR}/logs"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo "🛑 Arrêt des services uniform-app..."
  if [[ -n "${FRONTEND_PID}" ]] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
  fi
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
  echo "✅ Services arrêtés proprement."
}
trap cleanup EXIT INT TERM

echo "=================================================================="
echo "🚀 Lancement de BidLab (MySQL 8.4 + Quarkus 3 + Angular 21)"
echo "=================================================================="

# ------------------------------------------------------------------
# 1. Vérification et démarrage de la base de données MySQL 8.4 (port 3306)
# ------------------------------------------------------------------
is_mysql_listening() {
  nc -z 127.0.0.1 3306 >/dev/null 2>&1
}

ensure_local_mysql_schema() {
  if command -v mysql >/dev/null 2>&1; then
    mysql -u root -e "
      CREATE DATABASE IF NOT EXISTS uniform_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
      CREATE USER IF NOT EXISTS 'uniform'@'localhost' IDENTIFIED BY 'uniform';
      CREATE USER IF NOT EXISTS 'uniform'@'127.0.0.1' IDENTIFIED BY 'uniform';
      CREATE USER IF NOT EXISTS 'uniform'@'%' IDENTIFIED BY 'uniform';
      GRANT ALL PRIVILEGES ON uniform_db.* TO 'uniform'@'localhost';
      GRANT ALL PRIVILEGES ON uniform_db.* TO 'uniform'@'127.0.0.1';
      GRANT ALL PRIVILEGES ON uniform_db.* TO 'uniform'@'%';
      FLUSH PRIVILEGES;
    " 2>/dev/null || true
  fi
}

echo "🔍 [1/4] Vérification de la base de données MySQL 8.4 (127.0.0.1:3306)..."
if is_mysql_listening; then
  echo "✅ MySQL écoute déjà sur le port 3306."
  ensure_local_mysql_schema
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo "🐳 Docker détecté : démarrage du conteneur mysql:8.4 via docker-compose..."
  docker compose up -d mysql
  echo "⏳ Attente de la disponibilité de MySQL 8.4..."
  until is_mysql_listening; do
    sleep 2
  done
  sleep 3
  echo "✅ Conteneur MySQL 8.4 opérationnel."
else
  echo "🍺 Docker non actif : utilisation de MySQL 8.4 via Homebrew..."
  if ! brew list mysql@8.4 >/dev/null 2>&1; then
    echo "📦 Installation de mysql@8.4 via Homebrew..."
    HOMEBREW_NO_AUTO_UPDATE=1 brew install mysql@8.4
  fi
  echo "▶️  Démarrage du service Homebrew mysql@8.4..."
  brew services start mysql@8.4 >/dev/null
  echo "⏳ Attente du démarrage de MySQL 8.4 sur 127.0.0.1:3306..."
  for _ in {1..30}; do
    if is_mysql_listening; then
      break
    fi
    sleep 2
  done
  ensure_local_mysql_schema
  echo "✅ MySQL 8.4 opérationnel et base 'uniform_db' prête."
fi

# ------------------------------------------------------------------
# 2. Vérification de Node.js et des dépendances Angular 21
# ------------------------------------------------------------------
echo "🔍 [2/4] Vérification de Node.js & Frontend Angular 21..."
if ! command -v npm >/dev/null 2>&1; then
  echo "📦 Installation de Node.js via Homebrew..."
  HOMEBREW_NO_AUTO_UPDATE=1 brew install node
fi

if [[ ! -d "${ROOT_DIR}/frontend/node_modules" ]]; then
  echo "📦 Installation des dépendances npm du frontend Angular 21..."
  (cd "${ROOT_DIR}/frontend" && npm install --legacy-peer-deps)
fi
echo "✅ Environnement Frontend prêt."

# ------------------------------------------------------------------
# 3. Démarrage du Backend Quarkus 3.x (Java 25, port 8080)
# ------------------------------------------------------------------
echo "▶️  [3/4] Démarrage du Backend Quarkus (port 8080)..."
mvn quarkus:dev -Dquarkus.analytics.disabled=true -Dnet.bytebuddy.experimental=true -Djvm.args="-Dnet.bytebuddy.experimental=true" -Ddebug=false < /dev/null > "${ROOT_DIR}/logs/backend.log" 2>&1 &
BACKEND_PID=$!

echo "⏳ Attente de l'initialisation de Quarkus et de Flyway (logs: logs/backend.log)..."
BACKEND_READY=0
for _ in {1..60}; do
  if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
    echo "❌ Le backend Quarkus s'est arrêté prématurément. Dernières lignes de logs/backend.log :"
    tail -n 40 "${ROOT_DIR}/logs/backend.log"
    exit 1
  fi
  if curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:8080/api/v1/auth/token \
      -H "Content-Type: application/json" \
      -d '{"username":"healthcheck","role":"ROLE_USER"}' | grep -q "200"; then
    BACKEND_READY=1
    break
  fi
  sleep 2
done
if [[ "${BACKEND_READY}" -ne 1 ]]; then
  echo "❌ Délai dépassé lors du démarrage de Quarkus. Dernières lignes de logs/backend.log :"
  tail -n 40 "${ROOT_DIR}/logs/backend.log"
  exit 1
fi
echo "✅ Backend Quarkus opérationnel sur http://localhost:8080"

# ------------------------------------------------------------------
# 4. Démarrage du Frontend Angular 21 (Zoneless & Signals, port 4200)
# ------------------------------------------------------------------
echo "▶️  [4/4] Démarrage du Frontend Angular 21 sur http://localhost:4200 ..."
(cd "${ROOT_DIR}/frontend" && npm start < /dev/null) > "${ROOT_DIR}/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!

FRONTEND_READY=0
for _ in {1..45}; do
  if ! kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    echo "❌ Le frontend Angular s'est arrêté prématurément. Dernières lignes de logs/frontend.log :"
    tail -n 40 "${ROOT_DIR}/logs/frontend.log"
    exit 1
  fi
  if nc -z 127.0.0.1 4200 >/dev/null 2>&1; then
    FRONTEND_READY=1
    break
  fi
  sleep 2
done
if [[ "${FRONTEND_READY}" -ne 1 ]]; then
  echo "❌ Délai dépassé lors du démarrage d'Angular. Dernières lignes de logs/frontend.log :"
  tail -n 40 "${ROOT_DIR}/logs/frontend.log"
  exit 1
fi

echo ""
echo "=================================================================="
echo "🎉 UNIFORM-APP EST EN LIGNE !"
echo "   • Frontend Angular 21 : http://localhost:4200"
echo "   • Backend Quarkus API : http://localhost:8080"
echo "   • Logs Backend        : ${ROOT_DIR}/logs/backend.log"
echo "   • Logs Frontend       : ${ROOT_DIR}/logs/frontend.log"
echo "   (Appuyez sur Ctrl+C pour tout arrêter proprement)"
echo "=================================================================="

wait "${BACKEND_PID}" "${FRONTEND_PID}"

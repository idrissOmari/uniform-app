#!/usr/bin/env zsh
# ==============================================================================
# UniformApp — Exposition publique HTTPS via Cloudflare Quick Tunnel
# ==============================================================================
set -e
export PATH="/opt/homebrew/bin:$PATH"

echo "🚀 Vérification des services UniformApp..."
if ! lsof -i :8080 >/dev/null 2>&1; then
  echo "⚠️  Le backend Quarkus (port 8080) ne semble pas démarré. Lancez d'abord : mvn quarkus:dev"
fi

if ! lsof -i :4200 >/dev/null 2>&1; then
  echo "▶️  Démarrage du serveur Angular (port 4200) en arrière-plan..."
  (cd frontend && npx ng serve --proxy-config proxy.conf.json >/tmp/uniform-ng-serve.log 2>&1 &)
  sleep 4
fi

echo "🌐 Ouverture du tunnel HTTPS Cloudflare vers http://localhost:4200 ..."
cloudflared tunnel --url http://localhost:4200

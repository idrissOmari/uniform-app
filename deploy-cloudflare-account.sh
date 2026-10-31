#!/usr/bin/env zsh
# ==============================================================================
# UniformApp — Déploiement sur votre compte Cloudflare (Cloudflare Pages + API)
# ==============================================================================
set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

PROJECT_NAME="uniform-app"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
DIST_BROWSER_DIR="$FRONTEND_DIR/dist/uniform-app-frontend/browser"

echo "======================================================================"
echo "☁️  Déploiement de UniformApp sur votre compte Cloudflare"
echo "======================================================================"

# 1. Connexion au compte Cloudflare si nécessaire
if ! npx --yes wrangler whoami >/dev/null 2>&1; then
  echo "🔐 Étape 1/4 : Connexion à votre compte Cloudflare (une fenêtre navigateur va s'ouvrir)..."
  npx --yes wrangler login
else
  echo "✅ Étape 1/4 : Déjà connecté à votre compte Cloudflare."
fi

# 2. Build de production Angular (dans un cache isolé pour ne pas gêner ng serve)
echo "🏗️  Étape 2/4 : Compilation de production du Frontend Angular 21..."
cd "$FRONTEND_DIR"
npx ng build --configuration production

# Ajout de la règle SPA _redirects pour Cloudflare Pages
echo "/api/* https://constitution-chicago-underlying-prostate.trycloudflare.com/api/:splat 200" > "$DIST_BROWSER_DIR/_redirects"
echo "/* /index.html 200" >> "$DIST_BROWSER_DIR/_redirects"

# 3. Création du projet Cloudflare Pages s'il n'existe pas encore
echo "📦 Étape 3/4 : Vérification / création du projet Cloudflare Pages '$PROJECT_NAME'..."
npx --yes wrangler pages project create "$PROJECT_NAME" --production-branch main 2>/dev/null || true

# 4. Publication sur Cloudflare Pages
echo "🚀 Étape 4/4 : Publication sur Cloudflare Pages..."
npx --yes wrangler pages deploy "$DIST_BROWSER_DIR" --project-name="$PROJECT_NAME" --branch=main

echo "======================================================================"
echo "✅ Déploiement terminé sur votre compte Cloudflare !"
echo "======================================================================"

#!/usr/bin/env zsh
# ==============================================================================
# BidLab (bidlab.ma) — Déploiement 100% Cloud Autonome sur Cloudflare (Pages + D1 + Edge API)
# Aucun serveur local (ni Quarkus, ni MySQL, ni tunnel cloudflared) n'est requis !
# ==============================================================================
set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export NODE_OPTIONS="--dns-result-order=ipv4first"

PROJECT_NAME="uniform-app"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
DIST_BROWSER_DIR="$FRONTEND_DIR/dist/uniform-app-frontend/browser"

echo "======================================================================"
echo "☁️  Déploiement 100% Cloud Autonome de BidLab (Cloudflare Pages + D1)"
echo "======================================================================"

# 1. Connexion au compte Cloudflare si nécessaire
if [ ! -f "$HOME/Library/Preferences/.wrangler/config/default.toml" ] && ! npx --yes wrangler whoami >/dev/null 2>&1; then
  echo "🔐 Étape 1/4 : Connexion à votre compte Cloudflare (une fenêtre navigateur va s'ouvrir)..."
  npx --yes wrangler login
else
  echo "✅ Étape 1/4 : Déjà connecté à votre compte Cloudflare."
fi

# Synchronisation de la Cloudflare Pages Function vers la racine (pour builds GitHub & CLI)
mkdir -p "$ROOT_DIR/functions/api"
cp "$FRONTEND_DIR/functions/api/[[path]].js" "$ROOT_DIR/functions/api/[[path]].js"

# 2. Build de production Angular
echo "🏗️  Étape 2/4 : Compilation de production du Frontend Angular 21..."
cd "$FRONTEND_DIR"
npx ng build --configuration production

# Configuration du routage SPA et des routes Pages Functions (/api/*)
echo "/* /index.html 200" > "$DIST_BROWSER_DIR/_redirects"
cat > "$DIST_BROWSER_DIR/_routes.json" << 'EOF'
{
  "version": 1,
  "include": ["/api/*"],
  "exclude": []
}
EOF

# 3. Vérification du projet Cloudflare Pages
echo "📦 Étape 3/4 : Vérification du projet Cloudflare Pages '$PROJECT_NAME'..."
npx --yes wrangler pages project create "$PROJECT_NAME" --production-branch main 2>/dev/null || true

# 4. Publication sur Cloudflare Pages (Frontend + Serverless API + Base D1 Cloud)
echo "🚀 Étape 4/4 : Publication sur Cloudflare Pages (100% Cloud sans dépendance locale)..."
npx --yes wrangler pages deploy "$DIST_BROWSER_DIR" --project-name="$PROJECT_NAME" --branch=main --commit-dirty=true

echo "======================================================================"
echo "✅ Déploiement 100% Cloud terminé sur https://uniform-app.pages.dev !"
echo "   Votre application fonctionne désormais de manière totalement autonome"
echo "   même lorsque votre Mac est éteint."
echo "======================================================================"

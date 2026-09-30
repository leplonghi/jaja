#!/usr/bin/env bash
# Deploy do jaja no Firebase App Hosting, a partir do código local.
#
# Uso:
#   FIREBASE_PROJECT=meu-projeto-id ./scripts/deploy-firebase.sh
#
# Autenticação (uma das duas):
#   - interativa, uma única vez:  npx firebase-tools@15 login
#   - sem navegador (CI):         GOOGLE_APPLICATION_CREDENTIALS=/caminho/conta-de-servico.json
#
# Antes: preencha o bloco `env:` do apphosting.yaml (as NEXT_PUBLIC_* entram no build).
set -euo pipefail
cd "$(dirname "$0")/.."

: "${FIREBASE_PROJECT:?Defina FIREBASE_PROJECT com o ID do projeto Firebase}"
FB="npx --yes firebase-tools@15"

if ! grep -qE '^env:' apphosting.yaml; then
  echo "ERRO: o bloco 'env:' do apphosting.yaml está comentado." >&2
  echo "Sem as variáveis do Supabase o app sobe em modo demonstração (sem login nem gravação)." >&2
  exit 1
fi
if grep -qE 'SEU-PROJETO|SEU-DOMINIO|sb_publishable_\.\.\.' apphosting.yaml; then
  echo "ERRO: apphosting.yaml ainda tem valores de exemplo (SEU-PROJETO / SEU-DOMINIO)." >&2
  exit 1
fi

npm ci
npm run typecheck
npm run lint
npm test

# Na primeira vez o CLI cria o backend "jaja" (pede a região se for interativo).
$FB deploy --only apphosting --project "$FIREBASE_PROJECT" ${CI:+--non-interactive}

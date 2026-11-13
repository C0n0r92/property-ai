#!/usr/bin/env bash
# Build, push and deploy the site to DigitalOcean App Platform.
#
#   scripts/deploy.sh            deploy the current commit
#   scripts/deploy.sh --create   first time only: create the app from .do/app.yaml
#
# Needs: doctl (logged in), Docker. Images are built for linux/amd64 and pushed
# to registry.digitalocean.com/gaff/{web,pipeline}, tagged with the commit.
#
# On --create, the Stripe key is read from dashboard/.env.local and sent to
# DigitalOcean, which encrypts it. Later deploys reuse the live app spec (with
# its encrypted secrets) and only change the image tags, so secrets set in the
# DigitalOcean dashboard are kept.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
APP_NAME="irish-property-data"
REGISTRY="registry.digitalocean.com/gaff"
SITE_URL="https://irishpropertydata.com"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Commit or stash your changes first: the deploy is tagged with the commit." >&2
  exit 1
fi
TAG="$(git rev-parse --short HEAD)"
GA_ID="$(grep -E '^NEXT_PUBLIC_GA_MEASUREMENT_ID=' dashboard/.env.local 2>/dev/null | cut -d= -f2- || true)"

echo "Building $TAG for linux/amd64..."
docker build --platform linux/amd64 -t "$REGISTRY/web:$TAG" \
  --build-arg NEXT_PUBLIC_SITE_URL="$SITE_URL" \
  --build-arg NEXT_PUBLIC_GA_MEASUREMENT_ID="$GA_ID" .
docker build --platform linux/amd64 -f Dockerfile.pipeline -t "$REGISTRY/pipeline:$TAG" .

doctl registry login >/dev/null
docker push "$REGISTRY/web:$TAG"
docker push "$REGISTRY/pipeline:$TAG"

SPEC="$(mktemp)"
trap 'rm -f "$SPEC" "$SPEC.bak"' EXIT
chmod 600 "$SPEC"
APP_ID="$(doctl apps list --format ID,Spec.Name --no-header | awk -v n="$APP_NAME" '$2 == n { print $1 }')"

if [[ "${1:-}" == "--create" ]]; then
  if [[ -n "$APP_ID" ]]; then
    echo "The app already exists ($APP_ID); run without --create." >&2
    exit 1
  fi
  STRIPE="$(grep -E '^STRIPE_SECRET_KEY=' dashboard/.env.local | cut -d= -f2-)"
  TAG="$TAG" STRIPE="$STRIPE" python3 - "$SPEC" <<'PY'
import os, re, sys
s = open(".do/app.yaml").read().replace("tag: TAG", f"tag: {os.environ['TAG']}")
s = s.replace("      - key: STRIPE_SECRET_KEY\n        scope: RUN_TIME\n        type: SECRET",
              "      - key: STRIPE_SECRET_KEY\n        scope: RUN_TIME\n        type: SECRET\n"
              f"        value: \"{os.environ['STRIPE']}\"")
# Email is optional: without an SMTP address, leave both settings out
s = re.sub(r"      - key: SMTP_URL\n.*?\n.*?\n      - key: EMAIL_FROM\n.*?\n", "", s, flags=re.S)
open(sys.argv[1], "w").write(s)
PY
  doctl apps create --spec "$SPEC" --wait --format ID,DefaultIngress
else
  if [[ -z "$APP_ID" ]]; then
    echo "No app named $APP_NAME yet; run with --create." >&2
    exit 1
  fi
  doctl apps spec get "$APP_ID" > "$SPEC"
  # Point every component at the new images
  sed -i.bak -E "s/^([[:space:]]+tag:[[:space:]]+).*/\1$TAG/" "$SPEC"
  doctl apps update "$APP_ID" --spec "$SPEC" --wait --format ID,DefaultIngress
fi

echo "Deployed $TAG."

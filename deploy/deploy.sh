#!/usr/bin/env bash
set -euo pipefail
sha=${1:?sha required}
root=/home/ubuntu/buryad
release="$root/releases/$sha"
cd "$release"
sha256sum -c SHA256SUMS
mkdir -p "$root"
if [[ ! -f "$root/.env" ]]; then
  umask 077
  printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 32)" > "$root/.env"
fi
export APP_VERSION="$sha"
docker load -i image.tar.gz
cp compose.yaml "$root/compose.yaml"
cd "$root"
docker compose --env-file .env up -d --remove-orphans
for i in $(seq 1 30); do curl -fsS http://127.0.0.1:18127/healthz >/dev/null && break; sleep 2; done
curl -fsS http://127.0.0.1:18127/healthz
ln -sfn "$release" "$root/current"
ls -1dt "$root"/releases/* 2>/dev/null | tail -n +6 | xargs -r rm -rf

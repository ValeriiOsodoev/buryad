#!/usr/bin/env bash
set -euo pipefail
src=${1:-/home/ubuntu/buryad/current/nginx.conf}
sudo -n install -m 0644 "$src" /etc/nginx/sites-available/buryad.buuzoed.dev
sudo -n ln -sfn /etc/nginx/sites-available/buryad.buuzoed.dev /etc/nginx/sites-enabled/buryad.buuzoed.dev
sudo -n nginx -t
sudo -n systemctl reload nginx
if command -v certbot >/dev/null 2>&1; then
  sudo -n certbot --nginx -d buryad.buuzoed.dev --non-interactive --agree-tos --register-unsafely-without-email --redirect || true
fi

#!/bin/sh
set -e
node /app/status-api.mjs &
sleep 0.3
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile

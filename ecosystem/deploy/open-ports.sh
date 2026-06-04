#!/usr/bin/env bash
# Открыть 80/443 в ufw на сервере (панель Timeweb тоже нужно настроить вручную)
set -euo pipefail

if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp comment 'HTTP ACME + redirect'
  ufw allow 443/tcp comment 'HTTPS'
  ufw allow 443/udp comment 'HTTP/3' 2>/dev/null || true
  echo "ufw:"
  ufw status numbered || ufw status
else
  echo "ufw не установлен — откройте 80/tcp и 443/tcp в панели Timeweb → Сервер → Firewall."
fi

echo ""
echo "Timeweb: Облачные серверы → ваш VPS → Сеть / Firewall → разрешить входящие TCP 80, 443 с 0.0.0.0/0"

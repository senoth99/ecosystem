#!/usr/bin/env bash
# Только миграции drops / bloggers / zarplaty (если deploy.sh уже отработал, но БД отстала)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

[[ -f .env ]] || { echo "Нет .env"; exit 1; }

set -a
# shellcheck disable=SC1091
source .env
set +a

COMPOSE=(docker compose -f docker-compose.prod.yml --env-file .env)
COMPOSE_DEPLOY=(docker compose -f docker-compose.prod.yml --env-file .env --profile deploy)

# shellcheck source=lib-postgres.sh
source "$(dirname "$0")/lib-postgres.sh"
sync_drops_postgres_password

echo "==> drops-migrate"
"${COMPOSE_DEPLOY[@]}" run --rm --no-TTY drops-migrate

echo "==> bloggers-migrate"
"${COMPOSE_DEPLOY[@]}" run --rm --no-TTY bloggers-migrate || true

echo "==> zarplaty-migrate"
"${COMPOSE_DEPLOY[@]}" run --rm --no-TTY zarplaty-migrate || true

docker compose -f docker-compose.prod.yml --env-file .env restart drops bloggers zarplaty
echo "Готово."

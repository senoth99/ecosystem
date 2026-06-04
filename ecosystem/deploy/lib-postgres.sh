#!/usr/bin/env bash
# shellcheck shell=bash
# Синхронизирует пароль пользователя drops в Postgres с DROPS_DB_PASSWORD из .env

sync_drops_postgres_password() {
  local pw="${DROPS_DB_PASSWORD:-drops}"
  local pg_user="${POSTGRES_USER:-ecosystem}"

  echo "==> Postgres: пароль пользователя drops (из DROPS_DB_PASSWORD)..."

  "${COMPOSE[@]}" exec -T postgres psql \
    -v ON_ERROR_STOP=1 \
    -v drops_pw="$pw" \
    -U "$pg_user" \
    -d postgres <<'EOSQL'
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'drops') THEN
    EXECUTE format('ALTER USER drops WITH PASSWORD %L', :'drops_pw');
  ELSE
    EXECUTE format('CREATE USER drops WITH PASSWORD %L', :'drops_pw');
  END IF;
END
$$;
SELECT 'CREATE DATABASE drops OWNER drops'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'drops')\gexec
GRANT ALL PRIVILEGES ON DATABASE drops TO drops;
EOSQL
}

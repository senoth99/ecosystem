#!/usr/bin/env bash
# shellcheck shell=bash
# Синхронизирует пароль пользователя drops в Postgres с DROPS_DB_PASSWORD из .env

sql_escape_literal() {
  printf "%s" "$1" | sed "s/'/''/g"
}

sync_drops_postgres_password() {
  local pw="${DROPS_DB_PASSWORD:-drops}"
  local pw_sql
  pw_sql="$(sql_escape_literal "$pw")"
  local pg_user="${POSTGRES_USER:-ecosystem}"
  local psql=( "${COMPOSE[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U "$pg_user" -d postgres )

  echo "==> Postgres: пароль пользователя drops (из DROPS_DB_PASSWORD)..."

  local role_exists db_exists
  role_exists="$("${psql[@]}" -tAc "SELECT 1 FROM pg_roles WHERE rolname = 'drops'")"
  db_exists="$("${psql[@]}" -tAc "SELECT 1 FROM pg_database WHERE datname = 'drops'")"

  if [[ "${role_exists// /}" == "1" ]]; then
    "${psql[@]}" -c "ALTER USER drops WITH PASSWORD '${pw_sql}';"
  else
    "${psql[@]}" -c "CREATE USER drops WITH PASSWORD '${pw_sql}';"
  fi

  if [[ "${db_exists// /}" != "1" ]]; then
    "${psql[@]}" -c "CREATE DATABASE drops OWNER drops;"
  fi

  "${psql[@]}" -c "GRANT ALL PRIVILEGES ON DATABASE drops TO drops;"
}

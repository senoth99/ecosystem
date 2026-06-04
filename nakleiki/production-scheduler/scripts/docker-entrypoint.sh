#!/bin/sh
set -eu
cd /app || exit 1
url="${DATABASE_URL:-}"
case "$url" in
file:*|"file:"*)
  db_path="${url#file:}"
  mkdir -p "$(dirname "$db_path")"
  if [ -n "${UPLOADS_DIR:-}" ]; then
    mkdir -p "$UPLOADS_DIR"
  fi
  echo "[entrypoint] SQLite — prisma migrate (fallback: db push)"
  if ! sh /app/scripts/prisma-sqlite-migrate.sh; then
    echo "[entrypoint] migrate failed — prisma db push"
    npx prisma db push --skip-generate
  fi
  ;;
esac
exec "$@"

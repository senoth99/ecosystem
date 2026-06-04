#!/bin/bash
set -euo pipefail

drops_pw="${DROPS_DB_PASSWORD:-drops}"

psql -v ON_ERROR_STOP=1 \
  -v drops_pw="$drops_pw" \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<'EOSQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'drops') THEN
    EXECUTE format('CREATE USER drops WITH PASSWORD %L', :'drops_pw');
  END IF;
END
$$;
SELECT 'CREATE DATABASE drops OWNER drops'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'drops')\gexec
GRANT ALL PRIVILEGES ON DATABASE drops TO drops;
EOSQL

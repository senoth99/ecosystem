#!/bin/bash
set -euo pipefail

drops_pw="${DROPS_DB_PASSWORD:-drops}"
drops_pw_sql="${drops_pw//\'/\'\'}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
CREATE USER drops WITH PASSWORD '${drops_pw_sql}';
CREATE DATABASE drops OWNER drops;
GRANT ALL PRIVILEGES ON DATABASE drops TO drops;
EOSQL

#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 \
    -v ro_user="$RO_USER" \
    -v ro_password="$RO_PASSWORD" \
    -v ro_db="$POSTGRES_DB" \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" <<-'EOSQL'
    SELECT format('CREATE USER %I WITH PASSWORD %L', :'ro_user', :'ro_password')
    WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'ro_user')\gexec
    GRANT CONNECT ON DATABASE :"ro_db" TO :"ro_user";
    GRANT pg_monitor TO :"ro_user";
    GRANT USAGE ON SCHEMA public TO :"ro_user";
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO :"ro_user";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO :"ro_user";
EOSQL
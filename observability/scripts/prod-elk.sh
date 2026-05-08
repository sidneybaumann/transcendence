#!/usr/bin/env bash

set -euo pipefail
set -a
source .env.prod
set +a

COMPOSE_FILE="docker-compose.prod.yml"
ES_URL="http://elasticsearch:9200"
ES_USER="elastic"
ES_PASSWORD="${ELASTIC_PASSWORD:?ELASTIC_PASSWORD is not set}"
KIBANA_SYSTEM_PASSWORD="${KIBANA_SYSTEM_PASSWORD:?KIBANA_SYSTEM_PASSWORD is not set}"
KIBANA_URL="http://kibana:5601"
KIBANA_SAVED_OBJECTS_FILE="observability/kibana/saved_objects/export.ndjson"
KIBANA_IMPORT_URL="http://kibana:5601/api/saved_objects/_import?overwrite=true"
LOGSTASH_URL="http://logstash:8080"
MAX_ATTEMPTS=30
SLEEP_SECONDS=3

echo "Starting Elasticsearch..."
docker compose --env-file .env.prod -f "$COMPOSE_FILE" up -d elasticsearch

echo "Waiting for Elasticsearch to be ready..."

attempt=1
until docker compose --env-file .env.prod -f "$COMPOSE_FILE" exec -T app \
  curl -fsS -u "$ES_USER:$ES_PASSWORD" "$ES_URL/_cluster/health" >/dev/null 2>&1; do
  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "Error: Elasticsearch is not ready after $((MAX_ATTEMPTS * SLEEP_SECONDS)) seconds."
    exit 1
  fi

  echo "Elasticsearch not ready yet... ($attempt/$MAX_ATTEMPTS)"
  attempt=$((attempt + 1))
  sleep "$SLEEP_SECONDS"
done

echo "Elasticsearch is ready."

echo "Waiting for Elasticsearch ILM API to be ready..."

attempt=1
until docker compose --env-file .env.prod -f "$COMPOSE_FILE" exec -T app \
  curl -fsS -u "$ES_USER:$ES_PASSWORD" \
  "$ES_URL/_ilm/status" >/dev/null 2>&1; do
  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "Error: Elasticsearch ILM API is not ready after $((MAX_ATTEMPTS * SLEEP_SECONDS)) seconds."
    exit 1
  fi

  echo "Elasticsearch ILM API not ready yet... ($attempt/$MAX_ATTEMPTS)"
  attempt=$((attempt + 1))
  sleep "$SLEEP_SECONDS"
done

echo "Elasticsearch ILM API is ready."

echo "Applying ILM policy..."

docker compose --env-file .env.prod -f "$COMPOSE_FILE" exec -T app \
  curl -fsS -u "$ES_USER:$ES_PASSWORD" \
  -H "Content-Type: application/json" \
  -X PUT "$ES_URL/_ilm/policy/ft-transcendence-logs-policy" \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "actions": {}
        },
        "warm": {
          "min_age": "3d",
          "actions": {}
        },
        "delete": {
          "min_age": "7d",
          "actions": {
            "delete": {}
          }
        }
      }
    }
  }'

echo "ILM policy applied."

echo "Applying index template..."

docker compose --env-file .env.prod -f "$COMPOSE_FILE" exec -T app \
  curl -fsS -u "$ES_USER:$ES_PASSWORD" \
  -H "Content-Type: application/json" \
  -X PUT "$ES_URL/_index_template/ft-transcendence-template" \
  -d '{
    "index_patterns": ["ft-transcendence-*"],
    "template": {
      "settings": {
        "index.lifecycle.name": "ft-transcendence-logs-policy"
      }
    }
  }'

echo "Index template applied."

echo "Bootstrapping kibana_system password..."

docker compose --env-file .env.prod -f "$COMPOSE_FILE" exec -T app \
  curl -fsS -u "$ES_USER:$ES_PASSWORD" \
  -H "Content-Type: application/json" \
  -X POST "$ES_URL/_security/user/kibana_system/_password" \
  -d "{\"password\":\"$KIBANA_SYSTEM_PASSWORD\"}"

echo "kibana_system password configured."

echo "Starting Kibana..."
docker compose --env-file .env.prod -f "$COMPOSE_FILE" up -d kibana

echo "Waiting for Kibana to be ready..."

attempt=1
until docker compose --env-file .env.prod -f "$COMPOSE_FILE" exec -T app \
  curl -fsS -u "$ES_USER:$ES_PASSWORD" "$KIBANA_URL/api/status" >/dev/null 2>&1; do
  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "Error: Kibana is not ready after $((MAX_ATTEMPTS * SLEEP_SECONDS)) seconds."
    exit 1
  fi

  echo "Kibana not ready yet... ($attempt/$MAX_ATTEMPTS)"
  attempt=$((attempt + 1))
  sleep "$SLEEP_SECONDS"
done

echo "Kibana is ready."

echo "Waiting for Kibana saved objects import API to be ready..."

attempt=1
until docker compose --env-file .env.prod -f "$COMPOSE_FILE" exec -T app \
  curl -fsS -u "$ES_USER:$ES_PASSWORD" \
  -H "kbn-xsrf: true" \
  "$KIBANA_URL/api/status" >/dev/null 2>&1; do
  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "Error: Kibana saved objects import API is not ready after $((MAX_ATTEMPTS * SLEEP_SECONDS)) seconds."
    exit 1
  fi

  echo "Kibana import API not ready yet... ($attempt/$MAX_ATTEMPTS)"
  attempt=$((attempt + 1))
  sleep "$SLEEP_SECONDS"
done

echo "Kibana saved objects import API is ready."

if [ -f "$KIBANA_SAVED_OBJECTS_FILE" ]; then
  echo "Importing Kibana saved objects..."

  import_response="$(mktemp)"
  http_code="$(docker compose --env-file .env.prod -f "$COMPOSE_FILE" exec -T app \
    curl -sS -u "$ES_USER:$ES_PASSWORD" \
    -o /tmp/kibana-import-response.json \
    -w "%{http_code}" \
    -X POST "$KIBANA_IMPORT_URL" \
    -H "kbn-xsrf: true" \
    --form file=@"$KIBANA_SAVED_OBJECTS_FILE")"

  docker compose --env-file .env.prod -f "$COMPOSE_FILE" exec -T app cat /tmp/kibana-import-response.json > "$import_response"

  if [ "$http_code" = "200" ]; then
    if python3 - "$import_response" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)

if data.get("success") is not True:
    sys.exit(1)

errors = data.get("errors", [])
if errors:
    sys.exit(1)
PY
    then
      echo "Kibana saved objects imported."
    else
      echo "Error: Kibana saved objects import returned HTTP 200 but reported failure."
      cat "$import_response"
      rm -f "$import_response"
      exit 1
    fi
  else
    echo "Error: Kibana saved objects import failed with HTTP $http_code."
    cat "$import_response"
    rm -f "$import_response"
    exit 1
  fi

  rm -f "$import_response"
else
  echo "No Kibana saved objects file found, skipping import."
fi

echo "Starting Logstash..."
docker compose --env-file .env.prod -f "$COMPOSE_FILE" up -d logstash

echo "Waiting for Logstash to be ready..."

attempt=1
until docker compose --env-file .env.prod -f "$COMPOSE_FILE" exec -T app \
  curl -fsS "$LOGSTASH_URL" >/dev/null 2>&1; do
  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "Error: Logstash is not ready after $((MAX_ATTEMPTS * SLEEP_SECONDS)) seconds."
    exit 1
  fi

  echo "Logstash not ready yet... ($attempt/$MAX_ATTEMPTS)"
  attempt=$((attempt + 1))
  sleep "$SLEEP_SECONDS"
done

echo "Logstash is ready."
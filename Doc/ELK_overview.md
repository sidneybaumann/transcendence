

# ELK Module Overview

## Quick Start

### Goal
Run the ELK stack locally, connect backend logs to Logstash, and inspect them in Kibana.

### Prerequisites
- Docker and Docker Compose installed
- VS Code devcontainer working for the app, backend, and frontend workflow
- Project cloned and `.env` created from `.env.example`

### Required `.env` variables
Check that the following variables are defined in your local `.env`:

- `ELASTIC_PASSWORD=...`
- `KIBANA_SYSTEM_PASSWORD=...`
- `LOGSTASH_URL=http://logstash:8080`

### Notes
- `ELASTIC_USERNAME` is purely informational and is not to be changed.
- `ELASTIC_PASSWORD` is used by Elasticsearch, Logstash, and Kibana bootstrap.
- `KIBANA_SYSTEM_PASSWORD` is used for the `kibana_system` account.
- `LOGSTASH_URL` is used by the backend logging client.

### Recommended startup workflow
1. Open the project in the devcontainer.
2. On the host, start ELK only:
   ```bash
   pnpm run dev-elk
   ```
3. In the devcontainer, start the app:
   ```bash
   pnpm run dev
   ```


### What `pnpm run dev-elk` does
- Starts Elasticsearch
- Waits until Elasticsearch is really ready
- Applies the ILM policy
- Applies the Elasticsearch index template
- Bootstraps the `kibana_system` password
- Starts Kibana
- Waits until Kibana is ready
- Imports Kibana saved objects if the NDJSON export is present
- Starts Logstash
- Waits until Logstash is ready

### Expected validation checks
- `docker ps` shows `elasticsearch`, `kibana`, and `logstash`
- `curl -u elastic:<ELASTIC_PASSWORD> http://localhost:9200` returns Elasticsearch JSON
- `curl -I http://localhost:5601` redirects to `/login`
- Kibana opens correctly in the browser
- Backend actions generate logs visible in Logstash, Elasticsearch, and Kibana

### Useful manual checks
Elasticsearch:

```bash
curl -u elastic:<ELASTIC_PASSWORD> http://localhost:9200
```

Kibana:

```bash
curl -I http://localhost:5601
```

Logstash logs:

```bash
docker logs logstash --tail 100
```

Search logs in Elasticsearch:

```bash
curl -u elastic:<ELASTIC_PASSWORD> 'http://localhost:9200/ft-transcendence-*/_search?pretty'
```

### Kibana
- Main data view: `ft-transcendence-*`
- Saved objects export path:
  `observability/kibana/saved_objects/export.ndjson`

## Implementation Summary

### Overview
ELK has been implemented in 12 phases detailed below.

### Phase 0 - Technical choices
Fixed the main architecture decisions:
- Elasticsearch single-node for local development
- Kibana connected through `kibana_system`
- Logstash HTTP JSON input for backend logs
- Explicit orchestration through a dedicated script
- Structured JSON logs with stable datasets

### Phase 1 - Repository structure
Created a dedicated `observability` folder with separate areas for:
- `elasticsearch`
- `kibana`
- `logstash`
- `scripts`

This kept observability isolated from the application code and made the module easier to maintain.

### Phase 2 - Compose integration
Added Elasticsearch, Kibana, and Logstash to `docker-compose.dev.yml`.
The services were configured minimally and mounted with versioned config files.
We kept the setup simple and development-oriented.

### Phase 3 - Orchestration script
Created `observability/scripts/dev-elk.sh` as the single official entry point for the ELK stack.
The script was designed to be explicit and reproducible:
- Start one service at a time
- Wait actively for readiness
- Fail clearly on error
- Apply bootstrap steps automatically

### Phase 4 - Elasticsearch stabilization
Validated Elasticsearch in isolation:
- Single-node mode works
- Authentication is active
- The API responds correctly
- Data persists through the Docker volume

This gave us a clean and testable base before adding the rest of the stack.

### Phase 5 - Kibana stabilization
Configured Kibana with a minimal `kibana.yml` and connected it to Elasticsearch through `kibana_system`.
The `kibana_system` password is bootstrapped automatically by the script once Elasticsearch is ready.
This makes Kibana startup reproducible without manual steps.

### Phase 6 - Minimal Logstash pipeline
Introduced a first useful Logstash pipeline:
- HTTP JSON input
- `stdout` output for debugging
- Elasticsearch output for persistence

Validated the full path manually with a test event.

### Phase 7 - Log schema conventions
Before integrating the real backend, we defined a stable log schema.
Mandatory fields:
- `@timestamp`
- `message`
- `log.level`
- `service.name`
- `event.dataset`

Official datasets:
- `server`
- `auth`
- `security`
- `game`
- `errors`

This gave a defendable structure before wiring the application.

### Phase 8 - Backend to Logstash integration
Added a dedicated backend logging client and started integrating real application events.
The backend now emits structured logs to Logstash using a centralized `sendLog` helper.
Improved the helper so that logging does not block application requests:
- Non-blocking fire-and-forget calls
- Short timeout with `AbortController`

### Phase 9 - Logstash enrichment and routing
Improved the pipeline so logs are easier to read and analyze:
- Simple filtering
- Tags for `auth`, `security`, and `errors`
- Fallback dataset to `server`
- Routing to dataset-specific indices

Current index family:
- `ft-transcendence-server-*`
- `ft-transcendence-auth-*`
- `ft-transcendence-security-*`
- `ft-transcendence-game-*`
- `ft-transcendence-errors-*`

Intentionally avoided the `logs-*` prefix to prevent data stream conflicts in this setup.

### Phase 10 - Kibana views and dashboards
Created:
- A shared data view on `ft-transcendence-*`
- Simple visualizations for dataset volume, route activity, and auth/security activity
- A dashboard for an overview of the system

The Kibana saved objects are exported and stored in the repository so they can be reimported on another machine.

### Phase 11 - Retention strategy
Added a simple ILM policy:
- Keep logs for 7 days
- Delete automatically afterwards

The policy is attached through an Elasticsearch index template covering `ft-transcendence-*`.
Both the ILM policy and the template are applied automatically by `pnpm run dev-elk` through the orchestration script.

### Phase 12 - Hardening and cleanup
Cleaned up temporary workarounds and improved portability:
- Devcontainer starts only `app`, `db`, and `mailpit`
- ELK is started explicitly from the host
- Logstash HTTP input is bound more safely for development
- Runtime steps are documented and reproducible

### Design principles kept throughout the implementation
- Simple before clever
- One clear official startup workflow
- Structured logs before dashboards
- Reproducibility across machines
- No manual hidden steps when the stack starts

### Result
The final module provides:
- Reproducible local ELK startup
- Structured backend observability
- Searchable and separated logs in Elasticsearch
- Readable dashboards in Kibana
- Automatic retention with ILM

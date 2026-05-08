MONITORING_SERVICES = prometheus postgres-exporter node-exporter cadvisor grafana alertmanager
OBS_SERVICES = elasticsearch kibana logstash


monitor:
	docker compose -f docker-compose.dev.yml up -d $(MONITORING_SERVICES)

halt-monitor:
	docker compose -f docker-compose.dev.yml stop $(MONITORING_SERVICES)

elk:
	./observability/scripts/prod-elk.sh

halt-elk:
	docker compose --env-file .env.prod -f docker-compose.prod.yml stop $(OBS_SERVICES)


prep:
	@chmod +x scripts/*.sh
	@chmod +x ./observability/scripts/*.sh
	@chmod -R 644 monitoring/prometheus/prometheus.yml
	@chmod -R 644 monitoring/grafana/datasources/datasources.yml

destroy-dev:
	docker compose -f docker-compose.dev.yml down -v --remove-orphans

prod-up: prep
	docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
	until docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T app true >/dev/null 2>&1; do sleep 2; done
	$(MAKE) elk

prod-down:
	docker compose --env-file .env.prod -f docker-compose.prod.yml down

studio-up:
	docker compose --env-file .env.prod -f docker-compose.prod.yml --profile studio up -d prisma-studio

studio-down:
	docker compose --env-file .env.prod -f docker-compose.prod.yml stop prisma-studio

destroy-prod:
	docker compose --env-file .env.prod -f docker-compose.prod.yml down -v --remove-orphans $(OBS_SERVICES)
	docker compose --env-file .env.prod -f docker-compose.prod.yml down -v --remove-orphans
	docker compose --env-file .env.prod -f docker-compose.prod.yml stop prisma-studio 2>/dev/null || true
	docker compose --env-file .env.prod -f docker-compose.prod.yml rm -f prisma-studio 2>/dev/null || true
	docker network prune -f

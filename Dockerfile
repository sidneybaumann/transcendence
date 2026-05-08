
# ==========================================
# Stage 1: Frontend Build
# ==========================================
FROM node:24-bookworm-slim AS frontend-builder

WORKDIR /app

# Enable Corepack to manage pnpm versions.
RUN corepack enable

# Copy workspace configuration and frontend package files first for caching.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY frontend/package.json frontend/package.json

# Install only frontend dependencies.
RUN pnpm install --frozen-lockfile --filter frontend...

# Copy frontend source files and build.
COPY frontend/tsconfig*.json frontend/
COPY frontend/vite.config.ts frontend/
COPY frontend/index.html frontend/
COPY frontend/public frontend/public
COPY frontend/src frontend/src

RUN pnpm -C frontend build

# ==========================================
# Stage 2: Build & Setup
# ==========================================
FROM node:24-bookworm-slim AS builder

WORKDIR /app

# Provide dummy values so prisma doesn't fail during build (it needs some environment variables that are not available at build time). These will be overridden by actual values at runtime via environment variables.
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV NODE_ENV="production"

# Install build tools for native Node modules and clean up apt cache to reduce image size.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Enable Corepack to manage pnpm versions.
RUN corepack enable

# Copy workspace configuration and root package files to set up the monorepo context for pnpm.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json backend/package.json

# Install only backend dependencies for a smaller build context. (the '...' syntax tells pnpm to install the specified package and only dependencies of that package).
RUN pnpm install --frozen-lockfile --filter backend...

# Copy backend source and Prisma schema.
COPY backend/tsconfig.json backend/prisma.config.ts backend/
COPY backend/prisma backend/prisma
COPY backend/src backend/src

# Generate Prisma client
RUN pnpm -C backend exec prisma generate
# Build the backend files (TypeScript -> JavaScript)
RUN pnpm -C backend build

# Copy generated Prisma client to the dist folder for production use. This ensures the compiled server can access the generated client code.
RUN mkdir -p backend/dist/generated \
	&& cp -R backend/src/generated/prisma backend/dist/generated/prisma

# Remove dev-only dependencies for production. 'pnpm install --prod' re-evaluate the dependency tree and remove anything not needed for production.
RUN pnpm install --prod --frozen-lockfile --filter backend...

# ==========================================
# Stage 3: Production Runner
# ==========================================
FROM node:24-bookworm-slim AS runner

# Install OpenSSL and CA certificates (required for Prisma and HTTPS)
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Set the NODE_ENV to production to ensure that any libraries that check this variable will run in production mode, which can improve performance and reduce memory usage.
ENV NODE_ENV=production
WORKDIR /app

# Create a non-root user to run the app more safely.
RUN groupadd -r app && useradd -r -g app app

# Copy the necessary files from the builder stage to the runner stage. This includes the node_modules for both the root and backend, the backend's package.json, and the compiled backend code in the dist folder. This setup allows the production image to have all the necessary dependencies and compiled code to run the server without including any development dependencies or source files that are not needed in production.
COPY --from=builder --chown=app:app /app/node_modules /app/node_modules
COPY --from=builder --chown=app:app /app/backend/node_modules /app/backend/node_modules
COPY --from=builder --chown=app:app /app/backend/package.json /app/backend/package.json
COPY --from=builder --chown=app:app /app/backend/dist /app/backend/dist
COPY --from=builder --chown=app:app /app/backend/prisma /app/backend/prisma

COPY --from=builder --chown=app:app /app/backend/prisma.config.ts /app/backend/prisma.config.ts

COPY --chown=app:app scripts/start.sh /app/start.sh
RUN mkdir -p /app/observability/kibana/saved_objects
COPY --chown=app:app observability/kibana/saved_objects/export.ndjson /app/observability/kibana/saved_objects/export.ndjson
RUN chmod +x /app/start.sh

USER app
EXPOSE 3000

CMD ["/bin/sh", "/app/start.sh"]

# ==========================================
# Stage 4: Caddy Static Assets
# ==========================================
FROM caddy:2-alpine AS caddy

COPY --from=frontend-builder --chown=caddy:caddy /app/frontend/dist /var/www/frontend/dist

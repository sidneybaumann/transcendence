This guide outlines the transition from a local development environment to a hardened, optimized production deployment. It explains the architectural choices made to ensure security, environment consistency, and performance.

---

## 1. Development vs. Production Philosophy

The project uses two distinct environments to balance developer productivity with production security.

### Development Environment
* **Image:** A heavy Dev Container containing all tools (Node.js, pnpm, git, compilers).
* **Workflow:** The container stays active via `command: sleep infinity`. Developers manually start the backend with `tsx watch` (for hot-reloading) and the frontend with Vite.
* **Access:** Ports are mapped directly to the host (e.g., `3000`, `5173`) for easy debugging.

### Production Environment
* **Hardening:** Production builds must not contain development tools. Stripping these utilities reduces the final image size and minimizes the attack surface by removing compilers and shells that could be exploited.
* **Workflow:** Automated builds where source code and compilers are discarded after use.
* **Access:** Only essential ports (HTTPS/HTTP) are exposed via Caddy. Internal services like the backend and database are isolated within a private Docker network.

---

## 2. Multi-Stage Docker Architecture

The production build is divided into four distinct stages to create highly optimized and secure images.

### Stage 1: Frontend Builder
* Uses `node:24-bookworm-slim` to install dependencies and compile the React application.
* Generates a minified `dist` folder ready for static serving.

### Stage 2: Backend Builder
* Installs build tools (Python, make, g++) required for native modules like `argon2`.
* Compiles TypeScript into JavaScript and generates the Prisma Client.
* Uses `pnpm install --prod` at the end of this stage to remove development-only dependencies before moving to the runner.

### Stage 3: Production Runner
* Starts with a fresh, clean Node image.
* Copies **only** the compiled `dist` folder and production `node_modules` from the builder.
* **Security:** Runs under a dedicated non-root `app` user to mitigate security risks.

### Stage 4: Caddy
* A final stage that takes the compiled frontend assets from Stage 1 and bakes them into the Caddy image.
* This ensures the frontend is served as static files, which is significantly faster than running a development server in production.

---

## 3. Environment Consistency: Why Multi-Stage?

While a Makefile on the host machine is easier to debug, the multi-stage Docker approach is the "gold standard" for three reasons:

| Feature | Makefile / Host Build | Multi-stage Docker Build |
| :--- | :--- | :--- |
| **Determinism** | Depends on the developer's local Node version. | Guaranteed `node:24` environment for everyone. |
| **Dependencies** | Requires `pnpm` and compilers on the host. | Host only needs Docker; all tools stay in the "Builder". |
| **Cleanliness** | Can leave "dirty" artifacts in the `dist` folder. | Every build starts from a fresh, empty directory. |

---

## 4. Reverse Proxy & SSL (Caddy)

Caddy serves as the hardened entry point for all production traffic, managing everything from SSL termination to request routing.

### SSL and Certificate Management
* **Internal CA:** For internal evaluation or testing on `localhost`, we use the `tls internal` directive. This instructs Caddy to use its own internal Certificate Authority to issue self-signed certificates.
* **Automatic HTTPS:** For public hostnames like `snake42.com`, removing `tls internal` triggers Caddy's automatic HTTPS. It will attempt to obtain a trusted certificate from an ACME CA such as Let’s Encrypt. 
* **Deployment Risks:** If you use `tls internal` on a public hostname, external users will see a security warning. Conversely, if you rely on ACME but your DNS is not pointing correctly or the server is not reachable on port 80/443, HTTPS provisioning will fail and the site may fallback to HTTP.
* **Redirection:** To maintain security, all HTTP traffic is automatically and permanently redirected to HTTPS using the `{host}{uri}` mapping.

### Traffic Handling and Security
* **Static Assets:** Caddy handles the frontend by serving compiled files from `/var/www/frontend/dist`. For Single Page Application (SPA) support, it is configured to use `try_files {path} /index.html`, ensuring that client-side routing works correctly.
* **API Proxying:** Requests to `/api/*` and `/healthcheck` are transparently proxied to the backend `app` service on port 3000.
* **IP Allowlisting:** Access to sensitive areas like the Swagger UI (`/doc*`) is restricted using an `@docAllowed` matcher. This uses a `remote_ip` allowlist to ensure only local or trusted private network ranges (e.g., `127.0.0.1`, `192.168.0.0/16`) can view the documentation.
* **Access Denied:** Any unauthorized attempts to access `/doc*` or restricted paths like `/metrics` result in a `403 Access Denied` response.
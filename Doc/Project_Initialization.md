# Project Intitialization

version 1.0 Published on 18 February 2026 by Sidney

## Base Tech Stack

| Type                  | Tech                                 |
| --------------------- | ------------------------------------ |
| **Dev environment**   | devContainer                         |
| **Database**          | PostgreSQL                           |
| **Frontend**          | Vite, Typescript, React, TailwindCSS |
| **Backend**           | Fastify, Prisma                      |
| **Formating/linting** | ESLint, Prettier                     |

```text
Later on we'll add: Swagger (API docs), Zod (validation), etc.
```

## Step 0 - First commit | chore: initialize repository (branch: main)

- Clone repo
- Create/Update `README.md` file

## Step 1 - Second commit | chore: add devcontainer with postgres service (branch: initial-setup)

- Create a new branch called "initial-setup".
- Inside our cloned repository/folder, we create these files: `docker-compose.yml`, `.env.example`, `.env`, `.gitignore` and `.devcontainer/devcontainer.json`

### 1. `docker-compose.yml`

```yaml
services:
  app:
    container_name: "ft_transcendence"
    image: mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm
    environment:
      - DATABASE_URL=${DATABASE_URL}
    ports:
      - 3000:3000
      - 5173:5173
    volumes:
      - .:/workspace
    depends_on:
      - db
    working_dir: /workspace
    command: sleep infinity

  db:
    container_name: postgres
    image: postgres:15-alpine
    restart: unless-stopped
    # S: "always" = restart even if manually stopped (prod),
    # S: "unless-stopped" = restart unless explicitly stopped it (dev).
    # S: Can be removed as vscode controls startup and shutdown. (stopCompose in devcontainer.json)
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

- `mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm` comes with Node.js, Typescript compiler, git, npm, corepack (pnpm/yarn), common Debian build tools, common development tools (git, zsh, eslint) and its configuration is optimized for VS Code DevContainer extension.

- `postgres:15-alpine` is based on alpine, a light and stable Linux distribution.

### 2. `.env.example`

An `.env.example` file documents all required environment variables (without secrets) so teammates know what must be configured, ensuring consistent setup across machines while keeping real credentials private.

````bash
# Database Configuration
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=your_db_name

# App Configuration
DATABASE_URL=postgresql://your_db_user:your_db_password@db:5432/your_db_name?schema=public```
````

### 3. `.env`

```bash
# Database Configuration
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=transcendence

# App Configuration
DATABASE_URL="postgresql://user:password@db:5432/transcendence?schema=public"
```

### 4. `.gitignore`

```text
# Environment variables (secrets)
.env

# macOS noise
.DS_Store
```

### 5. `devcontainer.json`

```json
{
  "name": "new-transcendence",
  "dockerComposeFile": "../docker-compose.dev.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "shutdownAction": "stopCompose",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "Prisma.prisma",
        "bradlc.vscode-tailwindcss",
        "mikestead.dotenv"
      ],
      "settings": {
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
          "source.fixAll.eslint": "explicit"
        }
      }
    }
  },
  "remoteUser": "node"
}
```

- `"name":`: Acts as a label for VS Code UI
- `"service": "app"`: Tells VS Code to attach to the service named 'app' in the docker-compose
- `"workspaceFolder"`: "/workspace": Sets the working directory inside the container where your project files are mounted.
- `"shutdownAction"`: "stopCompose": Stops all services defined in docker-compose when you close the dev container.``
- `"extensions"`: Lists VS Code extensions that will be automatically installed in the container environment.
  - `dbaeumer.vscode-eslint`: Highlights coding errors and enforces rules directly in your editor.
  - `esbenp.prettier-vscode`: Automatically formats code layout (spacing, wrapping) on save.
  - `Prisma.prisma`: Adds syntax highlighting and auto-completion for schema.prisma database files.
  - `bradlc.vscode-tailwindcss`: Provides auto-completion and hover previews for Tailwind CSS classes.
  - `mikestead.dotenv`: Adds syntax coloring to .env files for better readability.
- `"settings"`: Overrides or defines editor settings specifically for this dev container.
  - `"editor.defaultFormatter"`: "esbenp.prettier-vscode": Sets Prettier as the default formatter for supported file types.
  - `"editor.formatOnSave"`: true: Automatically formats files whenever you save them.
  - `"editor.codeActionsOnSave"`: Runs automatic code actions when saving a file.
  - `"source.fixAll.eslint"`: "explicit": Applies ESLint auto-fixes on save when explicitly triggered by the configuration.
- `"remoteUser": "node"`: Uses the node user (non-root) for better security and permission management. (Default setting)

### 6. Reopen in DevContainer

Ensure the ports you are using are free.  
Press `F1` and click 'Dev Containers: Reopen in Container'.

- When the devContainer is running we are in `workspace/`, connected as `node` (whoami) as set in the `devcontainer.json` file.
- VS Code automatically adds the `GitHub Copilot Chat` extension along with the ones we specified.
- Two volumes are created : `vscode` and `init_postgres_data` (note: 'init' here is the current repository/folder name, could be anything else you chose to call it).

## Step 2 - Third commit | chore: scaffold workspace structure (branch: initial-setup)

- Create `frontend/README.md`, `backend/README.md`, `pnpm-workspace.yaml`, `package.json`
- Lock **pnpm** in the package.json file.

### 1. `pnp-workspace.yaml`

```yaml
packages:
  - "frontend"
  - "backend"
```

### 2. `package.json`

package.json is:

- A dependency declaration file
- A project descriptor
- A build/task configuration file
- A deployment contract

```bash
pnpm init
```

```json
{
  "name": "ft_transcendence",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@10.11.0" // Here we lock pnpm
}
```

**`"private": true`**: Prevents you from accidentally publishing this project to the public npm registry.

## Step 3 - Fourth commit | feat: scaffold backend with fastify, prisma, and typescript (branch: initial-setup)

> Make sure you are in the `backend/` folder unless specified otherwise.

- Create `backend/package.json`, `backend/tsconfig.json`, `backend/src/server.ts`
- Create `backend/tsconfig.json`
- Add `.pnpm-store/` to `.gitignore`
- Add fastify, typescript, tsx, @types/node, prisma@7.4.0, @prisma/client@7.4.0, dotenv, pg, @prisma/adapter, @types/pg
- Create `src/prisma.ts`

### 1. `backend/package.json`

```bash
pnpm init
```

Remove, the line with "main" and add `"type": "module"`.

Add the following scripts:

```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "prisma:migrate": "prisma migrate dev",
  "prisma:generate": "prisma generate"
}
```

### 2. `backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "module": "ES2022",
    "moduleResolution": "bundler",
    "target": "ES2023",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

Note: We’ll likely switch to NodeNext when we add a production build step with tsc emitting JS.

### 3. `backend/src/server.ts`

```ts
import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/health", async () => {
  return { status: "ok" };
});

app
  .listen({ port: 3000, host: "0.0.0.0" })
  .then(() => {
    console.log("Server running on http://localhost:3000");
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
```

### 4. Add 'fastify'

```bash
pnpm add fastify
```

#### What is automatically added/created :

- At root : `node-modules/`, `pnpm-lock.yaml`, `.pnpm/store/`
- In backend: `nodes-modules/`

### 5. Add 'typescript'

```bash
pnpm add -D typescript tsx @types/node
```

Packages:

- typescript: The core compiler.
- @types/node: Provides Type definitions for Node.js APIs (like process or fs).
- tsx: The runtime that allows you to execute TypeScript files directly and includes the watch feature natively.

Note: in DEV, we use `tsx` which is simpler than `nodemon`.

### 6. Add 'dotenv'

```bash
pnpm add -D dotenv
```

- `dotenv` is a package that loads environment variables from a .env file into process.env, allowing you to manage configuration (like API keys or database URLs) outside your source code.

### 7. Add `prisma`, `@prisma/client`, `pg`, `@prisma/adapter-pg` and `@types/pg`

```bash
pnpm add -D prisma@7.4.0
pnpm add @prisma/client@7.4.0
pnpm add pg @prisma/adapter-pg
pnpm add -D @types/pg
```

```bash
pnpm prisma init
```

Update the DATABASE_URL `in backend/.env`.

Edit `prisma/schema.prisma` and create your first model :

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  createdAt DateTime @default(now())
}
```

#### What is automatically added/created :

- In backend: `prisma/prisma.schema`, `prisma.config.ts` and `.env` .

### 8. Migration

```bash
pnpm prisma migrate dev --name init
```

Note: This creates `prisma/migrations/`with a `migration_lock.toml` file. You can also use the script `pnpm prisma:migrate`.  
Clearly note what the migration is about using the `--name` tag, e.g., `--name add user field`.

### 9. Prisma generate

```bash
pnpm prisma generate
```

We run pnpm prisma generate again whenever the Prisma schema changes because it regenerates the Prisma Client based on the updated models, ensuring your TypeScript code matches the current database structure.

### 10. Visualize your database

```bash
pnpm prisma studio
```

Go to http://localhost:5000.

### 11. Check /health route

```bash
pnpm dev
```

Go to http://localhost:3000/health. You must see {"status":"ok"}.

### 12. Update `src/prisma.ts`

```ts
import { PrismaClient } from "./generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
```

### 13. Update `server.ts`

```ts
import Fastify from "fastify";
import { prisma } from "./prisma";

const app = Fastify({ logger: true });

app.get("/api/health", async () => {
  return { status: "ok" };
});

app.get("/api/users", async () => {
  const users = await prisma.user.findMany();
  return users;
});

app
  .listen({ port: 3000, host: "0.0.0.0" })
  .then(() => {
    console.log("Server running on http://localhost:3000");
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
```

#### Check that prisma is working

- Go to http://localhost:3000/users. This should return an empty array [] as we did not create a user.

### 14. Update .gitignore

- At root:

```text
  node_modules/
  backend/node_modules/
  frontend/node_modules/
  dist/
```

- In backend/.gitignore:

```text
  node_modules/

  # Keep environment variables out of version control
  .env

  /src/generated/prisma

  dist/
```

### 15. Add script "postinstall": "prisma generate"

Since we put `/src/generated/prisma` in `.gitignore`, we need to do `prisma generate` after each install.  
By using `postinstall` it happens automatically when we do `pnpm install`.

## Step 4 - Fifth commit | feat: scaffold frontend (vite + react + tailwind) (branch: initial-setup)

> Make sure you are in the `frontend/` folder unless specified otherwise.

- Create `frontend/package.json`
- Add `Vite`with `React` and `TypeScript + SWC`, `TailwindCSS`

### 1. frontend/package.json

```bash
pnpm init
```

### 2. Add 'Vite'

```bash
pnpm create Vite
```

You'll be prompted to select some options :

- Project name: use a dot '.', i.e. 'this very project'.
- Choose 'ignore files and continue'.
- Choose `React`
- Choose `TypeScript + SWC`.
- Vite beta? Select 'no'.
- 'Install with pnpm and start now' Select 'yes'.

Note: TypeScript + SWC installs:

- React type definitions
- ESLint config
- SWC plugin
- tsconfig files

#### What is automatically added/created :

```text
frontend/
  .gitignore
  index.html
  vite.config.ts
  tsconfig.json
  tsconfig.node.json
  tsconfig.app.json
  package.json // gets updated
  src/
    main.tsx
    App.tsx
    App.css
    index.css
    assets/
      react.svg
  public/
  node_modules/
  README.md // gets updated with lots of contents
```

### Vite starts automatically but fails

We need to update the dev script to have `--host 0.0.0.0` and relaunch.

### 3. Add 'TailwindCSS'

```bash
pnpm add -D tailwindcss@3 postcss autoprefixer
pnpm exec tailwindcss init -p
```

#### What is automatically added/created :

- tailwind.config.js
- postcss.config.js

Replace the contents of tailwind.config.js with:

```text
 /** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

Replace the content of `src/index.css`with:

```text
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Note: This may cause issues with VSCode and show linting errors.

#### Solution

- Create at root `.vscode/settings.json`
- Add:

```json
{
  "css.lint.unknownAtRules": "ignore"
}
```

#### Check if TailwindCSS is working

- Temporarily replace the contents of `App.tsx` with :

```ts
export default function App() {
return (
<div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
<h1 className="text-4xl font-bold text-blue-400">Tailwind works ✅</h1>
</div>
);
}
```

- Relaunch the server and you should see `Tailwind works ✅` styled at the center of the page.

- If that does not work, try reloading the TS server by calling `Restart: TS Server` in VS Code.

- Generally speaking, you can also reload VS Code's window (like 'cmd/ctrl + R' in a browser) : `Developer: Reload Window`

## Step 5 - Sixth commit | feat: wire frontend to backend via /api proxy (branch: initial-setup)

Add the folowing to `vite.config.ts`:

```ts
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
```

#### Check if Vite can reach api/ routes

Add `/api` in front of route names in `server.ts`, then run `pnpm dev` in both backend/frontend folders.

Go to http://localhost:5173/api/health, you should get { "status": "ok" }.  
Go to http://localhost:5173/api/users, you should get an empty array [ ].

## Step 6 - Seventh commit | chore: add shared tooling (prettier, concurrently) (branch: initial-setup)

> Make sure you are neither in `frontend/` nor in `backend/`. You must run commands from `workspace/` (root).
>
> We added -w as a safety measure, because, in a pnpm workspace:  
> • Without -w → it installs inside the current package (e.g. frontend/ or backend/)  
> • With -w → it installs in the root package.json.
>
> So technically, we do not need it here as we call that command at root level.

- Create `.prettierignore` and `.prettierrc`
- Add `prettier`and `concurrently`

### 1. Add 'prettier'

```bash
pnpm add -D -w prettier
```

Add to `.prettierrc` :

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

Note: Apparently, `prettier.config.cjs` is more flexible. We might want to look it up.

Add to `.prettierignore`:

```text
node_modules/
dist/
.pnpm-store/
coverage/
```

Add root scripts :

```json
"scripts": {
  "format": "prettier . --write",
  "format:check": "prettier . --check"
}
```

### 2. Add 'concurrently'

```bash
pnpm add -D -w concurrently
```

Add root scripts :

```json
"dev": "concurrently \"pnpm -C backend dev\" \"pnpm -C frontend dev\""
```

#### Now, you can run both backend and frontend concurrently using that command.

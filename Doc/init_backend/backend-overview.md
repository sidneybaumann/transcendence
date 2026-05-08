This file presents an overview of a basic backend implementation as how it was implemented during the first 2 weeks of the project, explained in Route1-register.md, Route2-login.md, Route3-logout.md. The final backend is NOT REST anymore.  


# Index

- [Tech stack](#tech-stack)
- [REST API](#rest-api)
- [Current API endpoints](#current-api-endpoints)
- [Architecture: Layers of Responsability](#architecture-layers-of-responsability)
- [List of commands](#list-of-commands)
- [Ressources Used](#ressources-used)

# Tech stack

- **Fastify**: The framework. It handles the "routing" (deciding which code runs when a user hits a specific URL).
- **PostgreSQL**: The database. This is where you store persistent data like users, scores, and match history.
- **Prisma**: The **ORM (Object-Relational Mapper)**. It allows you to talk to PostgreSQL using TypeScript code instead of raw SQL queries.
- **Zod**: A validation library. It ensures the data coming into your API is correct (e.g., checking if an email is actually an email).
- **Argon2**: The password hashing algorithm. It securely hashes user passwords before storing them in the database.
- **fastify/jwt**: The authentication plugin. It lets us create and verify **JWTs (JSON Web Tokens)**. After a user logs in, we generate a signed token that proves their identity. The server verifies this token on protected routes to authenticate requests.
- **fastify/cookie**: The cookie parser/manager. It allows the Fastify server to read, set, and manage HTTP cookies. Often used to store JWTs securely so the browser automatically sends them with each request.
- **fastify/swagger**: Documentation. It automatically generates a website where you can test your API endpoints.

# REST API (Representational State Transfer)

It is a set of rules for communication between a Client (frontend) and a Server (backend).

- **Request-Response Cycle**: The client asks for something (Request); the server processes it and sends an answer (Response).
- **HTTP Verbs**: We use specific "actions" to tell the server what to do:
  - **GET**: Fetch data.
  - **POST**: Create data.
  - **PUT**: Create or completely replace data.
  - **PATCH**: Update data.
  - **DELETE**: Remove data.

- **Resources (URIs)**: Data is organized into "Resources" accessed via URLs (e.g., `/users/42`).
- **Stateless**: The server doesn't remember the client between requests; every request must contain all necessary information (like a token).
- **JSON**: The standard text format used to exchange data.

**Goal**: It allows the frontend and backend to be decoupled and to talk to each other using a standardized language without needing to know how the other side is built.

# API endpoints

- `api/users/register`
- `api/users/login`
- `api/users/logout`
- `api/users/csrf`

# Architecture: Layers of Responsability

Requests flow linearly from Routes to Controllers to Services.

```bash
- src/
  - server.ts
  - modules/
    - user
      - user.controller.ts
      - user.route.ts
      - user.schema.ts
      - user.service.ts
```

### `user.schema.ts`: The bouncer

Defines what the input should look like (e.g., "email must be a string").

- Input: Any data sent by the client (frontend or postman). It arrives in three main ways in the request:
  - body: e.g. a JSON object
  - params: Variables inside the URL path. e.g. in `/users/:id`, the `:id` is the input
  - query: Extra data at the end of a URL after a ? (e.g., /search?name=marvin)

Tis file defines the Zod schemas. It acts as a filter. If the input from the frontend doesn't match the schema, Zod rejects the request immediately.

### `user.route.ts`: The map

When a request arrives, this file is responsible for checking against the schema and if it's valid, it sends the request to the adequate handler.

### `user.controller.ts`: The manager

Handles the incoming request and decides what to send back.

### `user.service.ts`: The worker

Communicates with the database. It doesn't know about FastifyRequest or Reply. This makes it easy to test and reuse.

# List of commands

Inside the devContainer, inside backend folder.

### Start the backend

```bash
pnpm run dev
```

### Start prisma UI

The backend must be running.

```bash
pnpm prisma studio
```

### Reset database

```bash
pnpm prisma migrate reset
```

### API swagger documentation

The backend must be running.
Go to http://localhost:3000/documentation. There you can test the backend API endpoints.  
Another way to send requests: Use the file `test-requests.http` and click on `Send Request` above the raw request.

# Ressources Used

Node.js:

- https://nodejs.org/docs/latest-v24.x/api/index.html

Fastify:

- https://www.youtube.com/watch?v=LMoMHP44-xM - Build a RESTful API with Fastify, Prisma & TypeScript
- https://fastify.dev/docs/
- https://thatarif.in/posts/token-based-authentication-with-fastify-jwt/

Argon2:

- https://github.com/ranisalt/node-argon2

JWT & Cookie:

- https://www.jwt.io/introduction#what-is-json-web-token
- https://github.com/fastify/fastify-jwt
- https://marcwiner.com/authentiques-cookies-americains/
- https://github.com/fastify/fastify-cookie
- https://github.com/fastify/csrf-protection?tab=readme-ov-file

Prisma:

- First part of https://www.youtube.com/watch?v=7L0U-j-SZjM&t=1935s - TUTO / Cours Prisma en 40 minutes : TOUT savoir sur Prisma avec NextJS
- https://www.youtube.com/watch?v=RebA5J-rlwg&t=186s - Learn Prisma in 60 minutes
- https://www.prisma.io/docs/

zod:

- https://www.youtube.com/watch?v=L6BE-U3oy80 - Learn Zod in 30 minutes
- https://zod.dev/

Swagger:

- https://github.com/fastify/fastify-swagger
- https://github.com/fastify/fastify-swagger-ui

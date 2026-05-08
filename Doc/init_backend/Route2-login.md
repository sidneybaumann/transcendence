This file documents the implementation of the second API endpoint of the project: `api/users/login`. It is the continuation of 'Route1-register.md'.  
This guide is more straightforward.

# Index

- [1) Zod Schema LoginInputSchema](#1-zod-schema-logininputschema)
- [2) Declare route `api/users/login`](#2-declare-route-apiuserslogin)
  - [POST vs GET](#post-vs-get)
- [3) Initial Logic of Login](#3-initial-logic-of-login)
- [4) Register JWT and Cookies plugins](#4-register-jwt-and-cookies-plugins)
- [5) Update `config.ts` and `.env`](#5-update-configts-and-env)
- [6) Create `/csrf` endpoint and the CSRF token](#6-create-csrf-endpoint-and-the-csrf-token)
  - [What happens in this specific route](#what-happens-in-this-specific-route)
  - [Prevents CSRF attack](#prevents-csrf-attack)
  - [Frontend example behavior with CSRF token](#frontend-example-behavior-with-csrf-token)
- [7) Update `/login` route declaration with `onRequest: [server.csrfProtection]`](#7-update-login-route-declaration-with-onrequest-servercsrfprotection)
- [8) `loginUserHandler` controller](#8-loginuserhandler-controller)
  - [The Flow](#the-flow)
- [9) The workflow for the frontend](#9-the-workflow-for-the-frontend)
- [10) Test](#10-test)

# 1) Zod Schema LoginInputSchema

src/modules/user/user.schema.ts:

```ts
// ... RegistrationInputSchema

export const LoginInputSchema = z.object({
  email: z.email(),
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof LoginInputSchema>;
```

When a user wants to log in, we only need an email and a password (whether correct or not).

# 2) Declare route `api/users/login`

We tag this route with 'user'. We want the body to be shaped as 'LoginInputSchema'. We can already define the response we want to send. You can send whatever you want (or whatever the frontend needs).

src/modules/user/user.route.ts:

```ts
import { prisma } from "../../lib/prisma.js";
import { registerUserHandler, loginUserHandler } from "./user.controller.js";
import { RegistrationInputSchema, LoginInputSchema } from "./user.schema.js";
import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

const userRoute: FastifyPluginAsyncZod = async (server) => {
  //  server.get("/",

  //  server.post("/register",

  server.post(
    "/login",
    {
      schema: {
        tags: ["user"],
        body: LoginInputSchema,
        response: {
          200: z.object({ success: z.boolean() }),
          401: z.object({ success: z.boolean() }),
        },
      },
    },
    loginUserHandler,
  );
};

export default userRoute;
```

## POST vs GET

Credentials must be sent in the request body using POST, over HTTPS.

- **Sensitive Data in URLs**: GET requests append data to the URL as query strings (example: `GET /api/users/login?email=bob@hotmail.com&password=Password123! HTTP/1.1`). Credentials would be visible in browser history, server logs, and shoulder-surfing.

- **Request Body**: POST sends credentials within the HTTP request body, which is encrypted when using TLS/HTTPS.

- **Caching**: Browsers and intermediate proxies often cache GET requests. POST requests are typically not cached, preventing credentials from being stored on disk.

- **Semantics**: GET is intended for retrieving data without side effects. Login involves processing sensitive state and often creating a session or token, which aligns with POST.

- **Data Limits**: URLs have character limits that can truncate long or complex payloads; the POST body has much higher capacity.

# 3) Initial Logic of Login

We get an email and a password from the user. We have to check whether the email exists in our database. We create a function that returns the user by email.
src/modules/user/user.service.ts:

```ts
export async function getUserByEmail(givenEmail: string) {
  const user = await prisma.user.findUnique({
    where: {
      email: givenEmail,
    },
  }); // returns undefined if the email does not exist in the db

  return user;
}
```

In the handler, we check whether the user exists. We use `argon2.verify()` to check whether the password given by the user matches the hashed password in the database (thank you argon).
user.controller.ts:

```ts
export async function loginUserHandler(
  request: FastifyRequest<{ Body: LoginInput }>,
  reply: FastifyReply,
) {
  const user = await getUserByEmail(request.body.email);
  if (!user) return reply.code(401).send({ message: "Email not found" });

  const givenPassword = request.body.password;
  const isValid = await argon2.verify(user.password, givenPassword);
  if (!isValid) return reply.code(401).send({ message: "Password incorrect" });

  return reply.code(200).send({ message: "You are authenticated!", name: user.name });
}
```

This is not the code we will use!

1. Giving specific messages "Email not found" or "Password incorrect" is a weakness that would help a malicious person to guess a registered email. We will bundle the two errors in one message "Incorrect email or password". (That's how good websites do!)
2. The main problem: the communication remains **stateless**:

- **Statelessness**: Each HTTP request is independent. The server does not know that the person requesting `/api/users/profile` is the same person who just successfully called `/api/users/login`.
- **Frontend Burden**: The frontend would have to store the user's raw email and password and send them in the body of every request to verify identity, which is a massive security risk.
- **Server Burden**: The server would have to perform a database lookup and an expensive `argon2` password hash verification for every single API call.

# 4) Register JWT and Cookies plugins

To learn more about JWT and cookies, you can read auth-jwt-cookie-doc.md and the following:

- https://www.jwt.io/introduction#what-is-json-web-token
- https://github.com/fastify/fastify-jwt
- https://github.com/fastify/fastify-cookie
- https://github.com/fastify/csrf-protection?tab=readme-ov-file

Run:

```bash
pnpm i @fastify/jwt @fastify/cookie @fastify/csrf-protection
```

Register the plugins. src/server.ts:

```ts
server.register(fastifyCookie, {
  secret: env.COOKIE_SECRET,
});

server.register(fastifyCsrf, {
  cookieOpts: { httpOnly: true },
});

server.register(fastifyJwt, {
  secret: env.JWT_SECRET,
  cookie: {
    cookieName: "accessToken",
    signed: false,
  },
});
```

- **`secret: env.COOKIE_SECRET`**: Provides (does not sign) a key used to cryptographically sign cookies. Even if we don't sign the cookie, the CSRF plugin requires this to sign the internal CSRF secret cookie.

- **`server.register(fastifyCsrf, ...)`**: Adds Cross-Site Request Forgery protection. It checks that "state-changing" requests (POST, PUT, DELETE) include a valid token.
- **`cookieOpts: { httpOnly: true }`**: Configures the cookie that stores the CSRF secret. `httpOnly: true` prevents client-side JavaScript from accessing this specific cookie, protecting it from XSS attacks.

- **`cookieName: 'accessToken'`**: By default, the JWT plugin searches for the token in the 'Authorization: Bearer <token>' header. With the 'cookie' option, we tell it to look for the token named 'accessToken' in the 'Cookie' header.
- **`signed: false`**: Disables Fastify's cookie-level signing for the JWT. The JWT is already signed internally, so extra cookie signing is redundant here.

We'll sign the JWT (the content), but we don't need to sign the cookie (the container).

### Why we skip Cookie Signing for JWTs:

- **Redundancy:** If a hacker modifies the cookie, they are effectively modifying the JWT. The JWT's own internal signature will catch this.
- **Client Access:** Sometimes you want your frontend JavaScript to be able to "see" the JWT (to check expiration or user roles) without needing the server's secret to "unsign" the cookie first.
- **Standardization:** JWTs are a self-contained security standard. Adding a proprietary cookie signature on top makes it harder to use the token with other tools or services.

### When DO you sign a cookie?

You sign a cookie when the data inside is **not** a JWT (like a simple session ID or a "preferences" string) and has no internal protection.

# 5) Update `config.ts` and `.env`

`.env`:

```bash
NODE_ENV=development

# Database Configuration
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=your_db_name

# App Configuration
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public

# Run `openssl rand -base64 32` in your terminal to get a high-quality secret
JWT_SECRET="/j2psrY9H2jVhJYFeznFsPNunauR3c9xF2IfZmhVT+A="

# Change to "1d" in prod
JWT_EXPIRATION="1y"

COOKIE_SECRET="nkyZOn6ZBcO0XtdxsJZtttzY0bStPKoeACQ5V/8SP28="
```

`config.ts`:

```ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().min(1),
});

const env = envSchema.parse(process.env);

export { env };
```

# 6) Create `/csrf` endpoint and the CSRF token

This endpoint provides the frontend with a CSRF token required for future POST, PUT, or DELETE requests. The frontend must store that token and send it in future requests like `POST /login` in an `X-CSRF-Token` header. When receiving new requests, the server verifies the token before allowing action. The CSRF token proves that the requests came from our frontend, not from a malicious site.

```ts
server.get("/csrf", async (_request, reply) => {
  const csrfToken = reply.generateCsrf();
  return { csrfToken: csrfToken };
});
```

### What happens in this specific route:

1. **Status Code:** The client receives `200 OK`.
2. **Response Body:** The client receives `{"csrfToken": "..."}`.
3. **Cookies (Hidden Step):** Because you configured `fastifyCsrfProtection` with `cookieOpts`, Fastify also sends a `Set-Cookie` header containing a **CSRF secret**. This cookie is `httpOnly` (JavaScript cannot read it).

The browser does not store the token automatically; it only stores the CSRF secret cookie. The frontend must fetch it from `/api/users/csrf` and store it in its frontend state (e.g., a React variable or local state). For any state-changing request (POST, PUT, DELETE), you must manually include it. Fastify's CSRF plugin typically expects it in an HTTP header (usually x-csrf-token) or in the request body.

Browsers automatically send cookies (like the JWT). If a user clicks a malicious link, that link can trigger a POST request to your API using the user's stored JWT cookie. However, the malicious link cannot "guess" or access your unique CSRF token, so the server will reject the unauthorized request.

## Prevents CSRF attack

A CSRF token is a "secret handshake" that the browser **cannot** automatically attach.

- The server gives the client a unique token.
- The client must manually put this token in a custom header (like `x-csrf-token`).
- `malicious-site.com` can trigger the cookie to be sent, but it cannot "read" or "guess" the required header token because of Same-Origin Policy (SOP).
- If the server receives a `POST` request with a valid cookie but **no** matching header token, it knows the request is a forgery and rejects it.

## Frontend example behavior with CSRF token

**1. When to request?**
The frontend must request `/api/users/csrf` **before** making any state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`).

Typically, you fetch it:

- On the initial load of your App.
- Immediately before a specific action (like clicking the "Login" or "Register" button).
- If a previous request failed due to an expired CSRF token.

**2. Store forever?**

- **Session-based:** CSRF tokens are usually valid for the duration of the user's session.
- **Rotation:** For higher security, some systems rotate (change) the token after every successful `POST` request or when the user logs in or out.
- **Volatile:** You should store it in memory (a variable or state). If the user refreshes the page, the frontend simply fetches a new one. Do **not** store it in `localStorage` or `cookies`, as that defeats the security purpose.

# 7) Update `/login` route declaration with `onRequest: [server.csrfProtection]`

```ts
server.post(
  "/login",
  {
    onRequest: [server.csrfProtection],
    schema: {
      tags: ["user"],
      body: LoginInputSchema,
      response: {
        200: z.object({ id: z.string(), name: z.string(), email: z.string() }),
        401: z.object({ message: z.string() }),
        500: z.object({ message: z.string() }),
      },
    },
  },
  loginUserHandler,
);
```

`onRequest` is a Fastify lifecycle hook that runs immediately when a request is received, before schema validation or your route handler.

Adding `server.csrfProtection` to this hook means Fastify executes the CSRF validation logic first. It checks the incoming request for a valid CSRF token. If the token is missing or invalid, the request is instantly blocked and a 403 Forbidden response is automatically returned, protecting the login route from Cross-Site Request Forgery.

Adding `onRequest` disrupts Fastify's complex TypeScript overloads. It causes TypeScript to fail at linking the schema types to an externally imported handler, resulting in an unknown body type.  
To fix this, we can use `any`:

```ts
  }, loginUserHandler as any);
```

Or we can cast request.body to the Zod types inside handlers (we do it for registerUserHandler as well):

```ts
export async function registerUserHandler(request: FastifyRequest, reply: FastifyReply)
{
  const body = request.body as RegistrationInput;
  //...
```

# 8) `loginUserHandler` controller

src/modules/user/user.controller.ts:

```ts
import { FastifyReply, FastifyRequest } from "fastify";
import { LoginInput, RegistrationInput } from "./user.schema.js";
import argon2 from "argon2";
import { createUser, getUserByEmail } from "./user.service.js";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { env } from "../../config.js";

export async function registerUserHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as RegistrationInput;
  const hashedPassword = await argon2.hash(body.password);

  try {
    const newUser = await createUser(body, hashedPassword);

    return reply.code(201).send({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    }); // NEVER send {newUser}. It contains the (hashed) password.
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return reply.code(409).send("Email already exists");
      }
    }

    request.log.error(err);
    return reply.code(500).send({ message: "Internal Server Error" });
  }
}

export async function loginUserHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as LoginInput;

    const user = await getUserByEmail(body.email);

    if (!user || !(await argon2.verify(user.password, body.password)))
      return reply.code(401).send({ message: "Incorrect email or password" });
    // Giving specific messages "Email not found" or "Password incorrect" is a weakness that would help a malicious person guess a registered email

    const token = await reply.jwtSign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      {
        sign: {
          expiresIn: env.JWT_EXPIRATION,
        },
      },
    );

    return reply
      .setCookie("accessToken", token, {
        //domain: "your.domain",
        path: "/",
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: true,
      })
      .code(200)
      .send({
        id: user.id,
        name: user.name,
        email: user.email,
      });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ message: "Internal Server Error" });
  }
}
```

loginUserHandler:

1. **Extract Data**: Casts `request.body` to `LoginInput`.
2. **Lookup User**: Calls `getUserByEmail` to find the user in the database.
3. **Validate Credentials**: Uses `argon2.verify` to compare the provided password with the stored hash. If the user doesn't exist or the password is wrong, it returns a 401 error with a generic message to prevent account enumeration.
4. **Generate JWT**: Signs a JSON Web Token containing the user's ID, email, and name. The expiration is set via environment variables. (This token is completely separate from the CSRF token).
5. **Set Cookie**: Attaches a Set-Cookie header to the HTTP response. "accessToken" is the cookie name (key). The cookie options must be consistent with the options defined in server.ts when registering fastify-jwt. If the options do not match, the server will fail to recognize the cookie and authentication will fail.

- `path: "/"`: The cookie will be sent in all requests to the server, regardless of the endpoint. This is important for authentication, as you want the token to be available in all requests after login.
- `httpOnly`: Prevents client-side scripts from accessing the cookie (mitigates XSS).
- `secure`: Ensures the cookie is only sent over HTTPS in production.
- `sameSite`: Prevents the cookie from being sent on cross-site requests (mitigates CSRF).

6. **Response**: Returns a 200 status and user profile data.
7. **Error Handling**: Catches unexpected failures, logs them, and returns a 500 status.

Because the `Set-Cookie` header is used, the browser handles the storage and transmission automatically.

- **Automatic Storage**
  When the server responds with `reply.setCookie("accessToken", token, ...)`, the browser intercepts this header and stores the token in its local cookie jar. The user does not need to write frontend code to save it.
- **Automatic Attachment**
  The browser will automatically include this cookie in the `Cookie` header for every subsequent request made to the same domain and path (`/`).

### The Flow

1. **Response:** Fastify server sends:
   `Set-Cookie: accessToken=xyz123; HttpOnly; Path=/`
2. **Storage:** The browser reads this header and saves the data in its internal "Cookie Jar".
3. **Request:** Every time the browser makes a new request to your domain, it automatically adds:
   `Cookie: accessToken=xyz123`

Because the browser **automatically** scans its "Cookie Jar" and attaches that `Cookie` header to every request (even if the request was triggered by a malicious site), you need the **CSRF token** as a secondary check that the browser _won't_ attach automatically.

# 9) The workflow for the frontend

1. **The GET Request:** The frontend calls `GET /api/users/csrf`.
2. **The Storage:**

- The **Browser** automatically stores the secret cookie.
- The **Frontend Code** manually saves the `csrfToken` from the JSON body into a variable/state.

3. **The Login Request:** When calling `POST /api/users/login`, the frontend must send:

- The **Cookie** (attached automatically by the browser).
- The **Token** (attached manually by you in the headers, e.g., `x-csrf-token`).

For every state-changing request, the browser sends **two cookies** and the frontend sends **one header**.

### The Two Cookies (Automatic)

Both are sent automatically by the browser in the `Cookie` header:

- **`accessToken`**: Your JWT. It proves your identity (Authentication).
- **`_csrf`** (or similar name): The CSRF **secret**. This is the background value used to verify the token.

### The Header (Manual)

- **`x-csrf-token`**: The CSRF **token** you fetched from `/api/users/csrf`. You must manually add this to your fetch/axios request headers.

### The Verification Logic

When the request hits your server, `server.csrfProtection` performs a mathematical comparison:

$$Secret\ (from\ Cookie) + Token\ (from\ Header) \Rightarrow Valid?$$

- **If match:** The request is safe and proceeds to your handler.
- **If mismatch or missing:** Fastify returns **403 Forbidden**.

### Summary of Request Contents

| Component       | Source    | Sent via                       | Purpose                 |
| --------------- | --------- | ------------------------------ | ----------------------- |
| **JWT**         | Cookie    | `Cookie` Header (Auto)         | Identity (Who are you?) |
| **CSRF Secret** | Cookie    | `Cookie` Header (Auto)         | Verification Source     |
| **CSRF Token**  | JS Memory | `x-csrf-token` Header (Manual) | Verification Proof      |

**Why two cookies?**
The browser sends the JWT automatically, but it also sends the CSRF secret automatically. An attacker's site can force the browser to send cookies, but it **cannot** read your JS memory to find the manual `x-csrf-token`. Without that third manual piece, the server rejects the request.

# 10) Test

Do not use the REST Client extension to send the request. For a GET request to /csrf, you will receive a 200 response but you won't see the 'set-cookie' header because REST Client likely consumes/hides the header in its UI (possibly because of the httpOnly option). We will use curl. Curl/verbose clients show raw headers.

## Request the csrf token

```bash
curl -i http://localhost:3000/api/users/csrf
```

You'll get a response that looks like this:

```bash
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
set-cookie: _csrf=uln6PyQUyY0CxfhyBS5dNeYz; HttpOnly; SameSite=Lax
content-length: 68
Date: Tue, 03 Mar 2026 08:23:30 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"csrfToken":"6eWrlZ6g-xfT-kZg4Ns4n_s0-5A7ErX3bRlk3vEYVzbrCIIJWups"}
```

### `set-cookie: _csrf=...` (The Secret)

- **How it is set**: Automatically by the `@fastify/csrf-protection` plugin when you call `reply.generateCsrf()`.
- **Stored automatically?**: **Yes**. The browser detects the `set-cookie` header and stores it in its cookie jar.
- **Access**: JavaScript cannot read this because of the `HttpOnly` flag.

### `"csrfToken": "..."` (The Token)

- **How it is set**: Manually by your route handler when you `return { csrfToken }`.
- **Stored automatically?**: **No**. This is just a JSON response body.
- **Access**: Your frontend JavaScript must manually extract this value from the response and store it in memory (e.g., a variable or state).

### Verification Summary

The browser sends the **Secret** (Cookie) automatically. You send the **Token** (Header) manually. The server compares them to allow the request.

## Request to /api/users/login

To make a valid login request, replace the csrfToken and the secret with what you got from `curl -i http://localhost:3000/api/users/csrf`. Ensure the user exists in your database.
The request from the client to the server:

```bash
curl -i -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: <insert csrfToken here>" \
  -b "_csrf=<insert _csrf secret>" \
  -d '{
    "email": "bob@hotmail.com",
    "password": "Password123!"
  }'
```

You'll get this response from the server:

```bash
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
set-cookie: authJwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbWFheGxjODAwMDBieG4yNDc2MHhnNWwiLCJlbWFpbCI6ImJvYkBob3RtYWlsLmNvbSIsIm5hbWUiOiJib2IiLCJpYXQiOjE3NzI1MzY3NjUsImV4cCI6MTgwNDA5NDM2NX0.csumAN6vfcJ1uQ2z4Fpf_tym4iEf6aRHQKqDPkUVWlo; Path=/; HttpOnly; SameSite=Strict
content-length: 16
Date: Tue, 03 Mar 2026 11:19:25 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"id":"cmmaaxlc80000bxn24760xg5l","email":"bob@hotmail.com","name":"bob"}
```

`set-cookie: authJwt=...` (The JWT)

- **How it is set**: Manually by you in `loginUserHandler` using `reply.setCookie("authJwt", token, ...)`. The value is the signed JSON Web Token string.
- **Stored automatically?**: **Yes**. The browser identifies the `set-cookie` header and saves the JWT under the name `authJwt`. Once stored, the browser automatically includes the authJwt cookie in the Cookie header for every subsequent request made to your backend's domain. This happens without any manual frontend code, provided the request matches the cookie's defined path and domain.
- **Access**: JavaScript cannot read this cookie because of `HttpOnly`. This prevents XSS attacks from stealing your user's session token.
- **Policy**: `SameSite=Strict` ensures the browser only sends this cookie if the request originates from your own site, providing an extra layer of defense alongside your CSRF token.

(Test with incorrect password or email).

### Comparison of the two security cookies

| Header Component   | `_csrf` (The Secret)               | `authJwt` (The Identity)           |
| ------------------ | ---------------------------------- | ---------------------------------- |
| **Source**         | `@fastify/csrf-protection`         | Your `loginUserHandler`            |
| **Content**        | Random secret string               | Encoded JSON Web Token             |
| **Goal**           | Prevent request forgery            | Authenticate the user              |
| **JS Visibility**  | Hidden (`HttpOnly`)                | Hidden (`HttpOnly`)                |
| **Browser Action** | Sent automatically on all requests | Sent automatically on all requests |

The JWT maintains an authenticated session by automatically providing the user's ID and credentials to the server with every request, eliminating the need for the backend to query the database for identity verification. Because it is signed with a server-side secret, the backend can instantly verify the token's integrity to ensure the user data has not been tampered with.

Future requests that require authentication (for example, POST /api/users/logout) will look like this:

```bash
curl -i -X POST http://localhost:3000/api/users/logout \
  -H "x-csrf-token: 97TaJNpL-Bf1N6g3FSuYf347nSusTqzLt-2vjYOvqaRTcsn2_Rg8" \
  -b "_csrf=uEuItaUxAMXzMdugG4PXBkij; authJwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbWFheGxjODAwMDBieG4yNDc2MHhnNWwiLCJlbWFpbCI6ImJvYkBob3RtYWlsLmNvbSIsIm5hbWUiOiJib2IiLCJpYXQiOjE3NzI1MzY3NjUsImV4cCI6MTgwNDA5NDM2NX0.csumAN6vfcJ1uQ2z4Fpf_tym4iEf6aRHQKqDPkUVWlo"
```

To see how authentication is implemented, read the next doc 'Route3-logout.md'.

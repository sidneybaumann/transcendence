This file documents the implemention of the first API endpoint of the project: `api/users/register`.

# Prerequisites

- INIT/Initialization
- INIT/Init backend update

You are inside the devContainer, in the `backend` folder. Dependencies are installed, Prisma is set up, and the PostgreSQL database is running.

Next to some titles, you will see [optional doc]. It indicates the section is optional to read and can be skipped.

# Index

- [1) `prisma/schema.prisma`](#1-prisma-schema-prisma)
  - [cuid() vs uuid()](#cuid-vs-uuid-optional-doc)
  - [Workflow for when updating the database](#workflow-for-when-updating-the-database)

- [2) Starting file `src/server.ts`](#2-starting-file-srcserverts)
  - [`logger: true`](#logger-true)
  - [pino-pretty](#pino-pretty-optional-doc)
  - [Two logs "Server listening at ..."](#two-logs-server-listening-at-optional-doc)
  - [Graceful shutdown](#graceful-shutdown)
  - [`/healthcheck`](#healthcheck)
  - [Test the app](#test-the-app)

- [3) Register the First plugin: userRoutes](#3-register-the-first-plugin-userroutes)
  - [create plugin userRoute](#create-plugin-userroute)

- [4) Create the route `api/users/register`](#4-create-the-route-apiusersregister)

- [5) Option Object: Schema](#5-option-object-schema)
  - [Validation flow](#validation-flow)
  - [Test Validation for `api/users/register`](#test-validation-for-apiusersregister)

- [6) Zod](#6-zod)
  - [The Problem: Why TypeScript Isn't Enough](#the-problem-why-typescript-isnt-enough)
  - [The Critical Difference](#the-critical-difference)
  - [Summary for your Project](#summary-for-your-project)

- [7) First Zod Schema](#7-first-zod-schema)

- [8) Type provider](#8-type-provider)
  - [Global Schemas (Unique IDs) vs Type Provider](#global-schemas-unique-ids-vs-type-provider-optional-doc)
  - [Type provider: Zod](#type-provider-zod)
  - [Update `user.route.ts`](#update-user-route-ts)
  - [Update `user.controller.ts`](#update-user-controller-ts)
  - [Request flow](#request-flow)

- [9) Create function createUser](#9-create-function-createuser)

- [10) `registerUserHandler`](#10-registeruserhandler)
  - [No race condition](#no-race-condition)
  - [Catching the error of 'createUser'](#catching-the-error-of-createuser)
  - [Data Response](#data-response)
  - [Argon2](#argon2)
    - [The password](#the-password)

- [11) Tests](#11-tests)

- [12) Zod response Schemas](#12-zod-response-schemas)

- [13) config.ts](#13-configts)
  - [Import and use `env` instead of `process.env`](#import-and-use-env-instead-of-processenv)

- [14) Swagger](#14-swagger-optional-doc)
  - [Use swagger](#use-swagger)

# 1) `prisma/schema.prisma`

We'll work with this data model.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model User {
  id          String    @id @default(cuid())
  name        String    @default("NoName") // Sets 'name' to "NoName" if not provided
  email       String    @unique
  password    String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### cuid() vs uuid() [optional doc]

#### UUID (Universally Unique Identifier)

A 128-bit value usually represented as 36 characters (e.g., 550e8400-e29b-41d4-a716-446655440000). Purely random and thus not sortable.  
It is a global industry standard used everywhere, not just in web development.

#### CUID (Collision-resistant Unique Identifier)

Includes a timestamp, a counter, a "fingerprint" of the machine, and random characters.  
CUIDs are chronologically sortable. An ID created one minute ago will be "smaller" than an ID created now.  
Databases (like PostgreSQL) handle sequential data better. Inserting a CUID is faster because the database just adds it to the end of the index.  
Sorting by a Primary Key (id) is almost always faster than sorting by a regular column (createdAt) because the database is physically optimized to handle the Primary Key first.

| Feature            | Standard UUID (v4)   | CUID / UUID v7                |
| ------------------ | -------------------- | ----------------------------- |
| **Randomness**     | High (Hard to guess) | High (Hard to guess)          |
| **Sortable?**      | No                   | **Yes**                       |
| **DB Performance** | Slows down over time | Stays fast as data grows      |
| **Use Case**       | General purpose      | **High-performance backends** |

### Workflow for when updating the database

#### 1. Update the Schema

Add the new fields to your model in `prisma/schema.prisma`.  
Example: add a field `favoriteColor String?` to `User` model.

#### 2. Create and Apply a Migration

Run:

```bash
pnpm prisma migrate dev --name add_favoriteColor_to_user
```

- It compares your `schema.prisma` to your actual PostgreSQL database.
- It generates a SQL file and executes it to physically add the column to your database.
- It records the migration in a special table so your teammates can stay in sync when they pull your code.
  > Note: Migrations are like commits. Please, always give your migrations descriptive names.

#### 3. Regenerate Prisma Client

```bash
pnpm prisma generate
```

- This updates the local code in your `node_modules`. It turns your database change into **TypeScript types**.
- Your editor (VS Code) will now "know" that the new field exists, providing you with auto-completion and error checking when you use `prisma.user.create()` or `findUnique()`. (You may have to reload the VS Code window.)

# 2) Starting file `src/server.ts`:

(This file will be updated throughout the guide)

```ts
import Fastify from "fastify";
import { prisma } from "./lib/prisma.js";

const server = Fastify({ logger: true });

server.get("/healthcheck", {}, async (_request, reply) => {
  return reply.send({ message: "hello" });
});

// Graceful shutdown. 1. Define system signals terminating the process. 2. Attach an event to each signal: disconnect Prisma, close the server, and exit the process
const listeners = ["SIGINT", "SIGTERM"];
listeners.forEach((signal) => {
  process.on(signal, async () => {
    try {
      await prisma.$disconnect();
      await server.close();
      server.log.info("Server closed gracefully");
      process.exit(0);
    } catch (err) {
      server.log.error(err);
      process.exit(1);
    }
  });
});

async function main() {
  try {
    await server.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
```

## `logger: true`

`logger:true` option enables Fastify’s built-in logging system. It uses a library called **Pino** to automatically record everything happening on your server and print it to your terminal (stdout). It tracks:

- **Incoming Requests**: The HTTP method (GET, POST), the URL, and the IP address of the sender.
- **Outgoing Responses**: The status code (e.g., `200 OK` or `404 Not Found`) and how long it took the server to process the request (latency).
- **Errors**: If your code crashes or a route fails, the full error stack trace will appear in the logs.
- **Startup Info**: Confirmation that the server is running and which port it is listening on.

By default, Pino outputs logs in **JSON format** because it is faster for computers to read. It looks like this:
`{"level":30,"time":1672531200000,"msg":"Server listening at http://127.0.0.1:3000"}`

### pino-pretty [optional doc]

We can install a package called `pino-pretty` to make these logs look clean and colorful in your console. (This is not done in this project, I think pino-pretty is too much)

```bash
pnpm install -D pino-pretty
```

```ts
const server = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },
});
```

### Two logs "Server listening at ..." [optional doc]

When you run your app (`pnpm run dev`), you see two logs immediately.

```bash
{"level":30,"time":1771323415427,"pid":18008,"hostname":"ea509f2442d0","msg":"Server listening at http://127.0.0.1:3000"}
{"level":30,"time":1771323415428,"pid":18008,"hostname":"ea509f2442d0","msg":"Server listening at http://172.20.0.3:3000"}
```

Fastify is reporting every **Network Interface** it is listening on.

When you set `host: "0.0.0.0"`, you are telling the server: "Listen on every available network connection this machine has."

- **`127.0.0.1` (Loopback/Localhost):** This is the internal address. It allows the container to talk to itself.
- **`172.20.0.3` (Ethernet/Docker Network):** This is the IP assigned to your container by Docker. This address allows other containers (like your PostgreSQL database) or your host machine (your laptop) to reach the Fastify server.

### "0.0.0.0" is Required

If you only listened on `127.0.0.1`, your browser on your physical laptop wouldn't be able to see the website running inside the container. By using `0.0.0.0`, you make the server "visible" to the outside world (the Docker network).
Pino logs each successful "binding" to an interface.

- **PID (Process ID):** `18008` is the unique ID the operating system gave to your running Node.js program.
- **Hostname:** `ea509f2442d0` is the unique ID of your specific Docker container.

## Graceful shutdown

`process.on` listens for the specified signal and executes the callback function when the signal is received.
When you stop your server (e.g., pressing `Ctrl+C` or Docker stopping the container), a "hard" shutdown kills the process immediately. A **graceful shutdown** tells the server: "Stop accepting new orders, finish the orders you are currently working on, and then close."

- **Database Integrity**: It ensures **Prisma** closes the connection to **PostgreSQL** properly. If you kill the app while it's writing data, you risk corrupting your database.
- **User Experience**: If a user is mid-upload or mid-request, the server finishes that specific task before dying, instead of sending an "Empty Response" error.
- **Resource Cleanup**: It releases memory and file handles back to the Operating System correctly.

## `/healthcheck`

This line defines a basic HTTP endpoint used to verify that the server is running and responsive.

```ts
server.get("/healthcheck", {}, async (_request, reply) => {
  return reply.send({ message: "hello" });
});
```

- **server**: The instance of the Fastify framework that acts as the "engine" for your application.
- **.get**: A method that registers a route listening specifically for **GET** HTTP requests.
- **"/healthcheck"**: The URL path (endpoint) where this route is accessible (e.g., `http://localhost:3000/healthcheck`).
- **{}**: The **route options** object; in this snippet, it is empty, but it is typically used to define validation schemas (like Zod), security hooks (like `onRequest`), or documentation tags for Swagger.
- **async**: A keyword indicating that the route handler is an asynchronous function, allowing it to perform non-blocking operations like database queries or file reading using `await`. (in this case, it is useless because we are not running blocking operations.)
- **(\_request, reply)**: The handler's arguments:
- **\_request**: The incoming HTTP request object containing headers, parameters, and the body; the underscore `_` is a TypeScript convention signaling the variable is currently unused.
- **reply**: The Fastify response object used to send data, set status codes, or manage cookies back to the client.
- **=>**: The "arrow" syntax used to define the function body of the route handler.
- **return**: Ensures the function exits and passes the result back to the Fastify engine.
- **reply.send**: A method used to finalize the request and send the payload (the JSON object) to the client.
- **{ message: "hello" }**: The response body, formatted as a JavaScript object that Fastify automatically serializes into a JSON string.

### Test the app

You can test with telnet or Postman. We'll use the VS Code REST Client extension. Create a file named `test-requests.http`, write your requests, and click Send Request.

```http
GET http://localhost:3000/healthcheck HTTP/1.1
```

Fastify uses HTTP/1.1 by default. To use HTTP/2, explicitly set the `http2` option to `true` when initializing the Fastify instance.

# 3) Register the First plugin: userRoutes

In src/server.ts below the healthcheck, we register our first plugin:

```ts
server.register(userRoute, { prefix: "/api/users" });
```

A **plugin** is a block of functional code. With `.register`, we assemble this plugin into our Fastify instance.

## create plugin userRoute

We need our instance of the server to call .post, .get methods. We include it in the parameters of our plugin.  
src/module/user/user.route.ts:

```ts
import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { registerUserHandler } from "./user.controller.js";

// prefixed with "/api/users"
async function userRoute(server: FastifyInstance) {
  // For testing. To delete later. We don't want to expose all the users info.
  server.get("/", async () => {
    const users = prisma.user.findMany();
    return users;
  });
}

export default userRoute;
```

# 4) Create the route `api/users/register`

Inside userRoute, create a new route:

```ts
async function userRoute(server: FastifyInstance) {
  server.post("/register", {}, registerUserHandler);
}
```

The second argument is the route **options object**. It allows us to configure behavior specific for that route, such as: schema, preHandler/onRequest hooks, logLevel,...

In Fastify, the handler function (like `registerUserHandler`) is automatically called with two primary arguments: `request` and `reply`. (We don't include these two in parenthesis after the function call like normal functions.)

Create the function `registerUserHandler` to remove the error signaled by VS Code.
src/modules/user.controller.ts:

```ts
async function registerUserHandler(request: FastifyRequest, reply: FastifyReply) {
  console.log("registerUserHandler called. Create user (placeholder)");
}
```

# 5) Option Object: Schema

Data will come to our route '/register'. Normally, it's the input from the user's frontend. We don't accept random data — we only accept structured data that will create a user in our database (see `schema.prisma`). We use the `schema` option, a JSON object, to validate the input data. (This is not how we will do it in the final code — we will use Zod.)

```ts
server.post(
  "/register",
  {
    schema: {
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
          name: { type: "string" },
        },
      },
    },
  },
  registerUserHandler,
);
```

#### route handlers are async

In Fastify, all route handlers are treated as asynchronous. Even if you don't use the async keyword, Fastify wraps the execution in a Promise to manage the request/response lifecycle internally.

### Validation flow

By default, Fastify uses AJV (Another JSON Schema Validator) to handle validation using the standard JSON Schema format.  
With this schema, we expect a body that is an object. In the object, we require 'email' that has an email format and a 'password' that has minimum 8 characters.
If the incoming data does not match the schema (e.g., missing a required field or an invalid email format), Fastify does the following:

#### 1. Halts Request Processing

Fastify immediately stops the request lifecycle. It will not execute your `registerUserHandler` or any subsequent logic, protecting your backend from processing malformed data.

#### 2. Generates an Error Object

The validation engine (AJV by default) generates a detailed error object. This object identifies exactly which field failed (e.g., `body/email`) and why (e.g., "invalid email").

#### 3. Sends a 400 Bad Request

Fastify automatically sends a response to the client with an **HTTP 400 Bad Request** status code and a payload structured like this:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "body/email should match format \"email\""
}
```

## Test Validation for `api/users/register`

You probably have the VS Code REST Client extension. It allows you to easily send requests.
Create a file with the `.http` extension (for example, `test-requests.http`):

```http

### Get all users
GET http://localhost:3000/api/users HTTP/1.1


### Valid input
POST http://localhost:3000/api/users/register HTTP/1.1
content-type: application/json

{
    "name": "bob",
    "email": "bob@hotmail.com",
    "password": "Password123!"
}


### Invalid password
POST http://localhost:3000/api/users/register HTTP/1.1
content-type: application/json

{
    "name": "bob",
    "email": "bob@hotmail.com",
    "password": "Pass"
}
```

For a valid request, `registerUserHandler` will be called, a message will be logged in the terminal, and you will receive a 200 response. (This will not create a user because the logic is not implemented yet.)
For a request with an invalid password, `registerUserHandler` will NOT be called and you will receive a 400 response with the default payload. (You can customize the error message; it is not covered in this guide.)

# 6) Zod

Do not use pure JSON Schema for validation. Use Zod. (You can delete the JSON Schema in the options object.)
To install Zod: `pnpm i zod` (inside the backend)

### The Problem: Why TypeScript Isn't Enough

In your `user.schema.ts`, you'll have a `RegistrationInputSchema`. If you don't use Zod, you would have to manually write code to protect your server from bad data.

#### 1. The "Manual" Way (Without Zod)

Without Zod, you have to write the same logic twice: once for TypeScript (to help you code) and once for the running server (to check the real data).

```typescript
// 1. Blueprint for the editor (TypeScript only)
type RegistrationInput = {
  email: string;
  password: string;
  name?: string;
};

// 2. Manual "Bodyguard" for the running server
function isValidRegistration(data: any): data is RegistrationInput {
  return (
    typeof data.email === "string" &&
    data.email.includes("@") &&
    typeof data.password === "string" &&
    data.password.length >= 8
  );
}

// 3. Usage in your controller
export async function registerUserHandler(request: FastifyRequest, reply: FastifyReply) {
  if (!isValidRegistration(request.body)) {
    return reply.code(400).send({ message: "Invalid data" });
  }
  // Only now is it safe to use request.body
}
```

**Downsides:** You have to manually update the function every time you change the type. If you forget to check for a special character in the password, your database gets "dirty" data.

#### 2. The "Zod" Way

You define the rules once in `user.schema.ts`. Zod then creates the TypeScript type for you automatically.

```typescript
// 1. Define the rules (Runtime Validation)
export const RegistrationInputSchema = z.object({
  email: z.email(),
  password: z.string().min(8).regex(/[A-Z]/, "Must contain one uppercase letter"),
  name: z.string().optional(),
});

// 2. Extract the type (Compile-time Safety)
export type RegistrationInput = z.infer<typeof RegistrationInputSchema>;
```

### The Critical Difference

**1. TypeScript is "compile-time" only**
In your `user.controller.ts`, the type `RegistrationInput` helps you avoid typos like `request.body.emall`. However, once your code is compiled to JavaScript and running on your 42 project server, **the types disappear**. TypeScript cannot stop a user from sending a number where an email string should be.

**2. Zod is "Runtime" validation**
Zod is the active "Bodyguard." When a request hits `/register`, Fastify uses your Zod schema to inspect the data **while the server is running**.

- If the user sends a password without an uppercase letter, Zod catches it and Fastify sends a `400 Bad Request` before your `registerUserHandler` even starts.
- This ensures that when you call `createUser` in your service, the data is already 100% valid.

### Summary for your Project

| Feature                     | TypeScript (`type`)                 | Zod (`z.object`)                              |
| --------------------------- | ----------------------------------- | --------------------------------------------- |
| **Protects the Developer?** | Yes (autocompletion)                | Yes (via `z.infer`)                           |
| **Protects the Database?**  | **No**                              | **Yes** (blocks bad requests)                 |
| **Used for...**             | Writing logic in `user.service.ts`. | Validating `request.body` in `user.route.ts`. |

# 7) First Zod Schema

src/modules/user/user.schema.ts:

```ts
// Namespace Import: '*' tells TS to grab everything exported from zod library. 'as z' takes all the exports and budles them into the object named 'z'
import * as z from "zod";

const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/, "Must contain one uppercase letter") // The message is added to 'ZodError' object, thrown when the data doesn't match the schema
  .regex(/\d/, "Must contain one number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Must contain one special character");

export const RegistrationInputSchema = z.object({
  email: z.email(),
  password: passwordSchema,
  name: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[^<>]*$/, "Name cannot contain < or > characters") // Blocks script tags (XSS attacks)
    .optional(),
});

export type RegistrationInput = z.infer<typeof RegistrationInputSchema>;
```

The last line bridges the gap between **Zod's runtime validation** and **TypeScript's compile-time safety**.

- **export**: A JavaScript keyword that makes this type available to be imported and used in other files, such as `user.controller.ts`.
- **type**: A TypeScript keyword used to define a custom alias for a data structure, allowing the editor to provide autocompletion and error checking.
- **RegistrationInput**: The unique name (identifier) assigned to this specific type so you can reference it throughout your backend.
- **=**: The assignment operator that tells TypeScript: "The name on the left represents the logic on the right."
- **z**: The object representing the **Zod** library, which contains all the validation tools you imported at the top of the file.
- **.infer**: A special utility function provided by Zod that "reads" a schema and automatically generates the corresponding TypeScript interface.
- **< ... >**: Angle brackets used in TypeScript to pass a "parameter" to a generic utility (in this case, telling `infer` which schema to look at).
- **typeof**: A TypeScript operator that looks at a JavaScript variable (the schema) and extracts its underlying structure so Zod can translate it into a type.
- **RegistrationInputSchema**: The actual Zod object you defined (containing `email`, `password`, etc.) that serves as the source of truth for this type.

# 8) Type provider

Update the route `/register` and `server.ts` file

```ts
async function userRoute(server: FastifyInstance) {
  server.get("/", async () => {
    const users = prisma.user.findMany();
    return users;
  });

  server.post(
    "/register",
    {
      schema: {
        body: RegistrationInputSchema,
      },
    },
    registerUserHandler,
  );
}
```

PROBLEM. Fastify and Zod do not speak the same language by default. Fastify natively expects JSON Schema (via AJV), while the schema is a Zod object. A Zod object is **not** JSON.

There are two primary ways to create that bridge between Fastify and Zod. You can either register schemas globally with unique IDs (like this https://www.youtube.com/watch?v=LMoMHP44-xM) or use a Type Provider for a more modern, integrated experience.

## Global Schemas (Unique IDs) vs Type Provider [optional doc]

### 1. Global Schemas (Unique IDs)

- **How it works:** You add a JSON schema to the Fastify instance using `server.addSchema({ $id: 'UserSchema', ... })`. In your routes, you reference it by its string ID (`$ref: 'UserSchema#'`).
- **TypeScript Integration:** Poor. Fastify does not automatically know the type of `request.body`. You must manually write TypeScript `interface`s and pass them as generics to the route.
- **Redundancy:** High. You write the validation logic (Schema) and the Type logic (TypeScript) separately.
- **Performance:** Faster. Fastify natively uses ajv to compile JSON schemas into highly optimized, raw JavaScript functions when the server starts. Validation during requests is incredibly fast.

### 2. Type Provider (`fastify-type-provider-zod`)

- **How it works:** You inject a "Type Provider" into the Fastify instance. This allows you to pass Zod objects directly into the route's schema block.
- **TypeScript Integration:** Perfect. Fastify extracts the inferred TypeScript type directly from the Zod object. `request.body` is instantly and perfectly typed.
- **Redundancy:** Zero. Zod acts as both the runtime validator and the compile-time TypeScript type.
- **Performance:** Slower. Zod performs runtime parsing. It does not compile schemas into optimized functions like ajv.

While Zod is benchmarked as slower than ajv, the actual difference is usually a fraction of a millisecond per request. For 99% of projects (including yours), the massive improvement in TypeScript integration outweighs the minor performance hit.

We'll use the type provider.

## Type provider: Zod

https://github.com/turkerdev/fastify-type-provider-zod

Install: `pnpm i fastify-type-provider-zod`. This is not a devDependency — the server needs this package at runtime to translate Zod schemas into JSON schemas that Fastify can understand.

src/server.ts:

```ts
const server = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);
```

'withTypeProvider<ZodTypeProvider>()' makes `server` a specialized Fastify instance that understands Zod.
The `validatorCompiler` and `serializerCompiler` imported from this package run each time a request hits your API to validate and serialize data.

## Update `user.route.ts`

Currently, our `userRoute` function takes a `FastifyInstance` as an argument. However, our server is no longer a plain Fastify instance (so the code is incorrect; you can test that it fails).
You can see the type of our `server` when hovering over it in `server.ts`. We will not use that type directly; instead, we will use a helper type and let TypeScript infer the server instance type.

src/modules/user/user.route.ts:

```ts
const userRoute: FastifyPluginAsyncZod = async (server) => {
  server.get("/", async () => {
    const users = await prisma.user.findMany();
    return users;
  });

  server.post(
    "/register",
    {
      schema: {
        body: RegistrationInputSchema,
      },
    },
    registerUserHandler,
  );
};
```

`FastifyPluginAsyncZod` is a TypeScript type that defines the shape of an asynchronous Fastify plugin function configured to work with Zod. It doesn’t create or modify the server itself; instead, it tells TypeScript that the plugin function will receive a Fastify instance enhanced with Zod support, allowing route schemas to automatically type things like request.body. In short, it’s a type definition that ensures your plugin function is correctly structured and benefits from proper Zod-based type inference.  
Because we declared the variable `userRoute` as a `FastifyPluginAsyncZod`, TypeScript looks at the blueprint of that type, sees the first parameter is supposed to be a Fastify instance, and automatically applies that exact type to `server`.

#### Function expression [optional doc]

Instead of writing an arrow function, you can write a function expression:

```ts
const userRoutes: FastifyPluginAsyncZod = async function (server) {
  // Logic here
};
```

The difference:

- Arrow Function (=>): Lexically binds `this`. In Fastify plugins, you rarely use this, so this is the modern standard for concise code.
- Function Expression (function): Has its own this context. If you use a standard function, you could technically access the Fastify instance via `this` instead of the server argument, though it is not recommended for clarity.

### Update `user.controller.ts`

```ts
export async function registerUserHandler(
  request: FastifyRequest<{ Body: RegistrationInput }>,
  reply: FastifyReply,
) {
  console.log(request.body.email); // email would not be accessible if the type RegistrationInput is missing from the FastifyRequest
}
```

With `request: FastifyRequest<{ Body: RegistrationInput }>`, TypeScript knows that `request.body` is of type `RegistrationInput`, so we can directly access its properties.

## Request flow:

1. **Request Arrives**: A user sends data to `/register`.
2. **Handoff**: Fastify sees you have a schema defined for this route.
3. **The Bridge**: Instead of checking the data itself, Fastify passes the incoming data and your Zod schema to the **Validator Compiler**.
4. **Validation**: The compiler runs `schema.safeParse(data)` using Zod.
5. **Result**:

- If **Valid**: Zod returns the cleaned data, and Fastify moves to your controller (`registerUserHandler`).
- If **Invalid**: Zod returns an error list. The bridge formats this into a response (like a `400 Bad Request`) and sends it back to the user automatically.

Test your requests.

# 9) Create function createUser

We create a function 'createUser' in 'user.service.ts' so that the concerns remain separated. The parameters we need: email, name and a hashed password.  
src/modules/user/user.service.ts:

```ts
import { prisma } from "../../lib/prisma.js";
import { RegistrationInput } from "./user.schema.js";

export async function createUser(body: RegistrationInput, hashedPassword: string) {
  const newUser = await prisma.user.create({
    data: {
      email: body.email,
      password: hashedPassword,
      name: body.name,
    },
  }); // can throw error if db is down

  return newUser;
}
```

# 10) `registerUserHandler`

Now that we have set a "guard" with Zod, we can safely handle the data as intended.
src/module/user/user.controller.ts:

```ts
import { FastifyReply, FastifyRequest } from "fastify";
import { RegistrationInput } from "./user.schema.js";
import argon2 from "argon2";
import { createUser } from "./user.service.js";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";

export async function registerUserHandler(
  request: FastifyRequest<{ Body: RegistrationInput }>,
  reply: FastifyReply,
) {
  const hashedPassword = await argon2.hash(request.body.password);

  try {
    const newUser = await createUser(request.body, hashedPassword);

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
```

## No race condition

Before creating a new user, we would be tempted to do a request to the database to find if the new email already exists:

```ts
async function registerUserHandler(
  request: FastifyRequest<{ Body: RegistrationInput }>,
  reply: FastifyReply,
) {
  const existingUser = await prisma.user.findUnique({
    where: { email: request.body.email },
  });

  if (existingUser != null) return reply.code(409).send({ message: "Email already exists" });

  const hashedPassword = await argon2.hash(request.body.password);

  // ... try to create a user
}
```

This logic is functional, but it contains a **race condition**. Here, we first check for an existing user and then create one. Between these two steps, another request could insert the same email, causing the second step to fail. -> BAD. So do not use the code just above.  
**Atomic Operations:** Instead of checking if a user exists and then creating one, we wrap the creation in a `try/catch` and let if fail as the database is the **boss/source of truth**.

## Catching the error of 'createUser'

`createUser` throws an error if the database is down or if an email already exists. These two errors are not the same, we have to differentiate them.

When a database operation violates a known constraint (e.g., unique constraint, foreign key, etc.), the Prisma Client catches the database error and wraps it into a PrismaClientKnownRequestError instance, attaching: code (e.g., "P2002" for unique constraint), meta (additional context like the field involved), other diagnostic properties.  
https://www.prisma.io/docs/orm/reference/error-reference

In the code:

- `if (err instanceof PrismaClientKnownRequestError)` checks if the caught error is a specific type defined by the Prisma library.
- `PrismaClientKnownRequestError` identifies errors triggered by the database engine (like constraint violations) rather than network issues or code bugs.
- `"P2002"` specifically signifies a **Unique constraint failed**. In our prisma.schema, the `email` field is marked `@unique`, so this triggers if a user tries to register with an existing email.
  We send a 409 Conflict response.

## Data Response

When the request has been handled, we send the response with user's info: id, name, email. It is not strictly required to do so. However, in professional development, providing specific data is considered a **best practice** for several reasons:

### 1. Frontend Synchronization

The frontend team often needs the `id` of the newly created resource immediately.

- **Redirecting:** If the app needs to move the user to a profile page (e.g., `/profile/clv123...`), it needs that `id`.
- **State Management:** Modern frontend frameworks (like React) usually store the "current user" in memory. Receiving the `id` and `email` allows the frontend to update its state without making a second request to the database.

### 2. Confirmation of Data

By returning the `email` and `name`, you confirm exactly what was saved in the database. This acts as a "receipt" for the client.

### 3. REST API Standards

A `201 Created` status code usually implies that a new resource now exists. It is standard practice to return the representation of that new resource (minus sensitive fields like the `password`).

## Argon2

https://github.com/ranisalt/node-argon2  
To install: `pnpm i argon2`  
The method `.hash` is an async function that takes a string and uses an algorithm to generate a secure, irreversible string called a "hash". This hash includes a salt and specific cryptographic parameters, ensuring that even if your database is leaked, the original passwords remain protected from cracking attempts.  
When `argon2.verify(hash, plainPassword)` is called (for another route, `/api/users/login`), it extracts the salt and configuration parameters directly from the stored hash string, re-hashes the `plainPassword` using the same salt and parameters, and compares the newly generated hash with the stored hash in constant time to prevent timing attacks.

### The password

When a user submits the registration form, the password travels from their browser to our server.

- **In Transit:** If we use HTTPS (standard for web security), the password is encrypted while moving across the internet, so hackers can't see it.
- **At the Destination (the Server):** Once it hits our Fastify route, the server decrypts it so the code can process it. At this moment, the password is in "plain text" inside `request.body.password`.
  As a backend developer, I can "peek" at the password because the data arrives at the server exactly as the user typed it. ~~If the user uses the same password for all his accounts, I could hack him.~~ However, with great power comes great responsibility.

#### NEVER log the password

- **Logging security:** In a real server, logs are often persisted to files or external services. If you log a password, it will be stored in plain text, which is a serious security risk.
- **Privacy:** Respect user privacy. Only use the password to hash it and store the resulting hash.

When debugging, log the **entire request body except the password**.

```ts
const { password, ...safeData } = request.body;
server.log.info(safeData, "New registration attempt");
```

# 11) Tests

1. Send a GET request to `api/users/` if you created the route for `"/"` in `userRoute`. You should receive a 200 response and the body should be an empty array, meaning your database is empty.

2. Send a POST request to `api/users/register` with a valid object. You should receive a 201 response with the user's information (except the password).

3. Send the same POST request. You should receive 409 Conflict.

4. Send a POST request with a different email. Then a GET request to `api/users/`, you'll see all the users you have created... with their hashed password! Because we are sending the whole object in our code:

```ts
server.get("/", async () => {
  const users = await prisma.user.findMany();
  return users;
});
```

There are several ways to prevent leaking passwords (apart the fact we can just delete the route).

1. Zod Response schemas (The "Fastify Way") explained in point 12. That's what we will use.

### 2. "onSend" Hook (The Global Guard) [optional doc]

You can register a global hook that intercepts every response payload. This acts as a "guard" to catch sensitive keys before they leave the server.

```ts
server.addHook("onSend", async (request, reply, payload) => {
  if (typeof payload === "string") {
    const parsed = JSON.parse(payload);

    // Recursive function to remove 'password' from objects or arrays
    const clean = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(clean);
      if (obj !== null && typeof obj === "object") {
        const { password, ...rest } = obj;
        return Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, clean(v)]));
      }
      return obj;
    };

    return JSON.stringify(clean(parsed));
  }
  return payload;
});
```

`.addHook()` lets you register a function that runs at a specific point in the request/response lifecycle. It is used to perform actions like authentication, logging, or data transformation globally or at the route level.  
https://fastify.dev/docs/latest/Reference/Lifecycle/

### 3. Prisma Middleware / Client Extensions [optional doc]

You can configure Prisma at the database level to exclude the password field globally so the application logic never even sees it.

- **Prisma Exclude:** In your `prisma.js` file, you can extend the client to exclude fields by default.
- **Manual Select:** Always use the `select` block in your service calls.

```ts
// In user.service.ts
export async function getAllUsers() {
  return await prisma.user.findMany({
    select: { id: true, email: true, name: true }, // password is not selected
  });
}
```

### 4. Transform Logic in Controller [optional doc]

Manually mapping the database object to a "Data Transfer Object" (DTO) ensures you only send what is intended.

```ts
// user.controller.ts
const userDto = {
  id: user.id,
  email: user.email,
  name: user.name,
};
return reply.send(userDto);
```

# 12) Zod response Schemas

src/modules/user/user.route.ts:

```ts
server.get(
  "/",
  {
    schema: {
      response: {
        200: z.array(
          z.object({
            id: z.string(),
            email: z.email(),
            name: z.string(),
          }),
        ),
      },
    },
  },
  async () => {
    const users = await prisma.user.findMany();
    return users;
  },
);
```

We use Zod to define a response schema for a specified response code (200 here). Fastify will automatically strip any properties not explicitly defined in the schema before sending the reply.  
`z.array` is used because `prisma.user.findMany()` returns a list of records. Your schema must mirror the structure of the data you return; since `findMany` results in an array of user objects, the Zod schema must be wrapped in `z.array()` to validate and transform each item in that list correctly.

You can test a GET request to `api/users` to view the users data defined in the schema. Sending all user information is still a **data breach** and a severe **security failure**, so we'll delete this route. Alternatively, wrap it with `if (process.env.NODE_ENV === "development")` to restrict it to development only.

We can also visualize the data with prisma studio. Inside backend folder and when the app is running, run `pnpm prisma studio`. We can also delete data easily.

## Response Schemas for `/register`

```ts
server.post(
  "/register",
  {
    schema: {
      // If the incoming data fails the validation, Fastify automatically sends a 400 Bad Request response with details about the validation errors.
      body: RegistrationInputSchema,
      response: {
        201: z.object({
          // This is the shape of the response body when the request is successful (status code 200). If registerUserHandler accidentally returns the whole object (including the password hash), Fastify will remove everything that is not defined in the following schema. Acts also as documentation for swagger
          id: z.string(),
          name: z.string(),
          email: z.email(),
        }),
        409: z.object({
          // Documents the "Email already exists" error
          message: z.string(),
        }),
      },
    },
  },
  registerUserHandler,
);
```

# 13) config.ts

You have a .env file:

```bash
NODE_ENV=development

# Database Configuration
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=your_db_name

# App Configuration
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public
```

We want to prevent the app from running if a required environment variable is missing, so the app should fail fast. Zod is used to validate these inputs. We can also use Zod to validate our own developer-provided inputs (the environment variables).

## Create the file src/config.ts

```ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]),
  DATABASE_URL: z.url(),
});

const env = envSchema.parse(process.env);

export { env };
```

- **`export { env }`**: Makes the validated, type-safe `env` object available to other files in your project.

- **`parse(process.env)`**: Validates the system's environment variables against the schema. If validation fails (missing or invalid variables), `.parse()` throws an error that we don't catch. It creates an "unhandled exception". Node.js automatically terminates any process that encounters an unhandled exception. (We can execute 'parse' inside a try/catch and exit the process in the catch to print a clean error on the terminal). To make this crash happen, this file must be imported into the main entry point (server.ts).

Your `config.ts` should only validate the variables your Node.js application actually uses in its code. Since Prisma only needs the `DATABASE_URL` to connect, your Fastify app does not need to know about `POSTGRES_USER` or `POSTGRES_PASSWORD`.

When adding new variables to your .env, do not forget to update your docker-compose and to rebuild your container to load your new environment variables.

### Import and use `env` instead of `process.env`

Using `process.env` returns unvalidated strings or `undefined`.  
Using the imported `env` provides:

- **Type Safety:** TypeScript knows the exact variables available and their specific types.
- **Validation Guarantee:** You are certain the values exist and are correct because Zod already checked them.

Now, you should modify `prisma.config.ts`

# 14) Swagger [optional doc]

In Fastify, **Swagger** is used to automatically generate documentation for your API based on the schemas you have already defined. Since you are using **Zod** for validation, you can use the `@fastify/swagger` and `@fastify/swagger-ui` plugins to turn those schemas into a visual website where you can test your routes.

### 1. How it works

Swagger reads the `schema` object you provide to your routes (like `RegistrationInputSchema` and `LoginInputSchema`) and creates a JSON file (the "OpenAPI specification"). The Swagger UI then turns that JSON into a clickable interface.

### 2. Integration with your current setup

Because you are using `fastify-type-provider-zod`, you need a specific helper to translate Zod schemas into the format Swagger understands.

- **Registration**: You register `@fastify/swagger` first to handle the data logic.
- **UI**: You register `@fastify/swagger-ui` second to create the `/docs` (or similar) route where you can view the interface.
- **Transform**: You use a "jsonSchemaTransform" so Swagger knows how to read your Zod objects.

### 3. Why this is helpful for your project

- **Testing**: You can test your `/api/users/register` and `/api/users/login` routes directly in the browser without using external tools like Postman.
- **Frontend Team**: Your teammates working on the frontend can see exactly what data they need to send (e.g., that `email` is required and `password` must be 8+ characters) without reading your backend code.
- **Automatic Sync**: Every time you update your `user.schema.ts`, the Swagger documentation updates automatically.

## Use swagger

- https://github.com/fastify/fastify-swagger
- https://github.com/fastify/fastify-swagger-ui

Run `pnpm i @fastify/swagger` and `pnpm i @fastify/swagger-ui`

In 'src/server.ts':

```ts
if (env.NODE_ENV === "development") {
  await server.register(fastifySwagger, {
    openapi: {
      info: {
        title: "Transcendence super exhaustive APIs",
        version: "1.0.0",
      },
      servers: [
        {
          url: "http://localhost:3000",
        },
      ],
      tags: [
        { name: "user", description: "User related end-points" },
        // Add new tags here
      ],
    },
    transform: jsonSchemaTransform,
  });

  await server.register(fastifySwaggerUi, {
    routePrefix: "/documentation",
  });
}
```

- Plugin registrations must be done before route declarations. Plugins (like `fastify-jwt` or a database connector) modify the server instance. You must register them before declaring routes that depend on those modifications. If a route is declared first, it will not have access to the plugin's tools.
- Using await forces the server to pause and ensure fastifySwagger is fully loaded and configured.

### Tag your routes

Just add the property `tags` to the schema.

```ts
server.post(
  "/register",
  {
    schema: {
      tags: ["user"], // <---
      body: RegistrationInputSchema,
      response: {
        201: z.object({
          id: z.string(),
          name: z.string(),
          email: z.email(),
        }),
        409: z.object({
          message: z.string(),
        }),
      },
    },
  },
  registerUserHandler,
);
```

'/register' endpoint will now be under the 'user' section in Swagger UI. Routes that are not tagged will appear under the 'default' section.

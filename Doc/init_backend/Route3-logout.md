This file documents the implementation of the third API endpoint in the project, `api/users/logout`. It is a continuation of "Route2-login.md".

# Index

- [1) Declare the endpoint /logout](#1-declare-the-endpoint-logout)
- [2) Protect the route with authentication](#2-protect-the-route-with-authentication)
- [3) Module augmentation](#3-module-augmentation)
- [4) Create logoutUserHandler](#4-create-logoutuserhandler)

# 1) Declare the endpoint /logout

backend/src/modules/user/user.route.ts:

```ts
// In userRoute function

server.post(
  "/logout",
  {
    onRequest: [server.csrfProtection, authenticate],
    schema: {
      tags: ["user"],
      response: {
        200: z.object({ message: z.string() }),
        401: z.object({ message: z.string() }),
      },
    },
  },
  logoutUserHandler,
);
```

The `authenticate` function verifies that the request contains a valid JWT (provided by our server at `api/users/login`).

# 2) Protect the route with authentication

backend/src/modules/user/authenticate.ts: (The location of this file can/should be somewhere else, e.g., "src/middleware/auth.ts")

```ts
import { FastifyReply, FastifyRequest } from "fastify";

export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    request.log.error(err);
    return reply.code(401).send({ message: "Unauthorized" });
  }
};
```

`request.jwtVerify()` is a method added to the Fastify `request` object by the `@fastify/jwt` plugin. It automates the extraction, decoding, and validation of JSON Web Tokens.

- **Extraction**: It looks for the JWT based on your configuration in `server.ts`. Since you set `cookieName: "authJwt"`, it searches the incoming cookies for that specific key.
- **Decoding**: It parses the token string to separate the header, payload, and signature.
- **Verification**: It uses the `JWT_SECRET` from your environment variables to verify the signature. If the signature is invalid or the token has expired, it throws an error.
- **Payload Injection**: Upon successful verification, it attaches the decoded payload to `request.user`.

# 3) Module augmentation

When we call `request.jwtVerify()`, the @fastify/jwt plugin decodes the token and attaches the data to `request.user`. Without defining the payload type, TypeScript will throw an error like: Property "user" does not exist on type "FastifyRequest".

We use Module Augmentation to tell TypeScript to merge our custom interfaces (payload and user) with the existing FastifyJWT interface from the library.  
backend/types/fastify-jwt.d.ts:

```ts
import "@fastify/jwt";

// Merges automatically with the existing @fastify/jwt type definitions.
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { id: string; email: string; name: string };
    user: { id: string; email: string; name: string };
  }
}
```

- **payload**: Defines the structure used when we sign a token with `reply.jwtSign()`. If we use a different payload when we sign the token, VS Code will complain.
- **user**: Defines the structure of `request.user` after `request.jwtVerify()` is called.

# 4) Create logoutUserHandler

To log out a user, we clear the "authJwt" cookie. Since the JWT is stored client-side in an httpOnly cookie, the server must instruct the browser to delete it.  
user.controller.ts:

```ts
export async function logoutUserHandler(request: FastifyRequest, reply: FastifyReply) {
  request.log.info(`User ${request.user.email} is logging out`);
  return reply
    .clearCookie("authJwt", {
      path: "/",
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
    })
    .code(200)
    .send({ message: "Logout successful" });
}
```

- **request.log**: `request.user` is available because this handler is protected by the `authenticate` hook that verifies the JWT and populates `request.user` with the payload of the token.
- **clearCookie**: Sets the cookie value to empty and expires it immediately.
- **Options Consistency**: The `path`, `secure`, and `sameSite` options must match the login configuration for the browser to identify the correct cookie to kill.
- **Statelessness**: Since JWTs are stateless, the server doesn't "forget" the token; the browser simply loses its copy.

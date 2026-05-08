import "@fastify/jwt";

// Merges automatically with the existing @fastify/jwt type definitions.
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { id: string; email: string; name: string; sessionId: string };
    user: { id: string; email: string; name: string; sessionId: string };
  }
}

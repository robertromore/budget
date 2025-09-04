// tRPC barrel export for clean imports across the application
export { t, publicProcedure, rateLimitedProcedure, bulkOperationProcedure } from "./t";
export { createContext, type Context } from "./context";
export { client } from "./client";
export { router } from "./router";
export { createTRPCServer } from "./trpc-server";
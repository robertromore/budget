// tRPC barrel export — re-exports from core + app-specific client
export { trpc as client } from "./client";
export { createContext, type Context, type RequestAdapter, type CookieOptions, type AuthenticatedContext } from "$core/trpc/context";
export { router, type Router, type RouterInputs, type RouterOutputs, createCaller } from "$core/trpc/router";
export {
  bulkOperationProcedure,
  openProcedure,
  protectedProcedure,
  publicProcedure,
  rateLimitedProcedure,
  secureOperationProcedure,
  secureProtectedProcedure,
  t,
} from "$core/trpc/t";

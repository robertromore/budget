import { os } from "@orpc/server";
import type { Context } from "./context";

// Create base oRPC instance with context type
export const orpc = os.$context<Context>();

// Create public procedure with context
export const publicProcedure = orpc;
import type { Context } from "$lib/trpc/context";
import { initTRPC } from "@trpc/server";
import { mutationRateLimit } from "./middleware/rate-limit";

export const t = initTRPC.context<Context>().create();
export const publicProcedure = t.procedure;
export const rateLimitedProcedure = t.procedure.use(mutationRateLimit);

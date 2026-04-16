import { createContext } from "$core/trpc/context";
import { fromSvelteKit } from "$lib/trpc/adapters/sveltekit";
import { router } from "$core/trpc/router";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { RequestHandler } from "./$types";

const handler: RequestHandler = (event) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: event.request,
    router,
    createContext: () => createContext(fromSvelteKit(event)),
    onError: ({ type, path, error }) => {
      console.error(`Encountered error while trying to process ${type} @ ${path}:`, error);
    },
  });
};

export const GET = handler;
export const POST = handler;

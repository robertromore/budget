import { createContext } from "$lib/trpc/context";
import { router } from "$lib/trpc/router";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { RequestHandler } from "./$types";

const handler: RequestHandler = (event) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: event.request,
    router,
    createContext: () => createContext(event),
    onError: ({ type, path, error }) => {
      console.error(`Encountered error while trying to process ${type} @ ${path}:`, error);
    },
  });
};

export const GET = handler;
export const POST = handler;

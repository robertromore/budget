import { RPCHandler } from "@orpc/server/fetch";
import type { RequestHandler } from "@sveltejs/kit";
import { router } from "$lib/server/rpc/router";
import { createContext } from "$lib/server/rpc/context";

const handler = new RPCHandler(router);

const handle: RequestHandler = async ({ request }) => {
  const context = await createContext();
  const response = await handler.handle(request, {
    prefix: "/api/rpc",
    context,
  });

  if (!response || !response.matched) {
    return new Response("Not Found", { status: 404 });
  }
  
  return response.response;
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
import { db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';
import type { inferAsyncReturnType } from '@trpc/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createContext(event: RequestEvent) {
  return {
    db
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;

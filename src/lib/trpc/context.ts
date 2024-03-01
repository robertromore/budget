import { db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createContext(event: RequestEvent) {
  return {
    db
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

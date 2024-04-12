import { db } from '$lib/server/db';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createContext() {
  return {
    db
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

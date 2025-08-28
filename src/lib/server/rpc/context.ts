import { db } from "$lib/server/db";

export async function createContext() {
  return {
    db,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
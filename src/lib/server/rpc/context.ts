import { db } from "$lib/server/db";

export interface Context {
  db: typeof db;
}

export async function createContext(): Promise<Context> {
  return {
    db,
  };
}
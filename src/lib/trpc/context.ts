import { db } from "$lib/server/db";
// import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createContext() {
  return {
    db,
  };
}

// export const createContext = (locals: App.Locals) => (opts: FetchCreateContextFnOptions) => {
//   return { ...locals, db };
// };

export type Context = Awaited<ReturnType<typeof createContext>> & {
  isTest?: boolean | undefined;
};

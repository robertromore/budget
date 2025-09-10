import { a as createContext, r as router } from "./router.js";
import { createTRPCHandle } from "trpc-sveltekit";
const handle = createTRPCHandle({
  router,
  createContext,
  onError: ({ type, path, error }) => console.error(`Encountered error while trying to process ${type} @ ${path}:`, error)
});
export {
  handle
};

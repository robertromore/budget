import { loadWorkspaceLlmPreferences } from "$core/server/shared/workspace-llm-preferences";
import { createContext } from "$core/trpc/context";
import { createCaller } from "$core/trpc/router";
import { fromSvelteKit } from "$lib/trpc/adapters/sveltekit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const ctx = await createContext(fromSvelteKit(event));
  const caller = createCaller(ctx);
  const accounts = await caller.accountRoutes.all();

  // `isLLMEnabled` drives the default mode tab (AI when on, Paste
  // when off). The page itself is always usable — the paste path
  // works regardless — so no longer gates on feature-mode flags.
  const llmPreferences = ctx.workspaceId
    ? await loadWorkspaceLlmPreferences(ctx.workspaceId)
    : null;
  const isLLMEnabled = !!llmPreferences?.enabled;

  return { accounts, isLLMEnabled };
};

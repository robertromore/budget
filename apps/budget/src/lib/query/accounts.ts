import {defineQuery, createQueryKeys} from "./_factory";
import {queryPresets} from "./_client";
import {trpc} from "$lib/trpc/client";
import type {Account} from "$lib/schema/accounts";

export const accountKeys = createQueryKeys("accounts", {
  lists: () => ["accounts", "list"] as const,
  list: () => ["accounts", "list"] as const,
  details: () => ["accounts", "detail"] as const,
  detail: (id: number) => ["accounts", "detail", id] as const,
  detailBySlug: (slug: string) => ["accounts", "detail", "slug", slug] as const,
});

export const listAccounts = () =>
  defineQuery<Account[]>({
    queryKey: accountKeys.list(),
    queryFn: async () => {
      const result = await trpc().accountRoutes.all.query();
      return result as Account[];
    },
    options: {
      ...queryPresets.static,
    },
  });

export const getAccountDetail = (idOrSlug: number | string) =>
  defineQuery<Account>({
    queryKey: typeof idOrSlug === "number" ? accountKeys.detail(idOrSlug) : accountKeys.detailBySlug(idOrSlug),
    queryFn: async () => {
      const result = typeof idOrSlug === "number"
        ? await trpc().accountRoutes.load.query({id: idOrSlug})
        : await trpc().accountRoutes.getBySlug.query({slug: idOrSlug});
      return result as Account;
    },
    options: {
      staleTime: 60 * 1000,
    },
  });
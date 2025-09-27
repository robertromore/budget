import {defineQuery, createQueryKeys} from "./_factory";
import {queryPresets} from "./_client";
import {trpc} from "$lib/trpc/client";
import type {Account} from "$lib/schema/accounts";

export const accountKeys = createQueryKeys("accounts", {
  lists: () => ["accounts", "list"] as const,
  list: () => ["accounts", "list"] as const,
  details: () => ["accounts", "detail"] as const,
  detail: (id: number) => ["accounts", "detail", id] as const,
});

export const listAccounts = () =>
  defineQuery<Account[]>({
    queryKey: accountKeys.list(),
    queryFn: () => trpc().accountRoutes.all.query(),
    options: {
      ...queryPresets.static,
    },
  });

export const getAccountDetail = (id: number) =>
  defineQuery<Account>({
    queryKey: accountKeys.detail(id),
    queryFn: () => trpc().accountRoutes.get.query({id}),
    options: {
      staleTime: 60 * 1000,
    },
  });
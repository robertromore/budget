import { createQuery, createMutation } from "@tanstack/svelte-query";
import { orpcClient } from "./client";

// Account queries
export function createAccountsQuery() {
  return createQuery({
    queryKey: ["accounts", "all"],
    queryFn: () => orpcClient.accounts.all(),
  });
}

export function createAccountQuery(id: number) {
  return createQuery({
    queryKey: ["accounts", "load", id],
    queryFn: () => orpcClient.accounts.load({ id }),
    enabled: !!id,
  });
}

// Categories queries
export function createCategoriesQuery() {
  return createQuery({
    queryKey: ["categories", "all"],
    queryFn: () => orpcClient.categories.all(),
  });
}

export function createCategoryQuery(id: number) {
  return createQuery({
    queryKey: ["categories", "load", id],
    queryFn: () => orpcClient.categories.load({ id }),
    enabled: !!id,
  });
}

// Payees queries
export function createPayeesQuery() {
  return createQuery({
    queryKey: ["payees", "all"],
    queryFn: () => orpcClient.payees.all(),
  });
}

export function createPayeeQuery(id: number) {
  return createQuery({
    queryKey: ["payees", "load", id],
    queryFn: () => orpcClient.payees.load({ id }),
    enabled: !!id,
  });
}

// Transactions queries
export function createTransactionsForAccountQuery(id: number) {
  return createQuery({
    queryKey: ["transactions", "forAccount", id],
    queryFn: () => orpcClient.transactions.forAccount({ id }),
    enabled: !!id,
  });
}

// Schedules queries
export function createSchedulesQuery() {
  return createQuery({
    queryKey: ["schedules", "all"],
    queryFn: () => orpcClient.schedules.all(),
  });
}

export function createScheduleQuery(id: number) {
  return createQuery({
    queryKey: ["schedules", "load", id],
    queryFn: () => orpcClient.schedules.load({ id }),
    enabled: !!id,
  });
}

// Views queries
export function createViewsQuery() {
  return createQuery({
    queryKey: ["views", "all"],
    queryFn: () => orpcClient.views.all(),
  });
}

export function createViewQuery(id: number) {
  return createQuery({
    queryKey: ["views", "load", id],
    queryFn: () => orpcClient.views.load({ id }),
    enabled: !!id,
  });
}

// Account mutations
export function createSaveAccountMutation() {
  return createMutation({
    mutationFn: (input: any) => orpcClient.accounts.save(input),
  });
}

export function createRemoveAccountMutation() {
  return createMutation({
    mutationFn: (input: { id: number }) => orpcClient.accounts.remove(input),
  });
}

// Category mutations
export function createSaveCategoryMutation() {
  return createMutation({
    mutationFn: (input: any) => orpcClient.categories.save(input),
  });
}

export function createRemoveCategoryMutation() {
  return createMutation({
    mutationFn: (input: { id: number }) => orpcClient.categories.remove(input),
  });
}

export function createDeleteCategoriesMutation() {
  return createMutation({
    mutationFn: (input: { entities: number[] }) => orpcClient.categories.delete(input),
  });
}

// Payee mutations
export function createSavePayeeMutation() {
  return createMutation({
    mutationFn: (input: any) => orpcClient.payees.save(input),
  });
}

export function createRemovePayeeMutation() {
  return createMutation({
    mutationFn: (input: { id: number }) => orpcClient.payees.remove(input),
  });
}

export function createDeletePayeesMutation() {
  return createMutation({
    mutationFn: (input: { entities: number[] }) => orpcClient.payees.delete(input),
  });
}

// Transaction mutations
export function createSaveTransactionMutation() {
  return createMutation({
    mutationFn: (input: any) => orpcClient.transactions.save(input),
  });
}

export function createDeleteTransactionsMutation() {
  return createMutation({
    mutationFn: (input: { entities: number[] }) => orpcClient.transactions.delete(input),
  });
}

// Schedule mutations
export function createSaveScheduleMutation() {
  return createMutation({
    mutationFn: (input: any) => orpcClient.schedules.save(input),
  });
}

export function createRemoveScheduleMutation() {
  return createMutation({
    mutationFn: (input: { id: number }) => orpcClient.schedules.remove(input),
  });
}

// View mutations
export function createSaveViewMutation() {
  return createMutation({
    mutationFn: (input: any) => orpcClient.views.save(input),
  });
}

export function createRemoveViewMutation() {
  return createMutation({
    mutationFn: (input: { id: number }) => orpcClient.views.remove(input),
  });
}

export function createDeleteViewsMutation() {
  return createMutation({
    mutationFn: (input: { entities: number[] }) => orpcClient.views.delete(input),
  });
}

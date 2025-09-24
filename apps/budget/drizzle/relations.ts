import { relations } from "drizzle-orm/relations";
import { categories, account, schedules, payee, scheduleDates, budget, transaction, budgetAccount, budgetCategory, budgetGroup, budgetGroupMembership, budgetPeriodTemplate, budgetPeriodInstance, budgetTransaction, envelopeAllocation, envelopeRolloverHistory, envelopeTransfer } from "./schema";

export const categoriesRelations = relations(categories, ({one, many}) => ({
	category: one(categories, {
		fields: [categories.parentId],
		references: [categories.id],
		relationName: "categories_parentId_categories_id"
	}),
	categories: many(categories, {
		relationName: "categories_parentId_categories_id"
	}),
	schedules: many(schedules),
	transactions: many(transaction),
	budgetCategories: many(budgetCategory),
	envelopeAllocations: many(envelopeAllocation),
}));

export const schedulesRelations = relations(schedules, ({one, many}) => ({
	account: one(account, {
		fields: [schedules.accountId],
		references: [account.id]
	}),
	payee: one(payee, {
		fields: [schedules.payeeId],
		references: [payee.id]
	}),
	scheduleDate: one(scheduleDates, {
		fields: [schedules.scheduleDateId],
		references: [scheduleDates.id],
		relationName: "schedules_scheduleDateId_scheduleDates_id"
	}),
	budget: one(budget, {
		fields: [schedules.budgetId],
		references: [budget.id]
	}),
	category: one(categories, {
		fields: [schedules.categoryId],
		references: [categories.id]
	}),
	transactions: many(transaction),
	scheduleDates: many(scheduleDates, {
		relationName: "scheduleDates_scheduleId_schedules_id"
	}),
}));

export const accountRelations = relations(account, ({many}) => ({
	schedules: many(schedules),
	transactions: many(transaction),
	budgetAccounts: many(budgetAccount),
}));

export const payeeRelations = relations(payee, ({many}) => ({
	schedules: many(schedules),
	transactions: many(transaction),
}));

export const scheduleDatesRelations = relations(scheduleDates, ({one, many}) => ({
	schedules: many(schedules, {
		relationName: "schedules_scheduleDateId_scheduleDates_id"
	}),
	schedule: one(schedules, {
		fields: [scheduleDates.scheduleId],
		references: [schedules.id],
		relationName: "scheduleDates_scheduleId_schedules_id"
	}),
}));

export const budgetRelations = relations(budget, ({many}) => ({
	schedules: many(schedules),
	budgetAccounts: many(budgetAccount),
	budgetCategories: many(budgetCategory),
	budgetGroupMemberships: many(budgetGroupMembership),
	budgetPeriodTemplates: many(budgetPeriodTemplate),
	budgetTransactions: many(budgetTransaction),
	envelopeAllocations: many(envelopeAllocation),
}));

export const transactionRelations = relations(transaction, ({one, many}) => ({
	schedule: one(schedules, {
		fields: [transaction.scheduleId],
		references: [schedules.id]
	}),
	category: one(categories, {
		fields: [transaction.categoryId],
		references: [categories.id]
	}),
	payee: one(payee, {
		fields: [transaction.payeeId],
		references: [payee.id]
	}),
	transaction: one(transaction, {
		fields: [transaction.parentId],
		references: [transaction.id],
		relationName: "transaction_parentId_transaction_id"
	}),
	transactions: many(transaction, {
		relationName: "transaction_parentId_transaction_id"
	}),
	account: one(account, {
		fields: [transaction.accountId],
		references: [account.id]
	}),
	budgetTransactions: many(budgetTransaction),
}));

export const budgetAccountRelations = relations(budgetAccount, ({one}) => ({
	account: one(account, {
		fields: [budgetAccount.accountId],
		references: [account.id]
	}),
	budget: one(budget, {
		fields: [budgetAccount.budgetId],
		references: [budget.id]
	}),
}));

export const budgetCategoryRelations = relations(budgetCategory, ({one}) => ({
	category: one(categories, {
		fields: [budgetCategory.categoryId],
		references: [categories.id]
	}),
	budget: one(budget, {
		fields: [budgetCategory.budgetId],
		references: [budget.id]
	}),
}));

export const budgetGroupMembershipRelations = relations(budgetGroupMembership, ({one}) => ({
	budgetGroup: one(budgetGroup, {
		fields: [budgetGroupMembership.groupId],
		references: [budgetGroup.id]
	}),
	budget: one(budget, {
		fields: [budgetGroupMembership.budgetId],
		references: [budget.id]
	}),
}));

export const budgetGroupRelations = relations(budgetGroup, ({one, many}) => ({
	budgetGroupMemberships: many(budgetGroupMembership),
	budgetGroup: one(budgetGroup, {
		fields: [budgetGroup.parentId],
		references: [budgetGroup.id],
		relationName: "budgetGroup_parentId_budgetGroup_id"
	}),
	budgetGroups: many(budgetGroup, {
		relationName: "budgetGroup_parentId_budgetGroup_id"
	}),
}));

export const budgetPeriodInstanceRelations = relations(budgetPeriodInstance, ({one, many}) => ({
	budgetPeriodTemplate: one(budgetPeriodTemplate, {
		fields: [budgetPeriodInstance.templateId],
		references: [budgetPeriodTemplate.id]
	}),
	envelopeAllocations: many(envelopeAllocation),
	envelopeRolloverHistories_toPeriodId: many(envelopeRolloverHistory, {
		relationName: "envelopeRolloverHistory_toPeriodId_budgetPeriodInstance_id"
	}),
	envelopeRolloverHistories_fromPeriodId: many(envelopeRolloverHistory, {
		relationName: "envelopeRolloverHistory_fromPeriodId_budgetPeriodInstance_id"
	}),
}));

export const budgetPeriodTemplateRelations = relations(budgetPeriodTemplate, ({one, many}) => ({
	budgetPeriodInstances: many(budgetPeriodInstance),
	budget: one(budget, {
		fields: [budgetPeriodTemplate.budgetId],
		references: [budget.id]
	}),
}));

export const budgetTransactionRelations = relations(budgetTransaction, ({one}) => ({
	budget: one(budget, {
		fields: [budgetTransaction.budgetId],
		references: [budget.id]
	}),
	transaction: one(transaction, {
		fields: [budgetTransaction.transactionId],
		references: [transaction.id]
	}),
}));

export const envelopeAllocationRelations = relations(envelopeAllocation, ({one, many}) => ({
	budgetPeriodInstance: one(budgetPeriodInstance, {
		fields: [envelopeAllocation.periodInstanceId],
		references: [budgetPeriodInstance.id]
	}),
	category: one(categories, {
		fields: [envelopeAllocation.categoryId],
		references: [categories.id]
	}),
	budget: one(budget, {
		fields: [envelopeAllocation.budgetId],
		references: [budget.id]
	}),
	envelopeRolloverHistories: many(envelopeRolloverHistory),
	envelopeTransfers_toEnvelopeId: many(envelopeTransfer, {
		relationName: "envelopeTransfer_toEnvelopeId_envelopeAllocation_id"
	}),
	envelopeTransfers_fromEnvelopeId: many(envelopeTransfer, {
		relationName: "envelopeTransfer_fromEnvelopeId_envelopeAllocation_id"
	}),
}));

export const envelopeRolloverHistoryRelations = relations(envelopeRolloverHistory, ({one}) => ({
	budgetPeriodInstance_toPeriodId: one(budgetPeriodInstance, {
		fields: [envelopeRolloverHistory.toPeriodId],
		references: [budgetPeriodInstance.id],
		relationName: "envelopeRolloverHistory_toPeriodId_budgetPeriodInstance_id"
	}),
	budgetPeriodInstance_fromPeriodId: one(budgetPeriodInstance, {
		fields: [envelopeRolloverHistory.fromPeriodId],
		references: [budgetPeriodInstance.id],
		relationName: "envelopeRolloverHistory_fromPeriodId_budgetPeriodInstance_id"
	}),
	envelopeAllocation: one(envelopeAllocation, {
		fields: [envelopeRolloverHistory.envelopeId],
		references: [envelopeAllocation.id]
	}),
}));

export const envelopeTransferRelations = relations(envelopeTransfer, ({one}) => ({
	envelopeAllocation_toEnvelopeId: one(envelopeAllocation, {
		fields: [envelopeTransfer.toEnvelopeId],
		references: [envelopeAllocation.id],
		relationName: "envelopeTransfer_toEnvelopeId_envelopeAllocation_id"
	}),
	envelopeAllocation_fromEnvelopeId: one(envelopeAllocation, {
		fields: [envelopeTransfer.fromEnvelopeId],
		references: [envelopeAllocation.id],
		relationName: "envelopeTransfer_fromEnvelopeId_envelopeAllocation_id"
	}),
}));
import { sqliteTable, AnySQLiteColumn, index, foreignKey, integer, text, real, uniqueIndex } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const categories = sqliteTable("categories", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	parentId: integer("parent_id"),
	name: text(),
	notes: text(),
	dateCreated: text("date_created").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	deletedAt: text("deleted_at"),
},
(table) => [
	index("category_deleted_at_idx").on(table.deletedAt),
	index("category_parent_idx").on(table.parentId),
	index("category_name_idx").on(table.name),
	foreignKey(() => ({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "categories_parent_id_categories_id_fk"
		})),
]);

export const filter = sqliteTable("filter", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text().notNull(),
	operator: text().notNull(),
});

export const payee = sqliteTable("payee", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text(),
	notes: text(),
	dateCreated: text("date_created").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	deletedAt: text("deleted_at"),
},
(table) => [
	index("payee_deleted_at_idx").on(table.deletedAt),
	index("payee_name_idx").on(table.name),
]);

export const schedules = sqliteTable("schedules", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	status: text().default("active"),
	amount: real().notNull(),
	amount2: real("amount_2").notNull(),
	amountType: text("amount_type").default("exact").notNull(),
	recurring: integer().default(false),
	autoAdd: integer("auto_add").default(false),
	scheduleDateId: integer("schedule_date_id").references((): AnySQLiteColumn => scheduleDates.id),
	payeeId: integer("payee_id").notNull().references(() => payee.id),
	accountId: integer("account_id").notNull().references(() => account.id),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	categoryId: integer("category_id").references(() => categories.id),
	budgetId: integer("budget_id").references(() => budget.id),
},
(table) => [
	index("relations_schedule_budget_idx").on(table.budgetId),
	index("relations_schedule_category_idx").on(table.categoryId),
	index("schedule_slug_idx").on(table.slug),
	index("schedule_name_idx").on(table.name),
	index("schedule_status_idx").on(table.status),
	index("relations_schedule_payee_idx").on(table.payeeId),
	index("relations_schedule_account_idx").on(table.accountId),
	index("relations_schedule_schedule_date_idx").on(table.scheduleDateId),
]);

export const transaction = sqliteTable("transaction", {
	id: integer().primaryKey().notNull(),
	accountId: integer("account_id").notNull().references(() => account.id, { onDelete: "cascade" } ),
	parentId: integer("parent_id"),
	status: text().default("pending"),
	payeeId: integer("payee_id").references(() => payee.id),
	amount: real().notNull(),
	categoryId: integer("category_id").references(() => categories.id),
	notes: text(),
	date: text().default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	scheduleId: integer("schedule_id").references(() => schedules.id),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	deletedAt: text("deleted_at"),
},
(table) => [
	index("transaction_deleted_at_idx").on(table.deletedAt),
	index("transaction_parent_idx").on(table.parentId),
	index("transaction_status_idx").on(table.status),
	index("transaction_date_idx").on(table.date),
	index("transaction_account_date_idx").on(table.accountId, table.date, table.id),
	index("relations_transaction_schedule_idx").on(table.scheduleId),
	index("relations_transaction_category_idx").on(table.categoryId),
	index("relations_transaction_payee_idx").on(table.payeeId),
	index("relations_transaction_account_idx").on(table.accountId),
	foreignKey(() => ({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "transaction_parent_id_transaction_id_fk"
		})),
]);

export const views = sqliteTable("views", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text().notNull(),
	description: text(),
	icon: text(),
	filters: text(),
	display: text(),
	dirty: integer(),
});

export const scheduleDates = sqliteTable("schedule_dates", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	startDate: text("start_date").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	endDate: text("end_date"),
	frequency: text(),
	interval: integer().default(1),
	limit: integer().default(0),
	moveWeekends: text("move_weekends").default("none"),
	moveHolidays: text("move_holidays").default("none"),
	specificDates: text("specific_dates").default("{}"),
	scheduleId: integer("schedule_id").notNull().references((): AnySQLiteColumn => schedules.id),
},
(table) => [
	index("relations_schedule_date_schedule_idx").on(table.scheduleId),
]);

export const budgetAccount = sqliteTable("budget_account", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	budgetId: integer("budget_id").notNull().references(() => budget.id, { onDelete: "cascade" } ),
	accountId: integer("account_id").notNull().references(() => account.id, { onDelete: "cascade" } ),
},
(table) => [
	index("budget_account_account_idx").on(table.accountId),
	uniqueIndex("budget_account_unique").on(table.budgetId, table.accountId),
]);

export const budgetCategory = sqliteTable("budget_category", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	budgetId: integer("budget_id").notNull().references(() => budget.id, { onDelete: "cascade" } ),
	categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" } ),
},
(table) => [
	index("budget_category_category_idx").on(table.categoryId),
	uniqueIndex("budget_category_unique").on(table.budgetId, table.categoryId),
]);

export const budgetGroupMembership = sqliteTable("budget_group_membership", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	budgetId: integer("budget_id").notNull().references(() => budget.id, { onDelete: "cascade" } ),
	groupId: integer("group_id").notNull().references(() => budgetGroup.id, { onDelete: "cascade" } ),
},
(table) => [
	uniqueIndex("budget_group_membership_unique").on(table.budgetId, table.groupId),
]);

export const budgetGroup = sqliteTable("budget_group", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text().notNull(),
	description: text(),
	parentId: integer("parent_id"),
	color: text(),
	spendingLimit: real("spending_limit"),
	inheritParentSettings: integer("inherit_parent_settings").default(true).notNull(),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
},
(table) => [
	index("budget_group_name_idx").on(table.name),
	index("budget_group_parent_idx").on(table.parentId),
	foreignKey(() => ({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "budget_group_parent_id_budget_group_id_fk"
		})),
]);

export const budgetPeriodInstance = sqliteTable("budget_period_instance", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	templateId: integer("template_id").notNull().references(() => budgetPeriodTemplate.id, { onDelete: "cascade" } ),
	startDate: text("start_date").notNull(),
	endDate: text("end_date").notNull(),
	allocatedAmount: real("allocated_amount").notNull(),
	rolloverAmount: real("rollover_amount").notNull(),
	actualAmount: real("actual_amount").notNull(),
	lastCalculated: text("last_calculated"),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
},
(table) => [
	index("budget_period_instance_range_idx").on(table.startDate, table.endDate),
	index("budget_period_instance_template_idx").on(table.templateId),
]);

export const budgetPeriodTemplate = sqliteTable("budget_period_template", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	budgetId: integer("budget_id").notNull().references(() => budget.id, { onDelete: "cascade" } ),
	type: text().notNull(),
	intervalCount: integer("interval_count").default(1).notNull(),
	startDayOfWeek: integer("start_day_of_week"),
	startDayOfMonth: integer("start_day_of_month"),
	startMonth: integer("start_month"),
	timezone: text(),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
},
(table) => [
	index("budget_period_template_type_idx").on(table.type),
	index("budget_period_template_budget_idx").on(table.budgetId),
]);

export const budgetTransaction = sqliteTable("budget_transaction", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	transactionId: integer("transaction_id").notNull().references(() => transaction.id, { onDelete: "cascade" } ),
	budgetId: integer("budget_id").notNull().references(() => budget.id, { onDelete: "cascade" } ),
	allocatedAmount: real("allocated_amount").notNull(),
	autoAssigned: integer("auto_assigned").default(true).notNull(),
	assignedAt: text("assigned_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	assignedBy: text("assigned_by"),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
},
(table) => [
	index("budget_transaction_assigned_at_idx").on(table.assignedAt),
	index("budget_transaction_transaction_idx").on(table.transactionId),
	index("budget_transaction_budget_idx").on(table.budgetId),
]);

export const budget = sqliteTable("budget", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text().notNull(),
	description: text(),
	type: text().notNull(),
	scope: text().notNull(),
	status: text().default("active").notNull(),
	enforcementLevel: text("enforcement_level").default("warning").notNull(),
	metadata: text().default("{}").notNull(),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	deletedAt: text("deleted_at"),
},
(table) => [
	index("budget_enforcement_idx").on(table.enforcementLevel),
	index("budget_status_idx").on(table.status),
	index("budget_scope_idx").on(table.scope),
	index("budget_type_idx").on(table.type),
]);

export const account = sqliteTable("account", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	cuid: text(),
	name: text().notNull(),
	slug: text().notNull(),
	closed: integer().default(false),
	notes: text(),
	dateOpened: text("date_opened").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	deletedAt: text("deleted_at"),
},
(table) => [
	index("account_deleted_at_idx").on(table.deletedAt),
	index("account_closed_idx").on(table.closed),
	index("account_slug_idx").on(table.slug),
	index("account_name_idx").on(table.name),
]);

export const envelopeAllocation = sqliteTable("envelope_allocation", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	budgetId: integer("budget_id").notNull().references(() => budget.id, { onDelete: "cascade" } ),
	categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" } ),
	periodInstanceId: integer("period_instance_id").notNull().references(() => budgetPeriodInstance.id, { onDelete: "cascade" } ),
	allocatedAmount: real("allocated_amount").notNull(),
	spentAmount: real("spent_amount").notNull(),
	rolloverAmount: real("rollover_amount").notNull(),
	availableAmount: real("available_amount").notNull(),
	deficitAmount: real("deficit_amount").notNull(),
	status: text().default("active").notNull(),
	rolloverMode: text("rollover_mode").default("unlimited").notNull(),
	metadata: text().default("{}").notNull(),
	lastCalculated: text("last_calculated"),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
},
(table) => [
	index("envelope_allocation_status_idx").on(table.status),
	index("envelope_allocation_period_idx").on(table.periodInstanceId),
	index("envelope_allocation_category_idx").on(table.categoryId),
	index("envelope_allocation_budget_idx").on(table.budgetId),
	uniqueIndex("envelope_allocation_unique").on(table.budgetId, table.categoryId, table.periodInstanceId),
]);

export const envelopeRolloverHistory = sqliteTable("envelope_rollover_history", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	envelopeId: integer("envelope_id").notNull().references(() => envelopeAllocation.id, { onDelete: "cascade" } ),
	fromPeriodId: integer("from_period_id").notNull().references(() => budgetPeriodInstance.id, { onDelete: "cascade" } ),
	toPeriodId: integer("to_period_id").notNull().references(() => budgetPeriodInstance.id, { onDelete: "cascade" } ),
	rolledAmount: real("rolled_amount").notNull(),
	resetAmount: real("reset_amount").notNull(),
	processedAt: text("processed_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
},
(table) => [
	index("envelope_rollover_to_period_idx").on(table.toPeriodId),
	index("envelope_rollover_from_period_idx").on(table.fromPeriodId),
	index("envelope_rollover_envelope_idx").on(table.envelopeId),
]);

export const envelopeTransfer = sqliteTable("envelope_transfer", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	fromEnvelopeId: integer("from_envelope_id").notNull().references(() => envelopeAllocation.id, { onDelete: "cascade" } ),
	toEnvelopeId: integer("to_envelope_id").notNull().references(() => envelopeAllocation.id, { onDelete: "cascade" } ),
	amount: real().notNull(),
	reason: text(),
	transferredBy: text("transferred_by").notNull(),
	transferredAt: text("transferred_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
},
(table) => [
	index("envelope_transfer_date_idx").on(table.transferredAt),
	index("envelope_transfer_to_idx").on(table.toEnvelopeId),
	index("envelope_transfer_from_idx").on(table.fromEnvelopeId),
]);


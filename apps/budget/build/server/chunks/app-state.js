import { clsx } from "clsx";
import { S as SvelteMap, g as getContext, s as setContext, d as derived, C as Context } from "./vendor-misc.js";
import { createTRPCClient } from "trpc-sveltekit";
import { $ as $14e0f24ef4ac5c92$export$aa8b41735afcabd2, a as $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3, b as $35ea8db9cb2ccb90$export$99faa760c7908e4f, c as $fb18d541ea1ad717$export$ad991b66133851cf, d as $11d87f3f76e88657$export$93522d1a439f3617, e as $fae977aafc393c5c$export$6b862160d295c8e, f as $14e0f24ef4ac5c92$export$42c81a444fbfb5d4, g as $14e0f24ef4ac5c92$export$ef8b6d9133084f4e } from "./vendor-date.js";
import { twMerge } from "tailwind-merge";
import { createId } from "@paralleldrive/cuid2";
import { sql, relations } from "drizzle-orm";
import { sqliteTable, text, integer, index, real } from "drizzle-orm/sqlite-core";
import { createSelectSchema, createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import validator from "validator";
const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    parentId: integer("parent_id").references(() => categories.id),
    name: text("name"),
    notes: text("notes"),
    dateCreated: text("date_created").notNull().default(sql`CURRENT_TIMESTAMP`),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("category_name_idx").on(table.name),
    index("category_parent_idx").on(table.parentId),
    index("category_deleted_at_idx").on(table.deletedAt)
  ]
);
const categoriesRelations = relations(categories, ({ one }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id]
  })
}));
const selectCategorySchema = createSelectSchema(categories);
const insertCategorySchema = createInsertSchema(categories);
const formInsertCategorySchema = createInsertSchema(categories, {
  name: (schema2) => schema2.transform((val) => val?.trim()).pipe(
    z.string().min(1, "Category name is required").max(50, "Category name must be less than 50 characters").refine((val) => {
      if (validator.contains(val, "<") || validator.contains(val, ">")) return false;
      if (validator.contains(val, "{") || validator.contains(val, "}")) return false;
      if (validator.contains(val, "[") || validator.contains(val, "]")) return false;
      if (validator.contains(val, "\\") || validator.contains(val, "|")) return false;
      return true;
    }, "Category name contains invalid characters")
  ),
  notes: (schema2) => schema2.transform((val) => val?.trim()).pipe(
    z.string().max(500, "Notes must be less than 500 characters").refine((val) => {
      if (!val) return true;
      if (validator.contains(val, "<") || validator.contains(val, ">")) {
        return false;
      }
      return true;
    }, "Notes cannot contain HTML tags")
  ).optional().nullable()
});
const removeCategorySchema = z.object({ id: z.number().nonnegative() });
const removeCategoriesSchema = z.object({ entities: z.array(z.number().nonnegative()) });
const payees = sqliteTable(
  "payee",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name"),
    notes: text("notes"),
    dateCreated: text("date_created").notNull().default(sql`CURRENT_TIMESTAMP`),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("payee_name_idx").on(table.name),
    index("payee_deleted_at_idx").on(table.deletedAt)
  ]
);
const payeesRelations = relations(payees, ({ many }) => ({
  transactions: many(transactions)
}));
const selectPayeeSchema = createSelectSchema(payees);
const insertPayeeSchema = createInsertSchema(payees);
const formInsertPayeeSchema = createInsertSchema(payees, {
  name: (schema2) => schema2.min(1, "Payee name is required").max(50, "Payee name must be less than 50 characters").regex(/^[a-zA-Z0-9\s\-_&']+$/, "Payee name contains invalid characters"),
  notes: (schema2) => schema2.max(500, "Notes must be less than 500 characters").optional().nullable()
});
const removePayeeSchema = z.object({ id: z.number().nonnegative() });
const removePayeesSchema = z.object({ entities: z.array(z.number().nonnegative()) });
const scheduleDates = sqliteTable(
  "schedule_dates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    start: text("start_date").notNull().default(sql`CURRENT_TIMESTAMP`),
    end: text("end_date"),
    frequency: text("frequency", { enum: ["daily", "weekly", "monthly", "yearly"] }),
    interval: integer("interval").default(1),
    limit: integer("limit").default(0),
    move_weekends: text("move_weekends", {
      enum: ["none", "next_weekday", "previous_weekday"]
    }).default("none"),
    move_holidays: text("move_holidays", {
      enum: ["none", "next_weekday", "previous_weekday"]
    }).default("none"),
    specific_dates: text("specific_dates", { mode: "json" }).default({}),
    scheduleId: integer("schedule_id").notNull().references(() => schedules.id)
  },
  (table) => [index("relations_schedule_date_schedule_idx").on(table.scheduleId)]
);
relations(scheduleDates, ({ one }) => ({
  schedule: one(schedules, {
    fields: [scheduleDates.scheduleId],
    references: [schedules.id]
  })
}));
createSelectSchema(scheduleDates);
createInsertSchema(scheduleDates);
createInsertSchema(scheduleDates, {
  // name: (schema) => schema.min(2).max(30),
});
z.object({ id: z.number().nonnegative() });
const schedules = sqliteTable(
  "schedules",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status", { enum: ["active", "inactive"] }).default("active"),
    amount: real("amount").default(0).notNull(),
    amount_2: real("amount_2").default(0).notNull(),
    amount_type: text("amount_type", { enum: ["exact", "approximate", "range"] }).default("exact").notNull(),
    recurring: integer("recurring", { mode: "boolean" }).default(false),
    auto_add: integer({ mode: "boolean" }).default(false),
    dateId: integer("schedule_date_id").references(() => scheduleDates.id),
    payeeId: integer("payee_id").notNull().references(() => payees.id),
    accountId: integer("account_id").notNull().references(() => accounts.id),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    index("relations_schedule_schedule_date_idx").on(table.dateId),
    index("relations_schedule_account_idx").on(table.accountId),
    index("relations_schedule_payee_idx").on(table.payeeId),
    index("schedule_status_idx").on(table.status),
    index("schedule_name_idx").on(table.name),
    index("schedule_slug_idx").on(table.slug)
  ]
);
const schedulesRelations = relations(schedules, ({ many, one }) => ({
  transactions: many(transactions),
  account: one(accounts, {
    fields: [schedules.accountId],
    references: [accounts.id]
  }),
  payee: one(payees, {
    fields: [schedules.payeeId],
    references: [payees.id]
  })
}));
const selectScheduleSchema = createSelectSchema(schedules);
const insertScheduleSchema = createInsertSchema(schedules);
const formInsertScheduleSchema = createInsertSchema(schedules, {
  name: (schema2) => schema2.min(2).max(30)
});
const removeScheduleSchema = z.object({ id: z.number().nonnegative() });
const transactions = sqliteTable(
  "transaction",
  {
    id: integer("id").primaryKey().notNull(),
    accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
    parentId: integer("parent_id").references(() => transactions.id),
    status: text("status", { enum: ["cleared", "pending", "scheduled"] }).default("pending"),
    payeeId: integer("payee_id").references(() => payees.id),
    amount: real("amount").default(0).notNull(),
    categoryId: integer("category_id").references(() => categories.id),
    notes: text("notes"),
    date: text("date").notNull().default(sql`CURRENT_TIMESTAMP`),
    scheduleId: integer("schedule_id").references(() => schedules.id),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("relations_transaction_account_idx").on(table.accountId),
    index("relations_transaction_payee_idx").on(table.payeeId),
    index("relations_transaction_category_idx").on(table.categoryId),
    index("relations_transaction_schedule_idx").on(table.scheduleId),
    index("transaction_account_date_idx").on(table.accountId, table.date, table.id),
    index("transaction_date_idx").on(table.date),
    index("transaction_status_idx").on(table.status),
    index("transaction_parent_idx").on(table.parentId),
    index("transaction_deleted_at_idx").on(table.deletedAt)
  ]
);
const transactionsRelations = relations(transactions, ({ many, one }) => ({
  parent: one(transactions, {
    fields: [transactions.parentId],
    references: [transactions.id]
  }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id]
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id]
  }),
  payee: one(payees, {
    fields: [transactions.payeeId],
    references: [payees.id]
  }),
  schedule: one(schedules, {
    fields: [transactions.scheduleId],
    references: [schedules.id]
  })
}));
const selectTransactionSchema = createSelectSchema(transactions);
const insertTransactionSchema = createInsertSchema(transactions);
const formInsertTransactionSchema = createInsertSchema(transactions, {
  amount: z.number({
    message: "Amount must be a number"
  }).min(-999999.99, "Amount cannot be less than -$999,999.99").max(999999.99, "Amount cannot exceed $999,999.99").multipleOf(0.01, "Amount must be a valid currency value"),
  notes: (schema2) => schema2.max(500, "Notes must be less than 500 characters").refine((val) => {
    if (!val) return true;
    if (validator.contains(val, "<") || validator.contains(val, ">")) {
      return false;
    }
    return true;
  }, "Notes cannot contain HTML tags").optional().nullable(),
  status: (schema2) => schema2.refine((val) => !val || ["cleared", "pending", "scheduled"].includes(val), {
    message: "Invalid transaction status"
  }).optional()
});
const removeTransactionsSchema = z.object({
  entities: z.array(z.number().nonnegative()).max(100, "Too many transactions selected for deletion"),
  accountId: z.number().positive("Account ID must be positive")
});
var TransactionStatuses = /* @__PURE__ */ ((TransactionStatuses2) => {
  TransactionStatuses2["CLEARED"] = "cleared";
  TransactionStatuses2["PENDING"] = "pending";
  TransactionStatuses2["SCHEDULED"] = "scheduled";
  return TransactionStatuses2;
})(TransactionStatuses || {});
const accounts = sqliteTable(
  "account",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cuid: text("cuid").$defaultFn(() => createId()),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    // @todo maybe change to enum to allow for archiving?
    closed: integer("closed", { mode: "boolean" }).default(false),
    // @todo decide if it's better to calculate and store this value or aggregate
    // the value based on the transaction rows.
    // balance: real('balance').default(0.0).notNull(),
    notes: text("notes"),
    dateOpened: text("date_opened").notNull().default(sql`CURRENT_TIMESTAMP`),
    // @todo only useful if allowing account archival?
    // dateClosed: integer('date_closed', { mode: 'timestamp' })
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("account_name_idx").on(table.name),
    index("account_slug_idx").on(table.slug),
    index("account_closed_idx").on(table.closed),
    index("account_deleted_at_idx").on(table.deletedAt)
  ]
);
const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions)
}));
const selectAccountSchema = createSelectSchema(accounts);
const insertAccountSchema = createInsertSchema(accounts);
const formInsertAccountSchema = createInsertSchema(accounts, {
  name: (schema2) => schema2.transform((val) => val?.trim()).pipe(
    z.string().min(1, "Account name is required").min(2, "Account name must be at least 2 characters").max(50, "Account name must be less than 50 characters").regex(/^[a-zA-Z0-9\s\-_.'&()]+$/, "Account name contains invalid characters")
  ),
  slug: (schema2) => schema2.transform((val) => val?.trim()?.toLowerCase()).pipe(
    z.string().min(2, "Slug must be at least 2 characters").max(30, "Slug must be less than 30 characters").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
  ).optional(),
  notes: (schema2) => schema2.transform((val) => val?.trim()).pipe(
    z.string().max(500, "Notes must be less than 500 characters")
  ).optional().nullable()
});
const formUpdateAccountSchema = z.object({
  id: z.number().positive(),
  name: z.string().transform((val) => val?.trim()).pipe(
    z.string().min(2, "Account name must be at least 2 characters").max(50, "Account name must be less than 50 characters").regex(/^[a-zA-Z0-9\s\-_.'&()]+$/, "Account name contains invalid characters")
  ).optional(),
  slug: z.string().transform((val) => val?.trim()?.toLowerCase()).pipe(
    z.string().min(2, "Slug must be at least 2 characters").max(30, "Slug must be less than 30 characters").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
  ).optional(),
  notes: z.string().transform((val) => val?.trim()).pipe(
    z.string().max(500, "Notes must be less than 500 characters")
  ).optional().nullable(),
  closed: z.boolean().optional()
});
const formAccountSchema = z.union([
  formInsertAccountSchema,
  formUpdateAccountSchema
]);
const removeAccountSchema = z.object({ id: z.number().nonnegative() });
const views = sqliteTable("views", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  // label: text('label').notNull(),
  description: text("description"),
  icon: text("icon"),
  filters: text("filters", { mode: "json" }).$type(),
  display: text("display", { mode: "json" }).$type(),
  dirty: integer("dirty", { mode: "boolean" })
});
const selectViewSchema = createSelectSchema(views);
const insertViewSchema = createInsertSchema(views, {
  name: z.string().min(2, "Name must contain at least 2 characters"),
  description: z.union([z.string().max(500, "Description must be less than 500 characters"), z.null()]).optional(),
  filters: z.optional(
    z.array(
      z.object({
        column: z.string(),
        filter: z.string(),
        value: z.array(z.unknown())
      })
    ).or(z.null())
  ),
  display: z.optional(
    z.object({
      grouping: z.optional(z.array(z.string())),
      sort: z.optional(
        z.array(
          z.object({
            desc: z.boolean(),
            id: z.string()
          })
        )
      ),
      expanded: z.literal(true).default(true).or(z.record(z.string(), z.boolean())),
      visibility: z.literal(true).default(true).or(z.record(z.string(), z.boolean()))
    }).or(z.null())
  )
});
const removeViewSchema = z.object({ id: z.number().nonnegative() });
const removeViewsSchema = z.object({ entities: z.array(z.number().nonnegative()) });
const schema = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  TransactionStatuses,
  accounts,
  accountsRelations,
  categories,
  categoriesRelations,
  formAccountSchema,
  formInsertAccountSchema,
  formInsertCategorySchema,
  formInsertPayeeSchema,
  formInsertScheduleSchema,
  formInsertTransactionSchema,
  formUpdateAccountSchema,
  insertAccountSchema,
  insertCategorySchema,
  insertPayeeSchema,
  insertScheduleSchema,
  insertTransactionSchema,
  insertViewSchema,
  payees,
  payeesRelations,
  removeAccountSchema,
  removeCategoriesSchema,
  removeCategorySchema,
  removePayeeSchema,
  removePayeesSchema,
  removeScheduleSchema,
  removeTransactionsSchema,
  removeViewSchema,
  removeViewsSchema,
  schedules,
  schedulesRelations,
  selectAccountSchema,
  selectCategorySchema,
  selectPayeeSchema,
  selectScheduleSchema,
  selectTransactionSchema,
  selectViewSchema,
  transactions,
  transactionsRelations,
  views
}, Symbol.toStringTag, { value: "Module" }));
const RATE_LIMIT = {
  WINDOW_MS: 60 * 1e3,
  // 1 minute
  MUTATION_MAX_REQUESTS: 30,
  BULK_OPERATION_MAX_REQUESTS: 10,
  STRICT_MAX_REQUESTS: 5
};
const DATABASE_LIMITS = {
  MAX_SAFETY_LIMIT: 50
};
let browserClient;
function trpc(init) {
  const isBrowser = typeof window !== "undefined";
  if (isBrowser && browserClient) return browserClient;
  const client = createTRPCClient({});
  if (isBrowser) browserClient = client;
  return client;
}
const timezone = $14e0f24ef4ac5c92$export$aa8b41735afcabd2();
const currentDate = $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3(timezone);
function getDayOfWeek(date, timeZone = "UTC") {
  const jsDate = new Date(date.year, date.month - 1, date.day);
  return jsDate.getDay();
}
function getOrdinalSuffix(day) {
  const j = day % 10, k = day % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}
function sameMonthAndYear(date1, date2) {
  return date1.month === date2.month && date1.year === date2.year;
}
function getNextWeekdayFlexible(fromDate, targetWeekday, includeSameDay = false) {
  if (targetWeekday < 0 || targetWeekday > 6) {
    throw new Error("Target weekday must be between 0 (Sunday) and 6 (Saturday)");
  }
  const jsDate = fromDate.toDate(timezone);
  const currentWeekday = jsDate.getDay();
  if (currentWeekday === targetWeekday && includeSameDay) {
    return fromDate;
  }
  let daysToAdd = targetWeekday - currentWeekday;
  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }
  return fromDate.add({ days: daysToAdd });
}
function getNthWeekdayOfMonth(year, month, week, weekDay) {
  try {
    if (week === 5) {
      return getLastWeekdayOfMonth(year, month, weekDay);
    }
    const firstOfMonth = $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3(timezone).set({ year, month, day: 1 });
    const firstWeekDay = getDayOfWeek(firstOfMonth, timezone);
    let daysToAdd = weekDay - firstWeekDay;
    if (daysToAdd < 0) {
      daysToAdd += 7;
    }
    daysToAdd += (week - 1) * 7;
    const targetDate = firstOfMonth.add({ days: daysToAdd });
    if (targetDate.month === month) {
      return targetDate;
    }
    return null;
  } catch (error) {
    return null;
  }
}
function getLastWeekdayOfMonth(year, month, weekDay) {
  try {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const firstOfNextMonth = $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3(timezone).set({ year: nextYear, month: nextMonth, day: 1 });
    const lastOfMonth = firstOfNextMonth.subtract({ days: 1 });
    for (let i = 0; i < 7; i++) {
      const candidateDate = lastOfMonth.subtract({ days: i });
      if (getDayOfWeek(candidateDate, timezone) === weekDay) {
        return candidateDate;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}
function parseDateValue(dateValue) {
  if (!dateValue) return null;
  try {
    if (dateValue && typeof dateValue === "object" && "year" in dateValue && "month" in dateValue && "day" in dateValue) {
      return dateValue;
    }
    if (typeof dateValue === "string") {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return null;
      return new $35ea8db9cb2ccb90$export$99faa760c7908e4f(date.getFullYear(), date.getMonth() + 1, date.getDate());
    }
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) return null;
      return new $35ea8db9cb2ccb90$export$99faa760c7908e4f(dateValue.getFullYear(), dateValue.getMonth() + 1, dateValue.getDate());
    }
    if (typeof dateValue === "number" && !isNaN(dateValue)) {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return null;
      return new $35ea8db9cb2ccb90$export$99faa760c7908e4f(date.getFullYear(), date.getMonth() + 1, date.getDate());
    }
    return null;
  } catch (error) {
    return null;
  }
}
function dateValueToJSDate(dateValue, timeZone = "UTC") {
  return dateValue.toDate(timeZone);
}
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const reSplitAlphaNumeric = /([0-9]+)/gm;
function compareAlphanumeric(aStr, bStr) {
  const a = aStr.split(reSplitAlphaNumeric).filter(Boolean);
  const b = bStr.split(reSplitAlphaNumeric).filter(Boolean);
  while (a.length && b.length) {
    const aa = a.shift();
    const bb = b.shift();
    const an = Number.parseInt(aa, 10);
    const bn = Number.parseInt(bb, 10);
    const combo = [an, bn].sort();
    if (Number.isNaN(combo[0])) {
      if (aa > bb) {
        return 1;
      }
      if (bb > aa) {
        return -1;
      }
      continue;
    }
    if (Number.isNaN(combo[1])) {
      return Number.isNaN(an) ? -1 : 1;
    }
    if (an > bn) {
      return 1;
    }
    if (bn > an) {
      return -1;
    }
  }
  return a.length - b.length;
}
const without = (array, fn) => {
  const keep = [];
  const remove = [];
  array.forEach((value) => {
    if (fn(value)) {
      remove.push(value);
    } else {
      keep.push(value);
    }
  });
  array.splice(0, array.length, ...keep);
  return [keep, remove];
};
class UseBoolean {
  #current = false;
  constructor(defaultValue = false) {
    this.#current = defaultValue;
  }
  /** Toggles the current state */
  toggle() {
    this.#current = !this.#current;
  }
  /** Sets the current state to true */
  setTrue() {
    this.#current = true;
  }
  /** Sets the current state to false */
  setFalse() {
    this.#current = false;
  }
  get current() {
    return this.#current;
  }
  set current(val) {
    this.#current = val;
  }
}
class UseNumber {
  #current = 0;
  constructor(defaultValue = 0) {
    this.#current = defaultValue;
  }
  get current() {
    return this.#current;
  }
  set current(val) {
    this.#current = val;
  }
}
const newAccountDialog = new UseBoolean(false);
const managingAccountId = new UseNumber(0);
const newScheduleDialog = new UseBoolean(false);
const managingScheduleId = new UseNumber(0);
const deleteAccountDialog = new UseBoolean(false);
const deleteAccountId = new UseNumber(0);
const KEY$5 = Symbol("accounts");
class AccountsState {
  accounts = new SvelteMap();
  sortField = "name";
  sortDirection = "asc";
  constructor(accounts2) {
    this.loadSortPreferences();
    if (accounts2) {
      this.init(accounts2);
    }
  }
  // Initialize/reinitialize the store with new data
  init(accounts2) {
    this.accounts.clear();
    accounts2.forEach((account) => this.accounts.set(account.id, account));
  }
  // Context management
  static get() {
    return getContext(KEY$5);
  }
  static set(accounts2) {
    return setContext(KEY$5, new AccountsState(accounts2));
  }
  // Getters
  get all() {
    return this.accounts.values().toArray();
  }
  #sorted = derived(() => this.sortAccounts(this.all, this.sortField, this.sortDirection));
  get sorted() {
    return this.#sorted();
  }
  set sorted($$value) {
    return this.#sorted($$value);
  }
  get count() {
    return this.accounts.size;
  }
  // Find operations
  getById(id) {
    return this.accounts.get(id);
  }
  findBy(predicate) {
    return this.accounts.values().find(predicate);
  }
  filterBy(predicate) {
    return this.accounts.values().filter(predicate).toArray();
  }
  // Domain-specific methods
  getByName(name) {
    return this.findBy((account) => account.name === name);
  }
  getActiveAccounts() {
    return this.filterBy((account) => !account.closed);
  }
  getClosedAccounts() {
    return this.filterBy((account) => !!account.closed);
  }
  getTotalBalance() {
    return this.all.reduce((total, account) => total + (account.balance || 0), 0);
  }
  // CRUD operations
  addAccount(account) {
    this.accounts.set(account.id, account);
  }
  updateAccount(account) {
    this.accounts.set(account.id, account);
  }
  removeAccount(id) {
    const account = this.accounts.get(id);
    if (account) {
      this.accounts.delete(id);
      return account;
    }
    return void 0;
  }
  // API operations
  async saveAccount(account) {
    const accountForMutation = { ...account, closed: account.closed ?? void 0 };
    const result = await trpc().accountRoutes.save.mutate(accountForMutation);
    const accountWithDefaults = {
      ...result,
      transactions: [],
      // Will be loaded separately if needed
      balance: 0
      // Will be calculated from transactions
    };
    this.addAccount(accountWithDefaults);
    return accountWithDefaults;
  }
  async deleteAccount(id) {
    await trpc().accountRoutes.remove.mutate({ id });
    this.removeAccount(id);
  }
  async deleteAccounts(ids) {
    await Promise.all(ids.map((id) => this.deleteAccount(id)));
  }
  // Sorting methods
  setSorting(field, direction) {
    this.sortField = field;
    this.sortDirection = direction;
    this.saveSortPreferences();
  }
  toggleSortDirection() {
    this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    this.saveSortPreferences();
  }
  // Sort preference persistence
  loadSortPreferences() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("accounts-sort-preferences");
        if (saved) {
          const { field, direction } = JSON.parse(saved);
          if (this.isValidSortField(field) && this.isValidSortDirection(direction)) {
            this.sortField = field;
            this.sortDirection = direction;
          }
        }
      } catch (error) {
        console.warn("Failed to load sort preferences:", error);
      }
    }
  }
  saveSortPreferences() {
    if (typeof window !== "undefined") {
      try {
        const preferences = { field: this.sortField, direction: this.sortDirection };
        localStorage.setItem("accounts-sort-preferences", JSON.stringify(preferences));
      } catch (error) {
        console.warn("Failed to save sort preferences:", error);
      }
    }
  }
  isValidSortField(field) {
    return ["name", "balance", "dateOpened", "status", "createdAt"].includes(field);
  }
  isValidSortDirection(direction) {
    return ["asc", "desc"].includes(direction);
  }
  sortAccounts(accounts2, field, direction) {
    return [...accounts2].sort((a, b) => {
      let aValue;
      let bValue;
      switch (field) {
        case "name":
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
          break;
        case "balance":
          aValue = a.balance || 0;
          bValue = b.balance || 0;
          break;
        case "dateOpened":
          aValue = a.dateOpened ? new Date(a.dateOpened).getTime() : 0;
          bValue = b.dateOpened ? new Date(b.dateOpened).getTime() : 0;
          break;
        case "status":
          aValue = a.closed ? 1 : 0;
          bValue = b.closed ? 1 : 0;
          break;
        case "createdAt":
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        default:
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
      }
      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }
  getSortedActiveAccounts() {
    return this.sortAccounts(this.getActiveAccounts(), this.sortField, this.sortDirection);
  }
  getSortedClosedAccounts() {
    return this.sortAccounts(this.getClosedAccounts(), this.sortField, this.sortDirection);
  }
  // Utility methods
  has(id) {
    return this.accounts.has(id);
  }
  clear() {
    this.accounts.clear();
  }
}
const KEY$4 = Symbol("schedules");
class SchedulesState {
  schedules = new SvelteMap();
  constructor(schedules2) {
    if (schedules2) {
      this.init(schedules2);
    }
  }
  // Initialize/reinitialize the store with new data
  init(schedules2) {
    this.schedules.clear();
    schedules2.forEach((schedule) => this.schedules.set(schedule.id, schedule));
  }
  static get() {
    return getContext(KEY$4);
  }
  static set(schedules2) {
    return setContext(KEY$4, new SchedulesState(schedules2));
  }
  // Getters
  get all() {
    return this.schedules.values().toArray();
  }
  get count() {
    return this.schedules.size;
  }
  // Find operations
  getById(id) {
    return this.schedules.get(id);
  }
  findBy(predicate) {
    return this.schedules.values().find(predicate);
  }
  filterBy(predicate) {
    return this.schedules.values().filter(predicate).toArray();
  }
  // Domain-specific methods
  getByName(name) {
    return this.findBy((schedule) => schedule.name === name);
  }
  getActiveSchedules() {
    return this.filterBy((schedule) => schedule.status === "active");
  }
  getInactiveSchedules() {
    return this.filterBy((schedule) => schedule.status === "inactive");
  }
  // CRUD operations
  addSchedule(schedule) {
    this.schedules.set(schedule.id, schedule);
  }
  updateSchedule(schedule) {
    this.schedules.set(schedule.id, schedule);
  }
  removeSchedule(id) {
    const schedule = this.schedules.get(id);
    if (schedule) {
      this.schedules.delete(id);
      return schedule;
    }
    return void 0;
  }
  removeSchedules(ids) {
    const removed = [];
    ids.forEach((id) => {
      const schedule = this.schedules.get(id);
      if (schedule) {
        this.schedules.delete(id);
        removed.push(schedule);
      }
    });
    return removed;
  }
  // API operations
  async saveSchedule(schedule) {
    const result = await trpc().scheduleRoutes.save.mutate(schedule);
    this.addSchedule(result);
    return result;
  }
  async deleteSchedule(id) {
    await trpc().scheduleRoutes.remove.mutate({ id });
    this.removeSchedule(id);
  }
  async deleteSchedules(ids) {
    await Promise.all(ids.map((id) => this.deleteSchedule(id)));
  }
  // Utility methods
  has(id) {
    return this.schedules.has(id);
  }
  clear() {
    this.schedules.clear();
  }
}
const KEY$3 = Symbol("categories");
class CategoriesState {
  categories = new SvelteMap();
  constructor(categories2) {
    if (categories2) {
      this.init(categories2);
    }
  }
  // Initialize/reinitialize the store with new data
  init(categories2) {
    this.categories.clear();
    categories2.forEach((category) => this.categories.set(category.id, category));
  }
  // Context management
  static get() {
    return getContext(KEY$3);
  }
  static set(categories2) {
    return setContext(KEY$3, new CategoriesState(categories2));
  }
  // Getters
  get all() {
    return this.categories.values().toArray();
  }
  get count() {
    return this.categories.size;
  }
  // Find operations
  getById(id) {
    return this.categories.get(id);
  }
  findBy(predicate) {
    return this.categories.values().find(predicate);
  }
  filterBy(predicate) {
    return this.categories.values().filter(predicate).toArray();
  }
  // Domain-specific methods
  getByName(name) {
    return this.findBy((category) => category.name === name);
  }
  getActiveCategories() {
    return this.filterBy((category) => !category.deletedAt);
  }
  getParentCategories() {
    return this.filterBy((category) => !category.parentId);
  }
  getChildCategories(parentId) {
    return this.filterBy((category) => category.parentId === parentId);
  }
  // CRUD operations
  addCategory(category) {
    this.categories.set(category.id, category);
  }
  updateCategory(category) {
    this.categories.set(category.id, category);
  }
  removeCategory(id) {
    const category = this.categories.get(id);
    if (category) {
      this.categories.delete(id);
      return category;
    }
    return void 0;
  }
  removeCategories(ids) {
    const removed = [];
    ids.forEach((id) => {
      const category = this.categories.get(id);
      if (category) {
        this.categories.delete(id);
        removed.push(category);
      }
    });
    return removed;
  }
  // API operations
  async saveCategory(category) {
    const result = await trpc().categoriesRoutes.save.mutate(category);
    this.addCategory(result);
    return result;
  }
  async deleteCategory(id) {
    await trpc().categoriesRoutes.delete.mutate({ entities: [id] });
    this.removeCategory(id);
  }
  async deleteCategories(ids) {
    await trpc().categoriesRoutes.delete.mutate({ entities: ids });
    this.removeCategories(ids);
  }
  // Utility methods
  has(id) {
    return this.categories.has(id);
  }
  clear() {
    this.categories.clear();
  }
}
const KEY$2 = Symbol("payees");
class PayeesState {
  payees = new SvelteMap();
  constructor(payees2) {
    if (payees2) {
      this.init(payees2);
    }
  }
  // Initialize/reinitialize the store with new data
  init(payees2) {
    this.payees.clear();
    payees2.forEach((payee) => this.payees.set(payee.id, payee));
  }
  // Context management
  static get() {
    return getContext(KEY$2);
  }
  static set(payees2) {
    return setContext(KEY$2, new PayeesState(payees2));
  }
  // Getters
  get all() {
    return this.payees.values().toArray();
  }
  get count() {
    return this.payees.size;
  }
  // Find operations
  getById(id) {
    return this.payees.get(id);
  }
  findBy(predicate) {
    return this.payees.values().find(predicate);
  }
  filterBy(predicate) {
    return this.payees.values().filter(predicate).toArray();
  }
  // Domain-specific methods
  getByName(name) {
    return this.findBy((payee) => payee.name === name);
  }
  getActivePayees() {
    return this.filterBy((payee) => !payee.deletedAt);
  }
  // CRUD operations
  addPayee(payee) {
    this.payees.set(payee.id, payee);
  }
  updatePayee(payee) {
    this.payees.set(payee.id, payee);
  }
  removePayee(id) {
    const payee = this.payees.get(id);
    if (payee) {
      this.payees.delete(id);
      return payee;
    }
    return void 0;
  }
  removePayees(ids) {
    const removed = [];
    ids.forEach((id) => {
      const payee = this.payees.get(id);
      if (payee) {
        this.payees.delete(id);
        removed.push(payee);
      }
    });
    return removed;
  }
  // API operations
  async savePayee(payee) {
    const result = await trpc().payeeRoutes.save.mutate(payee);
    this.addPayee(result);
    return result;
  }
  async deletePayee(id) {
    await trpc().payeeRoutes.delete.mutate({ entities: [id] });
    this.removePayee(id);
  }
  async deletePayees(ids) {
    await trpc().payeeRoutes.delete.mutate({ entities: ids });
    this.removePayees(ids);
  }
  // Utility methods
  has(id) {
    return this.payees.has(id);
  }
  clear() {
    this.payees.clear();
  }
}
new $fb18d541ea1ad717$export$ad991b66133851cf("en-US", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});
new $fb18d541ea1ad717$export$ad991b66133851cf("en-US", {
  month: "long"
});
new $fb18d541ea1ad717$export$ad991b66133851cf("en-US", {
  month: "short",
  year: "numeric"
});
const dateFormatter = new $fb18d541ea1ad717$export$ad991b66133851cf("en-US", {
  dateStyle: "long"
});
new $fb18d541ea1ad717$export$ad991b66133851cf("en-US", {
  dateStyle: "short"
});
const suffixMap = {
  one: "st",
  two: "nd",
  few: "rd",
  other: "th"
};
const pr = new Intl.PluralRules("en-US", { type: "ordinal" });
const formatDate = (d) => {
  const monthAbbr = new Intl.DateTimeFormat("en-US", { month: "short" }).format(d);
  const monthWithDot = `${monthAbbr}.`;
  const day = d.getDate();
  const ordinalRule = pr.select(day);
  const dayWithSuffix = `${day}${suffixMap[ordinalRule] ?? "th"}`;
  const year = new Intl.DateTimeFormat("en-US", { year: "numeric" }).format(d);
  return `${monthWithDot} ${dayWithSuffix}, ${year}`;
};
function formatDayOfMonth(date) {
  const day = date.day;
  const ordinalRule = pr.select(day);
  return `${day}${suffixMap[ordinalRule] ?? "th"}`;
}
const currentViews = new Context("current_views");
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});
const transactionFormatter = {
  format: (transactions2) => {
    return transactions2?.map((transaction) => {
      return {
        ...transaction,
        date: $11d87f3f76e88657$export$93522d1a439f3617($fae977aafc393c5c$export$6b862160d295c8e(transaction.date))
      };
    });
  }
};
const KEY$1 = Symbol("current_account");
class CurrentAccountState {
  account;
  #balance = derived(() => () => {
    const balance = this.account?.balance ?? 0;
    return currencyFormatter.format(isNaN(balance) ? 0 : balance);
  });
  get balance() {
    return this.#balance();
  }
  set balance($$value) {
    return this.#balance($$value);
  }
  #transactions = derived(() => this.account?.transactions);
  get transactions() {
    return this.#transactions();
  }
  set transactions($$value) {
    return this.#transactions($$value);
  }
  #formatted = derived(() => transactionFormatter.format(this.transactions) ?? []);
  get formatted() {
    return this.#formatted();
  }
  set formatted($$value) {
    return this.#formatted($$value);
  }
  #categories = derived(() => {
    return this.formatted?.filter(Boolean).map((transaction) => transaction.category).filter((category) => category !== null) || [];
  });
  get categories() {
    return this.#categories();
  }
  set categories($$value) {
    return this.#categories($$value);
  }
  #payees = derived(() => {
    return this.formatted?.filter(Boolean).map((transaction) => transaction.payee).filter((payee) => payee !== null) || [];
  });
  get payees() {
    return this.#payees();
  }
  set payees($$value) {
    return this.#payees($$value);
  }
  constructor(account) {
    if (account) {
      this.account = account;
    }
    setContext(KEY$1, this);
    return this;
  }
  static get() {
    return getContext(KEY$1);
  }
  get id() {
    return this.account.id;
  }
  get name() {
    return this.account.name;
  }
  get notes() {
    return this.account.notes;
  }
  addTransaction(transaction) {
    this.account.balance += transaction.amount;
    transaction.balance = this.account.balance;
    this.transactions?.push(transaction);
  }
  getTransaction(id) {
    return this.formatted?.find((transaction) => transaction.id === id);
  }
  getRawTransaction(id) {
    const idx = this.transactions?.findIndex((transaction) => transaction.id === id);
    return [idx, this.transactions[idx]];
  }
  updateTransaction = async (id, columnId, newValue) => {
    const new_data = { [columnId]: newValue };
    let [idx, original] = this.getRawTransaction(id);
    if (columnId === "amount") {
      const amountDifference = newValue - original?.amount;
      this.account.balance += amountDifference;
      this.account.transactions.filter((_, index2) => index2 >= idx).forEach((transaction) => {
        transaction.balance = (transaction.balance ?? 0) + amountDifference;
      });
    }
    const updatedData = Object.assign({}, original, new_data);
    await trpc().transactionRoutes.save.mutate(updatedData);
    this.transactions[idx] = updatedData;
  };
  async deleteTransactions(transactions2, cb) {
    await trpc().transactionRoutes.delete.mutate({ entities: transactions2, accountId: this.id });
    const [kept, removed] = without(this.transactions ?? [], (transaction) => transactions2.includes(transaction.id));
    this.account.transactions = kept;
    this.account.balance = kept.length > 0 ? kept.map((transaction) => transaction.amount).reduce((prev, curr) => prev + curr) : 0;
    if (cb) {
      cb(removed);
    }
  }
  async deleteTransaction(transaction) {
    return this.deleteTransactions([transaction]);
  }
}
const dayOptions = Array.from({ length: 31 }, (_, i) => {
  const day = i + 1;
  const suffix = getOrdinalSuffix(day);
  return { value: day, label: `${day}${suffix}` };
});
const lastDayOption = { value: 32, label: "last day" };
const weekdayOptions = Array.from({ length: 7 }, (_, i) => {
  const value = i;
  const label = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(1970, 0, i + 4)).replace(/\w/, (c) => c.toUpperCase());
  return { value, label };
});
const weekOptions = [
  { value: 1, label: "first" },
  { value: 2, label: "second" },
  { value: 3, label: "third" },
  { value: 4, label: "fourth" },
  { value: 5, label: "last" }
];
Array.from({ length: 12 }, (_, i) => {
  const value = i + 1;
  const label = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(1970, i, 1));
  return { value, label };
});
var MoveToWeekday = /* @__PURE__ */ ((MoveToWeekday2) => {
  MoveToWeekday2["None"] = "none";
  MoveToWeekday2["NextWeekday"] = "next_weekday";
  MoveToWeekday2["PreviousWeekday"] = "previous_weekday";
  return MoveToWeekday2;
})(MoveToWeekday || {});
const brand = (value) => value;
const isNonEmptyString = (value) => value.length > 0;
const isPositiveNumber = (value) => value > 0 && Number.isFinite(value);
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isISODateString = (value) => !isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
const isCurrencyAmount = (value) => Number.isFinite(value) && Math.abs(value) < Number.MAX_SAFE_INTEGER;
const getEnvironmentVariable = (key) => {
  const value = process.env[key];
  return value;
};
const getRequiredEnvironmentVariable = (key) => {
  const value = getEnvironmentVariable(key);
  if (value === void 0) {
    throw new Error(`Required environment variable ${String(key)} is not set`);
  }
  return value;
};
class TypeValidator {
  /**
   * Validate and brand a non-empty string
   */
  static validateNonEmptyString(value) {
    if (typeof value === "string" && isNonEmptyString(value)) {
      return value;
    }
    return null;
  }
  /**
   * Validate and brand a positive number
   */
  static validatePositiveNumber(value) {
    if (typeof value === "number" && isPositiveNumber(value)) {
      return value;
    }
    return null;
  }
  /**
   * Validate and brand an email string
   */
  static validateEmail(value) {
    if (typeof value === "string" && isValidEmail(value)) {
      return value;
    }
    return null;
  }
  /**
   * Validate and brand an ISO date string
   */
  static validateISODateString(value) {
    if (typeof value === "string" && isISODateString(value)) {
      return value;
    }
    return null;
  }
  /**
   * Validate and brand a currency amount
   */
  static validateCurrencyAmount(value) {
    if (typeof value === "number" && isCurrencyAmount(value)) {
      return value;
    }
    return null;
  }
  /**
   * Validate page size with specific constraints
   */
  static validatePageSize(value) {
    const positiveNumber = this.validatePositiveNumber(value);
    if (positiveNumber && positiveNumber <= 100) {
      return positiveNumber;
    }
    return null;
  }
  /**
   * Comprehensive object validation with detailed error reporting
   */
  static validateObject(value, schema2) {
    const errors = {};
    let isValid = true;
    if (typeof value !== "object" || value === null) {
      return {
        data: {},
        validation: {
          isValid: false,
          errors: { root: [brand("Input must be an object")] }
        }
      };
    }
    const data = value;
    const validatedData = {};
    for (const [field, validator2] of Object.entries(schema2)) {
      if (!validator2) continue;
      const fieldValue = data[field];
      const fieldErrors = [];
      try {
        const result = validator2(fieldValue);
        if (result.isValid) {
          validatedData[field] = fieldValue;
        } else {
          const errorValues = Object.values(result.errors).flat();
          fieldErrors.push(...errorValues);
          isValid = false;
        }
      } catch (error) {
        fieldErrors.push(brand(`Validation error: ${error}`));
        isValid = false;
      }
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    }
    return {
      data: validatedData,
      validation: {
        isValid,
        errors
      }
    };
  }
}
class ConfigManager {
  static instance = null;
  config = null;
  constructor() {
  }
  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!this.instance) {
      this.instance = new ConfigManager();
    }
    return this.instance;
  }
  /**
   * Initialize configuration from environment variables
   */
  initialize() {
    if (this.config) {
      return this.config;
    }
    try {
      const nodeEnv = getRequiredEnvironmentVariable("NODE_ENV");
      const databaseUrl = getRequiredEnvironmentVariable("DATABASE_URL");
      const apiBaseUrl = getEnvironmentVariable("API_BASE_URL") || (nodeEnv === "development" ? "http://localhost:5173" : "");
      if (!apiBaseUrl) {
        throw new Error("API_BASE_URL must be set for production");
      }
      const apiTimeout = this.parsePositiveNumber(
        process.env["API_TIMEOUT"],
        5e3,
        // Default 5 seconds
        "API_TIMEOUT"
      );
      const apiRetryAttempts = this.parsePositiveNumber(
        process.env["API_RETRY_ATTEMPTS"],
        3,
        // Default 3 attempts
        "API_RETRY_ATTEMPTS"
      );
      const uiPageSize = this.parsePageSize(
        process.env["UI_PAGE_SIZE"],
        20,
        // Default 20 items per page
        "UI_PAGE_SIZE"
      );
      const uiDebounceMs = this.parsePositiveNumber(
        process.env["UI_DEBOUNCE_MS"],
        300,
        // Default 300ms debounce
        "UI_DEBOUNCE_MS"
      );
      const uiAnimationDuration = this.parsePositiveNumber(
        process.env["UI_ANIMATION_DURATION"],
        200,
        // Default 200ms animations
        "UI_ANIMATION_DURATION"
      );
      const cacheDefaultTtl = this.parsePositiveNumber(
        process.env["CACHE_DEFAULT_TTL"],
        3e5,
        // Default 5 minutes
        "CACHE_DEFAULT_TTL"
      );
      const cacheMaxSize = this.parsePositiveNumber(
        process.env["CACHE_MAX_SIZE"],
        100,
        // Default 100 entries
        "CACHE_MAX_SIZE"
      );
      const cacheEnabled = this.parseBoolean(
        process.env["CACHE_ENABLED"],
        true,
        // Default enabled
        "CACHE_ENABLED"
      );
      this.config = {
        api: {
          baseUrl: TypeValidator.validateNonEmptyString(apiBaseUrl),
          timeout: apiTimeout,
          retryAttempts: apiRetryAttempts
        },
        ui: {
          pageSize: uiPageSize,
          debounceMs: uiDebounceMs,
          animationDuration: uiAnimationDuration
        },
        cache: {
          defaultTtl: cacheDefaultTtl,
          maxSize: cacheMaxSize,
          enabled: cacheEnabled
        }
      };
      this.validateConfig(this.config);
      return this.config;
    } catch (error) {
      throw new Error(`Configuration initialization failed: ${error}`);
    }
  }
  /**
   * Get current configuration (initialize if needed)
   */
  getConfig() {
    return this.config || this.initialize();
  }
  /**
   * Get specific configuration section
   */
  getApiConfig() {
    return this.getConfig().api;
  }
  getUIConfig() {
    return this.getConfig().ui;
  }
  getCacheConfig() {
    return this.getConfig().cache;
  }
  /**
   * Update configuration at runtime (for testing)
   */
  updateConfig(updates) {
    if (!this.config) {
      this.initialize();
    }
    this.config = {
      ...this.config,
      ...updates,
      api: { ...this.config.api, ...updates.api },
      ui: { ...this.config.ui, ...updates.ui },
      cache: { ...this.config.cache, ...updates.cache }
    };
    this.validateConfig(this.config);
  }
  /**
   * Reset configuration (for testing)
   */
  reset() {
    this.config = null;
  }
  // Private helper methods
  parsePositiveNumber(value, defaultValue, name) {
    if (!value) {
      const validated2 = TypeValidator.validatePositiveNumber(defaultValue);
      if (!validated2) {
        throw new Error(`Default value for ${name} is not a positive number`);
      }
      return validated2;
    }
    const parsed = parseInt(value, 10);
    const validated = TypeValidator.validatePositiveNumber(parsed);
    if (!validated) {
      throw new Error(`Environment variable ${name} must be a positive number, got: ${value}`);
    }
    return validated;
  }
  parsePageSize(value, defaultValue, name) {
    if (!value) {
      const validated2 = TypeValidator.validatePageSize(defaultValue);
      if (!validated2) {
        throw new Error(`Default value for ${name} is not a valid page size`);
      }
      return validated2;
    }
    const parsed = parseInt(value, 10);
    const validated = TypeValidator.validatePageSize(parsed);
    if (!validated) {
      throw new Error(
        `Environment variable ${name} must be a positive number ≤ 100, got: ${value}`
      );
    }
    return validated;
  }
  parseBoolean(value, defaultValue, name) {
    if (!value) {
      return defaultValue;
    }
    const lowerValue = value.toLowerCase();
    if (lowerValue === "true" || lowerValue === "1" || lowerValue === "yes") {
      return true;
    }
    if (lowerValue === "false" || lowerValue === "0" || lowerValue === "no") {
      return false;
    }
    throw new Error(`Environment variable ${name} must be a boolean value, got: ${value}`);
  }
  validateConfig(config2) {
    if (!TypeValidator.validateNonEmptyString(config2.api.baseUrl)) {
      throw new Error("API baseUrl must be a non-empty string");
    }
    if (!TypeValidator.validatePositiveNumber(config2.api.timeout)) {
      throw new Error("API timeout must be a positive number");
    }
    if (!TypeValidator.validatePositiveNumber(config2.api.retryAttempts)) {
      throw new Error("API retryAttempts must be a positive number");
    }
    if (!TypeValidator.validatePageSize(config2.ui.pageSize)) {
      throw new Error("UI pageSize must be a positive number ≤ 100");
    }
    if (!TypeValidator.validatePositiveNumber(config2.ui.debounceMs)) {
      throw new Error("UI debounceMs must be a positive number");
    }
    if (!TypeValidator.validatePositiveNumber(config2.ui.animationDuration)) {
      throw new Error("UI animationDuration must be a positive number");
    }
    if (!TypeValidator.validatePositiveNumber(config2.cache.defaultTtl)) {
      throw new Error("Cache defaultTtl must be a positive number");
    }
    if (!TypeValidator.validatePositiveNumber(config2.cache.maxSize)) {
      throw new Error("Cache maxSize must be a positive number");
    }
    if (typeof config2.cache.enabled !== "boolean") {
      throw new Error("Cache enabled must be a boolean");
    }
  }
}
ConfigManager.getInstance();
const MAX_SAFETY_LIMIT = DATABASE_LIMITS.MAX_SAFETY_LIMIT;
function generateDatesWithConstraints(generator, options) {
  const { start, end, limit } = options;
  const dates = [];
  let totalGenerated = 0;
  let truncated = false;
  const effectiveLimit = Math.min(limit ?? MAX_SAFETY_LIMIT, MAX_SAFETY_LIMIT);
  while (totalGenerated < effectiveLimit) {
    const nextDate = generator();
    if (!nextDate) break;
    if (end && nextDate > end) break;
    if (nextDate.compare(start) >= 0) {
      dates.push(nextDate);
      if (!end && dates.length >= effectiveLimit) {
        truncated = true;
        break;
      }
    }
    totalGenerated++;
    if (totalGenerated > MAX_SAFETY_LIMIT * 2) {
      break;
    }
  }
  return { dates, truncated, totalGenerated };
}
function nextDaily(start, end, interval, limit) {
  if (interval <= 0) return [];
  let cursor = start;
  const options = { start, end, limit };
  const generator = () => {
    const current = cursor;
    cursor = cursor.add({ days: interval });
    return current;
  };
  return generateDatesWithConstraints(generator, options).dates;
}
function nextWeekly(start, end, interval, weekDays, limit) {
  if (interval <= 0) return [];
  const normalizedWeekDays = weekDays.length > 0 ? weekDays : [getDayOfWeek(start, timezone)];
  let weekCursor = start;
  let dayIndex = 0;
  let isFirstWeek = true;
  const options = { start, end, limit };
  const generator = () => {
    if (dayIndex >= normalizedWeekDays.length) {
      if (!isFirstWeek) {
        weekCursor = weekCursor.add({ weeks: interval });
      } else {
        isFirstWeek = false;
      }
      dayIndex = 0;
    }
    if (dayIndex < normalizedWeekDays.length) {
      const targetWeekday = normalizedWeekDays[dayIndex];
      let nextDate;
      if (isFirstWeek || dayIndex === 0) {
        nextDate = getNextWeekdayFlexible(weekCursor, targetWeekday, true);
        if (isFirstWeek && nextDate.compare(start) > 0) {
          const weekStart = $14e0f24ef4ac5c92$export$42c81a444fbfb5d4(weekCursor, "en-us", "sun");
          const candidateDate = getNextWeekdayFlexible(weekStart, targetWeekday, true);
          if (candidateDate.compare(nextDate) <= 0) {
            nextDate = candidateDate;
          }
        }
      } else {
        nextDate = getNextWeekdayFlexible(weekCursor, targetWeekday, true);
      }
      dayIndex++;
      return nextDate;
    }
    return null;
  };
  return generateDatesWithConstraints(generator, options).dates;
}
function nextMonthly(start, end, interval, days, weeks, weekDays, limit) {
  if (interval <= 0) return [];
  let cursor = start;
  let weekIndex = 0;
  let dayIndex = 0;
  let monthDayIndex = 0;
  const options = { start, end, limit };
  const normalizedDays = days === null ? null : Array.isArray(days) ? days : [days];
  const generator = () => {
    if (normalizedDays && normalizedDays.length > 0) {
      if (monthDayIndex >= normalizedDays.length) {
        cursor = cursor.add({ months: interval });
        monthDayIndex = 0;
      }
      if (monthDayIndex < normalizedDays.length) {
        const targetDay = normalizedDays[monthDayIndex];
        monthDayIndex++;
        try {
          return cursor.set({ day: Math.min(targetDay, getDaysInMonth(cursor)) });
        } catch {
          return null;
        }
      }
    }
    if (weeks.length > 0 && weekDays.length > 0) {
      if (weekIndex >= weeks.length) {
        cursor = cursor.add({ months: interval });
        weekIndex = 0;
        dayIndex = 0;
      }
      if (dayIndex >= weekDays.length) {
        weekIndex++;
        dayIndex = 0;
        return generator();
      }
      if (weekIndex < weeks.length && dayIndex < weekDays.length) {
        const week = weeks[weekIndex];
        const weekDay = weekDays[dayIndex];
        const candidateDate = getNthWeekdayOfMonth(cursor.year, cursor.month, week, weekDay);
        dayIndex++;
        return candidateDate;
      }
    }
    try {
      const nextDate = cursor.set({ day: start.day });
      cursor = cursor.add({ months: interval });
      return nextDate;
    } catch {
      cursor = cursor.add({ months: interval });
      return null;
    }
  };
  return generateDatesWithConstraints(generator, options).dates.sort((a, b) => a.compare(b));
}
function nextYearly(actualStart, start, end, interval, limit) {
  if (interval <= 0) return [];
  let cursor = actualStart;
  while (cursor < start) {
    cursor = getNextYearlyDate(cursor, actualStart, interval);
  }
  const options = { start, end, limit };
  const generator = () => {
    const current = cursor;
    cursor = getNextYearlyDate(cursor, actualStart, interval);
    return current;
  };
  return generateDatesWithConstraints(generator, options).dates;
}
function getNextYearlyDate(current, template, interval) {
  let next = current.add({ years: interval });
  try {
    next = next.set({ month: template.month, day: template.day });
  } catch {
    const lastDayOfMonth = new $35ea8db9cb2ccb90$export$99faa760c7908e4f(next.year, template.month, 1).add({ months: 1 }).subtract({ days: 1 });
    next = lastDayOfMonth;
  }
  return next;
}
function getDaysInMonth(date) {
  return date.set({ day: 1 }).add({ months: 1 }).subtract({ days: 1 }).day;
}
const DEFAULT_STATE = {
  start: currentDate,
  end: currentDate.add({ months: 1 }),
  end_type: null,
  frequency: "daily",
  interval: 1,
  days: null,
  weeks: [],
  weeks_days: [],
  months: [],
  limit: 0,
  move_weekends: MoveToWeekday.None,
  move_holidays: MoveToWeekday.None,
  specific_dates: [],
  on: false,
  on_type: "day"
};
({
  days: [...dayOptions, lastDayOption]
});
class RepeatingDateInput {
  /** The raw data model – `$state` makes it reactive */
  value = DEFAULT_STATE;
  /** The "placeholder" – the date currently displayed in the picker */
  placeholder = currentDate;
  #dateConstraints = derived(
    /* ------------------------------------------------------------------ */
    /* 1️⃣  Computed properties for better organization                     */
    /* ------------------------------------------------------------------ */
    /**
     * Determine which constraint to use based on end_type
     */
    () => {
      if (this.value.end_type === "until" && this.value.end) {
        return {
          end: this.value.end,
          limit: 1e3,
          // Large number, won't be used
          hasEndDate: true
        };
      } else if (this.value.end_type === "limit" && this.value.limit) {
        return { end: null, limit: this.value.limit, hasEndDate: true };
      }
      return { end: null, limit: this.value.limit || 50, hasEndDate: false };
    }
  );
  get dateConstraints() {
    return this.#dateConstraints();
  }
  set dateConstraints($$value) {
    return this.#dateConstraints($$value);
  }
  #calendarBounds = derived(() => {
    const start = this.value.start;
    if (!start) return null;
    if (this.start.month > this.placeholder.month && this.start.year === this.placeholder.year) {
      return null;
    }
    let calendarStart = sameMonthAndYear(this.start, this.placeholder) ? this.start : this.placeholder;
    const firstOfMonth = this.placeholder.set({ day: 1 });
    const firstWeekStart = $14e0f24ef4ac5c92$export$42c81a444fbfb5d4(firstOfMonth, "en-us", "sun");
    const lastOfMonth = this.placeholder.set({ day: 0 }).add({ months: 1 });
    const lastWeekEnd = $14e0f24ef4ac5c92$export$ef8b6d9133084f4e(lastOfMonth, "en-us", "sun");
    const shouldExpandBackwards = this.start.compare(firstWeekStart) < 0;
    const expandedStart = shouldExpandBackwards && calendarStart.compare(firstWeekStart) > 0 ? firstWeekStart : calendarStart;
    const bounds = { start: expandedStart, end: lastWeekEnd, originalStart: start };
    return bounds;
  });
  get calendarBounds() {
    return this.#calendarBounds();
  }
  set calendarBounds($$value) {
    return this.#calendarBounds($$value);
  }
  #upcoming = derived(() => {
    const bounds = this.calendarBounds;
    if (!bounds) return [];
    const constraints = this.dateConstraints;
    const frequency = this.value.frequency || "daily";
    const interval = this.value.interval || 1;
    try {
      const upcomingDates = this.generateDatesForFrequency(frequency, bounds, constraints, interval);
      const specificDates = this.value.specific_dates || [];
      upcomingDates.push(...specificDates);
      const adjustedDates = this.applyWeekendAdjustments(upcomingDates);
      return this.sortAndDeduplicateDates(adjustedDates);
    } catch (error) {
      console.warn("Error generating upcoming dates:", error);
      return [];
    }
  });
  get upcoming() {
    return this.#upcoming();
  }
  set upcoming($$value) {
    return this.#upcoming($$value);
  }
  #formatted = derived(() => {
    return this.generateFormattedString();
  });
  get formatted() {
    return this.#formatted();
  }
  set formatted($$value) {
    return this.#formatted($$value);
  }
  generateDatesForFrequency(frequency, bounds, constraints, interval) {
    const config = {
      calendarStart: bounds.start,
      calendarEnd: constraints.end,
      effectiveLimit: constraints.limit
    };
    switch (frequency) {
      case "daily":
        return this.generateDailyDates(config, interval, bounds);
      case "weekly":
        return this.generateWeeklyDates(config, interval, bounds);
      case "monthly":
        return this.generateMonthlyDates(config, interval, bounds);
      case "yearly":
        return this.generateYearlyDates(config, interval, bounds);
      default:
        return [];
    }
  }
  /**
   * Generate daily recurring dates
   */
  generateDailyDates(config, interval, bounds) {
    const calendarStart = bounds.start;
    const calendarEnd = config.calendarEnd || bounds.end;
    return nextDaily(calendarStart, calendarEnd, interval, config.effectiveLimit);
  }
  /**
   * Generate weekly recurring dates
   */
  generateWeeklyDates(config, interval, bounds) {
    const weekDays = this.value.week_days ?? [];
    let calendarStart = bounds.start;
    const calendarEnd = config.calendarEnd || bounds.end;
    if (weekDays.length > 0) {
      calendarStart = calendarStart < bounds.originalStart ? bounds.originalStart : calendarStart;
    }
    return nextWeekly(calendarStart, calendarEnd, interval, weekDays, config.effectiveLimit);
  }
  /**
   * Generate monthly recurring dates
   */
  generateMonthlyDates(config, interval, bounds) {
    const calendarStart = bounds.originalStart < bounds.start ? bounds.originalStart : bounds.start;
    const calendarEnd = config.calendarEnd || bounds.end;
    const onDay = this.value.on && this.value.on_type === "day" && this.value.days && this.value.days > 0;
    const onThe = this.value.on && this.value.on_type === "the" && this.value.weeks?.length && this.value.weeks_days?.length;
    if (onDay) {
      return nextMonthly(calendarStart, calendarEnd, interval, this.value.days ?? null, [], [], config.effectiveLimit);
    }
    if (onThe) {
      return nextMonthly(calendarStart, calendarEnd, interval, null, this.value.weeks || [], this.value.weeks_days || [], config.effectiveLimit);
    }
    return nextMonthly(calendarStart, calendarEnd, interval, bounds.originalStart.day, [], [], config.effectiveLimit);
  }
  /**
   * Generate yearly recurring dates
   */
  generateYearlyDates(config, interval, bounds) {
    const calendarStart = bounds.start;
    const calendarEnd = config.calendarEnd || bounds.end;
    return nextYearly(bounds.originalStart, calendarStart, calendarEnd, interval, config.effectiveLimit);
  }
  /**
   * Check if a date falls on a weekend (Saturday or Sunday)
   */
  isWeekend(date) {
    const dayOfWeek = date.toDate(timezone).getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }
  /**
   * Adjust a date if it falls on a weekend according to the move_weekends setting
   */
  adjustForWeekend(date) {
    if (!this.isWeekend(date) || this.value.move_weekends === MoveToWeekday.None) {
      return date;
    }
    const dayOfWeek = date.toDate(timezone).getDay();
    if (this.value.move_weekends === MoveToWeekday.NextWeekday) {
      if (dayOfWeek === 0) {
        return date.add({ days: 1 });
      } else if (dayOfWeek === 6) {
        return date.add({ days: 2 });
      }
    } else if (this.value.move_weekends === MoveToWeekday.PreviousWeekday) {
      if (dayOfWeek === 0) {
        return date.subtract({ days: 2 });
      } else if (dayOfWeek === 6) {
        return date.subtract({ days: 1 });
      }
    }
    return date;
  }
  /**
   * Apply weekend adjustments to an array of dates
   */
  applyWeekendAdjustments(dates) {
    return dates.map((date) => this.adjustForWeekend(date));
  }
  /**
   * Sort dates and remove duplicates
   */
  sortAndDeduplicateDates(dates) {
    const uniqueDatesMap = /* @__PURE__ */ new Map();
    for (const date of dates) {
      const key = date.toString();
      if (!uniqueDatesMap.has(key)) {
        uniqueDatesMap.set(key, date);
      }
    }
    return Array.from(uniqueDatesMap.values()).sort((a, b) => a.compare(b));
  }
  /**
   * Generate human-readable formatted string
   */
  generateFormattedString() {
    const {
      frequency,
      interval = 1,
      start = currentDate,
      week_days,
      weeks,
      weeks_days,
      days
    } = this.value;
    if (!start) return "";
    const listFmt = new Intl.ListFormat("en-US", { style: "long", type: "conjunction" });
    const suffix = this.generateSuffix();
    const startFormatted = formatDate(start.toDate(timezone));
    switch (frequency) {
      case "daily":
        return this.formatDailyString(interval, startFormatted, suffix);
      case "weekly":
        return this.formatWeeklyString(interval, week_days, listFmt, startFormatted, suffix);
      case "monthly":
        return this.formatMonthlyString(interval, days ?? null, weeks, weeks_days, listFmt, start, startFormatted, suffix);
      case "yearly":
        return this.formatYearlyString(interval, startFormatted, suffix);
      default:
        return "";
    }
  }
  /**
   * Generate suffix for formatted string (until date or limit)
   */
  generateSuffix() {
    const parts = [];
    if (this.value.end_type === "limit") {
      parts.push(`for ${this.value.limit} times`);
    }
    if (this.value.end_type === "until" && this.value.end) {
      parts.push(`until ${formatDate(this.value.end.toDate(timezone))}`);
    }
    if (this.value.move_weekends === MoveToWeekday.NextWeekday) {
      parts.push("(weekends moved to Monday)");
    } else if (this.value.move_weekends === MoveToWeekday.PreviousWeekday) {
      parts.push("(weekends moved to Friday)");
    }
    return parts.join(" ");
  }
  /**
   * Format daily recurrence string
   */
  formatDailyString(interval, startFormatted, suffix) {
    const prefix = interval === 1 ? "Repeats daily" : `Repeats every ${interval} day${interval > 1 ? "s" : ""}`;
    return `${prefix} starting from ${startFormatted} ${suffix}`.trim();
  }
  /**
   * Format weekly recurrence string
   */
  formatWeeklyString(interval, weekDays, listFmt, startFormatted, suffix) {
    const prefix = interval === 1 ? "Repeats weekly" : `Repeats every ${interval} week${interval > 1 ? "s" : ""}`;
    const dayList = weekDays?.length ? ` on ${listFmt.format(weekDays.map((d) => weekdayOptions[d]?.label ?? ""))}` : "";
    return `${prefix}${dayList} starting from ${startFormatted} ${suffix}`.trim();
  }
  /**
   * Format monthly recurrence string
   */
  formatMonthlyString(interval, days, weeks, weeksDays, listFmt, start, startFormatted, suffix) {
    const prefix = interval === 1 ? "Repeats monthly" : `Repeats every ${interval} month${interval > 1 ? "s" : ""}`;
    if (this.value.on && this.value.on_type === "day" && days) {
      return `${prefix} on the ${dayOptions[days - 1]?.label ?? ""} day starting from ${startFormatted} ${suffix}`.trim();
    }
    if (this.value.on && this.value.on_type === "the" && weeks?.length && weeksDays?.length) {
      const weekPart = weeks.length === 1 ? weekOptions[weeks[0] - 1]?.label ?? "" : listFmt.format(weeks.map((w) => weekOptions[w - 1]?.label ?? ""));
      const dayPart = listFmt.format((weeksDays || []).map((d) => weekdayOptions[d]?.label ?? ""));
      return `${prefix} on the ${weekPart} ${dayPart} starting from ${startFormatted} ${suffix}`.trim();
    }
    return `${prefix} on the ${formatDayOfMonth(start)} starting from ${startFormatted} ${suffix}`.trim();
  }
  /**
   * Format yearly recurrence string
   */
  formatYearlyString(interval, startFormatted, suffix) {
    const prefix = interval === 1 ? "Repeats yearly" : `Repeats every ${interval} year${interval > 1 ? "s" : ""}`;
    return `${prefix} starting from ${startFormatted} ${suffix}`.trim();
  }
  /* ------------------------------------------------------------------ */
  /* 5️⃣  Public API methods                                            */
  /* ------------------------------------------------------------------ */
  /**
   * Reset to default state
   */
  reset() {
    this.value = structuredClone(DEFAULT_STATE);
    this.placeholder = currentDate;
  }
  /**
   * Validate current configuration
   */
  validate() {
    const errors = [];
    if (!this.value.start) {
      errors.push("Start date is required");
    }
    if (!this.value.interval || this.value.interval <= 0) {
      errors.push("Interval must be greater than 0");
    }
    if (this.value.end_type === "until" && !this.value.end) {
      errors.push("End date is required when using 'until' option");
    }
    if (this.value.end_type === "limit" && (this.value.limit === void 0 || this.value.limit === null || this.value.limit <= 0)) {
      errors.push("Limit must be greater than 0 when using limit option");
    }
    if (this.value.end && this.value.start && this.value.end.compare(this.value.start) <= 0) {
      errors.push("End date must be after start date");
    }
    return { valid: errors.length === 0, errors };
  }
  /* ------------------------------------------------------------------ */
  /* 6️⃣  Setters / getters – wrapping the `$state` object              */
  /* ------------------------------------------------------------------ */
  /* -----------  Setters (mutate the raw object)  ----------- */
  set on(value) {
    this.value.on = value;
  }
  set on_type(value) {
    this.value.on_type = value;
  }
  set week_days(value) {
    this.value.week_days = value;
  }
  set weeks(value) {
    this.value.weeks = value;
  }
  set weeks_days(value) {
    this.value.weeks_days = value;
  }
  set days(value) {
    this.value.days = value;
  }
  set interval(value) {
    this.value.interval = Math.max(1, value);
  }
  set frequency(value) {
    this.value.frequency = value;
  }
  set start(value) {
    this.value.start = value;
  }
  set end(value) {
    this.value.end = value === null ? void 0 : value;
  }
  set end_type(value) {
    this.value.end_type = value;
  }
  set limit(value) {
    this.value.limit = Math.max(0, value);
  }
  set specific_dates(value) {
    this.value.specific_dates = value;
  }
  set months(value) {
    this.value.months = value;
  }
  set moveWeekends(value) {
    this.value.move_weekends = value;
  }
  set moveHolidays(value) {
    this.value.move_holidays = value;
  }
  /* -----------  Getters (just expose the underlying property)  ----------- */
  get start() {
    return this.value.start ?? currentDate;
  }
  get end() {
    return this.value.end ?? currentDate.add({ months: 1 });
  }
  get end_type() {
    return this.value.end_type;
  }
  get frequency() {
    return this.value.frequency ?? "daily";
  }
  get interval() {
    return this.value.interval ?? 1;
  }
  get week_days() {
    return this.value.week_days ?? [];
  }
  get weeks() {
    return this.value.weeks ?? [];
  }
  get weeks_days() {
    return this.value.weeks_days ?? [];
  }
  get days() {
    return this.value.days ?? null;
  }
  get months() {
    return this.value.months ?? [];
  }
  get limit() {
    return this.value.limit ?? 0;
  }
  get moveWeekends() {
    return this.value.move_weekends ?? MoveToWeekday.None;
  }
  get moveHolidays() {
    return this.value.move_holidays ?? MoveToWeekday.None;
  }
  get specific_dates() {
    return this.value.specific_dates ?? [];
  }
  get on() {
    return this.value.on ?? false;
  }
  get on_type() {
    return this.value.on_type ?? "day";
  }
}
const KEY = Symbol("date_filters");
class DateFiltersState {
  dateFilters = [];
  constructor(date_filters) {
    if (date_filters) {
      this.init(date_filters);
    }
  }
  // Initialize/reinitialize the store with new data
  init(dateFilters) {
    this.dateFilters = [...dateFilters];
  }
  // Context management
  static get() {
    return getContext(KEY);
  }
  static set(dateFilters) {
    return setContext(KEY, new DateFiltersState(dateFilters));
  }
  // Getters
  get all() {
    return [...this.dateFilters];
  }
  get count() {
    return this.dateFilters.length;
  }
  // Find operations
  getByValue(value) {
    return this.dateFilters.find((filter) => filter.value === value);
  }
  getByLabel(label) {
    return this.dateFilters.find((filter) => filter.label === label);
  }
  findBy(predicate) {
    return this.dateFilters.find(predicate);
  }
  filterBy(predicate) {
    return this.dateFilters.filter(predicate);
  }
  // CRUD operations
  add(dateFilter) {
    const exists = this.dateFilters.some((filter) => filter.value === dateFilter.value);
    if (!exists) {
      this.dateFilters.push(dateFilter);
    }
  }
  removeByValue(value) {
    const index2 = this.dateFilters.findIndex((filter) => filter.value === value);
    if (index2 !== -1) {
      return this.dateFilters.splice(index2, 1)[0];
    }
    return void 0;
  }
  remove(dateFilter) {
    return this.removeByValue(dateFilter.value);
  }
  update(dateFilter) {
    const index2 = this.dateFilters.findIndex((filter) => filter.value === dateFilter.value);
    if (index2 !== -1) {
      this.dateFilters[index2] = dateFilter;
      return true;
    } else {
      this.add(dateFilter);
      return false;
    }
  }
  // Domain-specific methods
  getRecentFilters() {
    return this.filterBy((filter) => filter.value.includes("day") || filter.value.includes("week"));
  }
  getMonthlyFilters() {
    return this.filterBy((filter) => filter.value.includes("month"));
  }
  getYearlyFilters() {
    return this.filterBy((filter) => filter.value.includes("year"));
  }
  // Sort filters by recency (most recent first)
  sortByRecency() {
    this.dateFilters.sort((a, b) => {
      const getOrder = (value) => {
        if (value.includes("day")) return 1;
        if (value.includes("week")) return 2;
        if (value.includes("month")) return 3;
        if (value.includes("year")) return 4;
        return 5;
      };
      const orderA = getOrder(a.value);
      const orderB = getOrder(b.value);
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      const numA = parseInt(a.value.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.value.match(/\d+/)?.[0] || "0");
      return numA - numB;
    });
  }
  // Utility methods
  has(value) {
    return this.dateFilters.some((filter) => filter.value === value);
  }
  clear() {
    this.dateFilters = [];
  }
}
export {
  AccountsState as A,
  accounts as B,
  CurrentAccountState as C,
  DateFiltersState as D,
  transactions as E,
  formInsertCategorySchema as F,
  categories as G,
  removeCategoriesSchema as H,
  formInsertPayeeSchema as I,
  payees as J,
  removePayeesSchema as K,
  formInsertTransactionSchema as L,
  removeTransactionsSchema as M,
  insertViewSchema as N,
  views as O,
  PayeesState as P,
  removeViewsSchema as Q,
  RepeatingDateInput as R,
  SchedulesState as S,
  TransactionStatuses as T,
  schedules as U,
  currencyFormatter as a,
  weekOptions as b,
  cn as c,
  dateFormatter as d,
  deleteAccountDialog as e,
  deleteAccountId as f,
  managingScheduleId as g,
  newScheduleDialog as h,
  currentDate as i,
  currentViews as j,
  dateValueToJSDate as k,
  CategoriesState as l,
  managingAccountId as m,
  newAccountDialog as n,
  compareAlphanumeric as o,
  parseDateValue as p,
  formInsertScheduleSchema as q,
  formInsertAccountSchema as r,
  removePayeeSchema as s,
  removeScheduleSchema as t,
  removeAccountSchema as u,
  removeViewSchema as v,
  weekdayOptions as w,
  removeCategorySchema as x,
  schema as y,
  RATE_LIMIT as z
};

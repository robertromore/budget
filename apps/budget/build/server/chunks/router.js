import { y as schema, z as RATE_LIMIT, u as removeAccountSchema, B as accounts, E as transactions, F as formInsertCategorySchema, G as categories, H as removeCategoriesSchema, x as removeCategorySchema, I as formInsertPayeeSchema, J as payees, K as removePayeesSchema, s as removePayeeSchema, L as formInsertTransactionSchema, M as removeTransactionsSchema, N as insertViewSchema, O as views, Q as removeViewsSchema, v as removeViewSchema, t as removeScheduleSchema, U as schedules, q as formInsertScheduleSchema } from "./app-state.js";
import { z as z$1 } from "zod";
import { initTRPC, TRPCError } from "@trpc/server";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { z } from "zod/v4";
import "trpc-sveltekit";
import "@trpc/server/http";
import "cookie";
import { eq, isNull, ne, and, desc, sql, count, asc, inArray } from "drizzle-orm";
import { t as $14e0f24ef4ac5c92$export$461939dd4422153, $ as $14e0f24ef4ac5c92$export$aa8b41735afcabd2, e as $fae977aafc393c5c$export$6b862160d295c8e, a as $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3 } from "./vendor-date.js";
import slugify from "@sindresorhus/slugify";
import validator from "validator";
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().default("drizzle/db/sqlite.db"),
  DATABASE_TYPE: z.enum(["sqlite", "postgres", "mysql"]).default("sqlite"),
  DATABASE_LOG_QUERIES: z.boolean().default(false),
  APP_PORT: z.coerce.number().default(3e3),
  APP_HOST: z.string().default("localhost")
});
function getEnv() {
  const env2 = {
    NODE_ENV: process.env["NODE_ENV"],
    DATABASE_URL: process.env["DATABASE_URL"],
    DATABASE_TYPE: process.env["DATABASE_TYPE"],
    DATABASE_LOG_QUERIES: process.env["DATABASE_LOG_QUERIES"] === "true",
    APP_PORT: process.env["PORT"] || process.env["APP_PORT"],
    APP_HOST: process.env["HOST"] || process.env["APP_HOST"]
  };
  const parsed = envSchema.safeParse(env2);
  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten());
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}
const env = getEnv();
const sqlite = new Database(env.DATABASE_URL);
const db = drizzle(sqlite, {
  schema,
  logger: env.DATABASE_LOG_QUERIES
});
async function createContext() {
  return {
    db
  };
}
const rateLimitStore = /* @__PURE__ */ new Map();
const defaultKeyGenerator = (ctx) => {
  return ctx.user?.id || ctx.ip || "anonymous";
};
const t$4 = initTRPC.context().create();
const rateLimit = (options) => {
  const { windowMs, maxRequests, keyGenerator = defaultKeyGenerator } = options;
  return t$4.middleware(async ({ ctx, next, type }) => {
    if (ctx.isTest) {
      return next({ ctx });
    }
    if (type !== "mutation") {
      return next({ ctx });
    }
    const key = keyGenerator(ctx);
    const now = Date.now();
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }
    let rateData = rateLimitStore.get(key);
    if (!rateData || rateData.resetTime < now) {
      rateData = { count: 1, resetTime: now + windowMs };
      rateLimitStore.set(key, rateData);
    } else {
      rateData.count++;
    }
    if (rateData.count > maxRequests) {
      const retryAfter = Math.ceil((rateData.resetTime - now) / 1e3);
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`
      });
    }
    return next({ ctx });
  });
};
const mutationRateLimit = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  maxRequests: RATE_LIMIT.MUTATION_MAX_REQUESTS
});
const bulkOperationRateLimit = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  maxRequests: RATE_LIMIT.BULK_OPERATION_MAX_REQUESTS
});
const strictRateLimit = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  maxRequests: RATE_LIMIT.STRICT_MAX_REQUESTS
});
const t$3 = initTRPC.context().create();
function sanitizeString(input) {
  if (typeof input !== "string") return input;
  const sanitized = input.replace(/<script[^>]*>.*?<\/script>/gi, "").replace(/<[^>]*>/g, "").replace(/javascript:/gi, "").replace(/on\w+\s*=/gi, "").replace(/\x00-\x1F/g, "").trim();
  return sanitized;
}
function sanitizeObject(obj) {
  if (obj === null || obj === void 0) {
    return obj;
  }
  if (typeof obj === "string") {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (typeof obj === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}
function validateInput(input) {
  if (input === null || input === void 0) {
    return;
  }
  const inputStr = JSON.stringify(input);
  const maxDepth = 15;
  let depth = 0;
  for (const char of inputStr) {
    if (char === "{" || char === "[") {
      depth++;
      if (depth > maxDepth) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Input structure is too deeply nested"
        });
      }
    } else if (char === "}" || char === "]") {
      depth--;
    }
  }
}
const inputSanitization = t$3.middleware(async ({ next, input }) => {
  try {
    validateInput(input);
    const sanitizedInput = sanitizeObject(input);
    return next({ rawInput: sanitizedInput });
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid input provided"
    });
  }
});
const strictInputSanitization = t$3.middleware(async ({ next, input }) => {
  try {
    if (input === null || input === void 0) {
      return next({ rawInput: input });
    }
    validateInput(input);
    let sanitizedInput = sanitizeObject(input);
    const inputStr = JSON.stringify(sanitizedInput);
    const dangerousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      // Script tags
      /javascript:\s*[^"\s]+/i,
      // JavaScript protocols
      /on\w+\s*=\s*[^"\s]+/i
      // Event handlers
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(inputStr)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Input contains potentially dangerous content"
        });
      }
    }
    const sqlPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+set/i
    ];
    for (const pattern of sqlPatterns) {
      if (pattern.test(inputStr)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Input contains potentially dangerous SQL patterns"
        });
      }
    }
    return next({ rawInput: sanitizedInput });
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid input provided"
    });
  }
});
const t$2 = initTRPC.context().create();
function calculateObjectSize(obj) {
  const jsonString = JSON.stringify(obj);
  return new Blob([jsonString]).size;
}
function validateObjectStructure(obj, options, depth = 0) {
  const maxDepth = 20;
  if (depth > maxDepth) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Input structure is too deeply nested"
    });
  }
  if (obj === null || obj === void 0) {
    return;
  }
  if (typeof obj === "string") {
    if (obj.length > options.maxStringLength) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `String length exceeds maximum of ${options.maxStringLength} characters`
      });
    }
    return;
  }
  if (Array.isArray(obj)) {
    if (obj.length > options.maxArrayLength) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Array length exceeds maximum of ${options.maxArrayLength} items`
      });
    }
    for (const item of obj) {
      validateObjectStructure(item, options, depth + 1);
    }
    return;
  }
  if (typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length > options.maxObjectProperties) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Object has too many properties (${keys.length}). Maximum allowed: ${options.maxObjectProperties}`
      });
    }
    for (const value of Object.values(obj)) {
      validateObjectStructure(value, options, depth + 1);
    }
  }
}
const requestLimits = (options = {}) => {
  const defaultOptions = {
    maxInputSize: 1024 * 1024,
    // 1MB default
    maxArrayLength: 1e3,
    maxStringLength: 1e4,
    maxObjectProperties: 100
  };
  const finalOptions = { ...defaultOptions, ...options };
  return t$2.middleware(async ({ next, input, type }) => {
    try {
      if (!input) {
        return next({ rawInput: input });
      }
      const inputSize = calculateObjectSize(input);
      if (inputSize > finalOptions.maxInputSize) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Input size (${inputSize} bytes) exceeds maximum of ${finalOptions.maxInputSize} bytes`
        });
      }
      validateObjectStructure(input, finalOptions);
      return next({ rawInput: input });
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Request validation failed"
      });
    }
  });
};
const standardLimits = requestLimits({
  maxInputSize: 512 * 1024,
  // 512KB
  maxArrayLength: 500,
  maxStringLength: 5e3,
  maxObjectProperties: 50
});
const bulkOperationLimits = requestLimits({
  maxInputSize: 2 * 1024 * 1024,
  // 2MB for bulk operations
  maxArrayLength: 100,
  // Smaller array limit for bulk operations
  maxStringLength: 2e3,
  maxObjectProperties: 20
});
const strictLimits = requestLimits({
  maxInputSize: 64 * 1024,
  // 64KB
  maxArrayLength: 50,
  maxStringLength: 1e3,
  maxObjectProperties: 20
});
const t$1 = initTRPC.context().create();
class SecurityLogger {
  logs = [];
  maxLogs = 1e4;
  // Keep last 10k logs in memory
  log(entry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.splice(0, this.logs.length - this.maxLogs);
    }
    if (entry.type === "blocked" || entry.type === "suspicious") {
      console.warn("Security Alert:", JSON.stringify(entry, null, 2));
    } else if (entry.type === "error") {
      console.error("Security Error:", JSON.stringify(entry, null, 2));
    }
  }
  getRecentLogs(limit = 100) {
    return this.logs.slice(-limit);
  }
  getLogsByType(type, limit = 100) {
    return this.logs.filter((log) => log.type === type).slice(-limit);
  }
  getSuspiciousActivity(timeWindowMs = 6e4) {
    const cutoff = Date.now() - timeWindowMs;
    return this.logs.filter(
      (log) => (log.type === "suspicious" || log.type === "blocked") && new Date(log.timestamp).getTime() > cutoff
    );
  }
}
const securityLogger = new SecurityLogger();
function detectSuspiciousPatterns(input, operation) {
  const suspiciousIndicators = [];
  const inputStr = JSON.stringify(input || {});
  const patterns = [
    { pattern: /<script/i, indicator: "XSS_SCRIPT_TAG" },
    { pattern: /javascript:/i, indicator: "XSS_JAVASCRIPT_PROTOCOL" },
    { pattern: /on\w+\s*=/i, indicator: "XSS_EVENT_HANDLER" },
    { pattern: /union\s+select/i, indicator: "SQL_INJECTION_UNION" },
    { pattern: /drop\s+table/i, indicator: "SQL_INJECTION_DROP" },
    { pattern: /\.\.\/\.\.\//g, indicator: "PATH_TRAVERSAL" },
    { pattern: /eval\s*\(/i, indicator: "CODE_INJECTION_EVAL" },
    { pattern: /Function\s*\(/i, indicator: "CODE_INJECTION_FUNCTION" }
  ];
  for (const { pattern, indicator } of patterns) {
    if (pattern.test(inputStr)) {
      suspiciousIndicators.push(indicator);
    }
  }
  if (inputStr.length > 5e4) {
    suspiciousIndicators.push("EXCESSIVE_INPUT_SIZE");
  }
  if ((inputStr.match(/[<>]/g) || []).length > 10) {
    suspiciousIndicators.push("MULTIPLE_ANGLE_BRACKETS");
  }
  if ((inputStr.match(/['"]/g) || []).length > 20) {
    suspiciousIndicators.push("EXCESSIVE_QUOTES");
  }
  return suspiciousIndicators;
}
function extractClientInfo(ctx) {
  return {
    userAgent: ctx.userAgent || "unknown",
    ip: ctx.ip || "unknown",
    userId: ctx.user?.id || "anonymous"
  };
}
const securityLogging = t$1.middleware(async ({ next, input, ctx, type, path }) => {
  const startTime = Date.now();
  const clientInfo = extractClientInfo(ctx);
  if (ctx.isTest) {
    return next();
  }
  try {
    const suspiciousPatterns = detectSuspiciousPatterns(input, path);
    if (suspiciousPatterns.length > 0) {
      securityLogger.log({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        type: "suspicious",
        operation: path,
        operationType: type,
        ...clientInfo,
        inputSize: JSON.stringify(input || {}).length,
        metadata: { suspiciousPatterns }
      });
    }
    const result = await next();
    const duration = Date.now() - startTime;
    securityLogger.log({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      type: "success",
      operation: path,
      operationType: type,
      ...clientInfo,
      inputSize: JSON.stringify(input || {}).length,
      duration
    });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const isSecurityError = error instanceof TRPCError && (error.code === "BAD_REQUEST" || error.code === "TOO_MANY_REQUESTS" || error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN");
    securityLogger.log({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      type: isSecurityError ? "blocked" : "error",
      operation: path,
      operationType: type,
      ...clientInfo,
      error: error instanceof Error ? error.message : "Unknown error",
      inputSize: JSON.stringify(input || {}).length,
      duration
    });
    throw error;
  }
});
const t = initTRPC.context().create();
const baseProcedure = t.procedure.use(securityLogging);
const publicProcedure = baseProcedure.use(standardLimits).use(inputSanitization);
const rateLimitedProcedure = baseProcedure.use(mutationRateLimit).use(standardLimits).use(inputSanitization);
const bulkOperationProcedure = baseProcedure.use(bulkOperationRateLimit).use(bulkOperationLimits).use(strictInputSanitization);
baseProcedure.use(strictRateLimit).use(strictLimits).use(strictInputSanitization);
async function generateUniqueSlug$1(baseSlug, isUnique) {
  if (await isUnique(baseSlug)) {
    return baseSlug;
  }
  let counter = 1;
  let uniqueSlug = `${baseSlug}-${counter}`;
  while (!await isUnique(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
  return uniqueSlug;
}
async function generateUniqueSlugForDB(db2, tableName, slugColumn, baseSlug, options = {}) {
  const { excludeId, idColumn, deletedAtColumn } = options;
  const isUnique = async (slug) => {
    const conditions = [eq(slugColumn, slug)];
    if (deletedAtColumn) {
      conditions.push(isNull(deletedAtColumn));
    }
    if (excludeId && idColumn) {
      conditions.push(ne(idColumn, excludeId));
    }
    const existing = await db2.query[tableName].findFirst({
      where: and(...conditions)
    });
    return !existing;
  };
  return generateUniqueSlug$1(baseSlug, isUnique);
}
const generateUniqueSlug = generateUniqueSlugForDB;
const accountSaveSchema = z$1.object({
  id: z$1.number().positive().optional(),
  // If provided, it's an update
  name: z$1.string().transform((val) => val?.trim()).pipe(
    z$1.string().min(1, "Account name is required").min(2, "Account name must be at least 2 characters").max(50, "Account name must be less than 50 characters").refine((val) => {
      if (validator.contains(val, "<") || validator.contains(val, ">")) return false;
      if (validator.contains(val, "{") || validator.contains(val, "}")) return false;
      if (validator.contains(val, "[") || validator.contains(val, "]")) return false;
      if (validator.contains(val, "\\") || validator.contains(val, "|")) return false;
      if (validator.contains(val, "@") || validator.contains(val, "#")) return false;
      if (validator.contains(val, "$") || validator.contains(val, "%")) return false;
      if (validator.contains(val, "^") || validator.contains(val, "*")) return false;
      return true;
    }, "Account name contains invalid characters")
  ).optional(),
  slug: z$1.string().transform((val) => val?.trim()).pipe(
    z$1.string().min(2, "Slug must be at least 2 characters").max(30, "Slug must be less than 30 characters").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
  ).optional(),
  notes: z$1.string().transform((val) => val?.trim()).pipe(
    z$1.string().max(500, "Notes must be less than 500 characters").refine((val) => {
      if (!val) return true;
      if (validator.contains(val, "<") || validator.contains(val, ">")) {
        return false;
      }
      return true;
    }, "Notes cannot contain HTML tags")
  ).optional().nullable(),
  closed: z$1.boolean().optional()
}).refine((data) => {
  if (!data.id) {
    return !!data.name;
  }
  return true;
}, {
  message: "Account name is required when creating a new account",
  path: ["name"]
});
const accountRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    const accountsData = await ctx.db.query.accounts.findMany({
      where: isNull(accounts.deletedAt),
      with: {
        transactions: {
          where: isNull(transactions.deletedAt),
          with: {
            payee: true,
            category: true
          },
          orderBy: [desc(transactions.date), desc(transactions.id)]
        }
      },
      orderBy: [accounts.name]
    });
    return accountsData.map((account) => {
      let runningBalance = 0;
      const transactionsWithBalance = account.transactions.map((transaction) => {
        runningBalance += transaction.amount;
        return {
          ...transaction,
          balance: runningBalance
        };
      });
      return {
        ...account,
        balance: runningBalance,
        transactions: transactionsWithBalance
      };
    });
  }),
  load: publicProcedure.input(z$1.object({ id: z$1.coerce.number() })).query(async ({ ctx, input }) => {
    const account = await ctx.db.query.accounts.findFirst({
      where: (accounts2, { eq: eq2, and: and2, isNull: isNull2 }) => and2(eq2(accounts2.id, input.id), isNull2(accounts2.deletedAt)),
      with: {
        transactions: {
          where: isNull(transactions.deletedAt),
          with: {
            payee: true,
            category: true
          },
          orderBy: [transactions.date, transactions.id]
        }
      }
    });
    if (!account) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Account not found"
      });
    }
    let runningBalance = 0;
    const transactionsWithBalance = account.transactions.map((transaction) => {
      runningBalance += transaction.amount;
      return {
        ...transaction,
        balance: runningBalance
      };
    });
    const accountWithBalance = {
      ...account,
      balance: runningBalance,
      transactions: transactionsWithBalance
    };
    return accountWithBalance;
  }),
  save: rateLimitedProcedure.input(accountSaveSchema).mutation(async ({ ctx, input }) => {
    if (input.id) {
      const existingAccount = await ctx.db.query.accounts.findFirst({
        where: (accounts2, { eq: eq2, and: and2, isNull: isNull2 }) => and2(eq2(accounts2.id, input.id), isNull2(accounts2.deletedAt))
      });
      if (!existingAccount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found"
        });
      }
      const updateData = {};
      if (input.name !== void 0) {
        updateData.name = input.name;
        const baseSlug2 = input.slug || slugify(input.name);
        updateData.slug = await generateUniqueSlug(
          ctx.db,
          "accounts",
          accounts.slug,
          baseSlug2,
          {
            excludeId: input.id,
            idColumn: accounts.id,
            deletedAtColumn: accounts.deletedAt
          }
        );
      }
      if (input.notes !== void 0) {
        updateData.notes = input.notes;
      }
      if (input.closed !== void 0) {
        updateData.closed = input.closed;
      }
      if (Object.keys(updateData).length === 0) {
        return existingAccount;
      }
      updateData.updatedAt = $14e0f24ef4ac5c92$export$461939dd4422153($14e0f24ef4ac5c92$export$aa8b41735afcabd2()).toDate().toISOString();
      const result = await ctx.db.update(accounts).set(updateData).where(eq(accounts.id, input.id)).returning();
      if (!result[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update account"
        });
      }
      return result[0];
    }
    if (!input.name) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Account name is required"
      });
    }
    const baseSlug = input.slug || slugify(input.name);
    const uniqueSlug = await generateUniqueSlug(
      ctx.db,
      "accounts",
      accounts.slug,
      baseSlug,
      {
        deletedAtColumn: accounts.deletedAt
      }
    );
    const merged = {
      name: input.name,
      slug: uniqueSlug,
      notes: input.notes,
      closed: input.closed || false
    };
    const insertResult = await ctx.db.insert(accounts).values(merged).returning();
    if (!insertResult[0]) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create account"
      });
    }
    const new_account = insertResult[0];
    return new_account;
  }),
  remove: rateLimitedProcedure.input(removeAccountSchema).mutation(async ({ ctx, input }) => {
    if (!input) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Account ID is required for deletion"
      });
    }
    const result = await ctx.db.update(accounts).set({ deletedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(accounts.id, input.id)).returning();
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Account not found or could not be deleted"
      });
    }
    return result[0];
  })
});
class PerformanceMonitor {
  metrics = [];
  maxMetrics = 1e3;
  timers = /* @__PURE__ */ new Map();
  // Start timing an operation
  startTimer(name) {
    this.timers.set(name, performance.now());
  }
  // End timing and record the metric
  endTimer(name, tags) {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer '${name}' was not started`);
      return 0;
    }
    const duration = performance.now() - startTime;
    this.timers.delete(name);
    this.recordMetric(name, duration, tags);
    return duration;
  }
  // Record a custom metric
  recordMetric(name, value, tags) {
    if (this.metrics.length >= this.maxMetrics) {
      this.metrics.shift();
    }
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      tags
    });
  }
  // Get recent metrics
  getMetrics(name, limit = 100) {
    let filteredMetrics = this.metrics;
    if (name) {
      filteredMetrics = this.metrics.filter((m) => m.name === name);
    }
    return filteredMetrics.slice(-limit);
  }
  // Get performance statistics
  getStats(name) {
    const metrics = name ? this.metrics.filter((m) => m.name === name) : this.metrics;
    if (metrics.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    }
    const values = metrics.map((m) => m.value).sort((a, b) => a - b);
    const count2 = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      count: count2,
      avg: sum / count2,
      min: values[0] ?? 0,
      max: values[count2 - 1] ?? 0,
      p50: values[Math.floor(count2 * 0.5)] ?? 0,
      p95: values[Math.floor(count2 * 0.95)] ?? 0,
      p99: values[Math.floor(count2 * 0.99)] ?? 0
    };
  }
  // Clear all metrics
  clear() {
    this.metrics = [];
    this.timers.clear();
  }
}
const perfMonitor = new PerformanceMonitor();
function trackQuery(queryName, queryFn) {
  return new Promise(async (resolve, reject) => {
    const startTime = performance.now();
    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;
      perfMonitor.recordMetric(`db.query.${queryName}`, duration, {
        type: "database",
        query: queryName
      });
      resolve(result);
    } catch (error) {
      const duration = performance.now() - startTime;
      perfMonitor.recordMetric(`db.query.${queryName}.error`, duration, {
        type: "database",
        query: queryName,
        error: "true"
      });
      reject(error);
    }
  });
}
class MemoryCache {
  cache = /* @__PURE__ */ new Map();
  maxSize;
  cleanupInterval = null;
  constructor(maxSize = 1e3, cleanupIntervalMs = 6e4) {
    this.maxSize = maxSize;
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }
  set(key, value, ttlMs = 3e5) {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return void 0;
    }
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return void 0;
    }
    return entry.value;
  }
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
  delete(key) {
    return this.cache.delete(key);
  }
  clear() {
    this.cache.clear();
  }
  size() {
    return this.cache.size;
  }
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }
    for (const key of expiredKeys) {
      this.cache.delete(key);
    }
  }
  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercent: Math.round(this.cache.size / this.maxSize * 100)
    };
  }
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}
const queryCache = new MemoryCache(500, 3e4);
new MemoryCache(200, 6e4);
const cacheKeys = {
  accountSummary: (id) => `account:${id}:summary`,
  accountTransactions: (id, page, pageSize) => `account:${id}:transactions:${page}:${pageSize}`,
  recentTransactions: (id, limit) => `account:${id}:recent:${limit}`,
  balanceHistory: (id, fromDate, toDate, groupBy) => `account:${id}:balance:${fromDate || ""}:${toDate || ""}:${groupBy || "day"}`,
  searchTransactions: (id, query) => `account:${id}:search:${query}`,
  allAccounts: () => "accounts:all",
  allCategories: () => "categories:all",
  allPayees: () => "payees:all",
  allViews: () => "views:all"
};
const serverAccountsRoutes = t.router({
  /**
   * Get account summary with balance but no transactions
   * Much faster for dashboard and account lists
   */
  loadSummary: publicProcedure.input(z$1.object({ id: z$1.coerce.number() })).query(async ({ ctx, input }) => {
    const cacheKey = cacheKeys.accountSummary(input.id);
    const cached = queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const result = await trackQuery("account-summary", async () => {
      const account = await ctx.db.query.accounts.findFirst({
        where: (accounts2, { eq: eq2, and: and2, isNull: isNull2 }) => and2(eq2(accounts2.id, input.id), isNull2(accounts2.deletedAt))
      });
      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found"
        });
      }
      const [balanceResult] = await ctx.db.select({
        balance: sql`COALESCE(SUM(${transactions.amount}), 0)`,
        transactionCount: count(transactions.id)
      }).from(transactions).where(
        and(
          eq(transactions.accountId, input.id),
          isNull(transactions.deletedAt)
        )
      );
      return {
        ...account,
        balance: balanceResult.balance,
        transactionCount: balanceResult.transactionCount
      };
    });
    queryCache.set(cacheKey, result, 3e5);
    return result;
  }),
  /**
   * Get all account summaries (for sidebar, dashboard)
   * Only loads account metadata + calculated balances
   */
  loadAllSummaries: publicProcedure.query(async ({ ctx }) => {
    const cacheKey = cacheKeys.allAccounts();
    const cached = queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const result = await trackQuery("all-account-summaries", async () => {
      const accountsData = await ctx.db.query.accounts.findMany({
        where: isNull(accounts.deletedAt),
        orderBy: [accounts.name]
      });
      const balances = await ctx.db.select({
        accountId: transactions.accountId,
        balance: sql`COALESCE(SUM(${transactions.amount}), 0)`,
        transactionCount: count(transactions.id)
      }).from(transactions).where(isNull(transactions.deletedAt)).groupBy(transactions.accountId);
      return accountsData.map((account) => {
        const balanceData = balances.find((b) => b.accountId === account.id);
        return {
          ...account,
          balance: balanceData?.balance || 0,
          transactionCount: balanceData?.transactionCount || 0
        };
      });
    });
    queryCache.set(cacheKey, result, 12e4);
    return result;
  }),
  /**
   * Load transactions with pagination and optional filtering
   * Separate from account metadata for better performance
   */
  loadTransactions: publicProcedure.input(
    z$1.object({
      accountId: z$1.coerce.number(),
      page: z$1.number().min(0).default(0),
      pageSize: z$1.number().min(10).max(100).default(50),
      sortBy: z$1.enum(["date", "amount", "notes"]).default("date"),
      sortOrder: z$1.enum(["asc", "desc"]).default("desc"),
      searchQuery: z$1.string().optional(),
      dateFrom: z$1.string().datetime().optional(),
      dateTo: z$1.string().datetime().optional()
    })
  ).query(async ({ ctx, input }) => {
    const { accountId, page, pageSize, sortBy, sortOrder, searchQuery, dateFrom, dateTo } = input;
    const offset = page * pageSize;
    const cacheKey = searchQuery ? cacheKeys.searchTransactions(accountId, searchQuery) : `transactions:${accountId}:${page}:${pageSize}:${sortBy}:${sortOrder}:${dateFrom || "null"}:${dateTo || "null"}`;
    if (!searchQuery) {
      const cached = queryCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }
    const result = await trackQuery("paginated-transactions", async () => {
      let whereConditions = [
        eq(transactions.accountId, accountId),
        isNull(transactions.deletedAt)
      ];
      if (searchQuery) {
        whereConditions.push(
          sql`(
              ${transactions.notes} LIKE ${`%${searchQuery}%`} OR
              CAST(${transactions.amount} AS TEXT) LIKE ${`%${searchQuery}%`}
            )`
        );
      }
      if (dateFrom) {
        whereConditions.push(sql`${transactions.date} >= ${dateFrom}`);
      }
      if (dateTo) {
        whereConditions.push(sql`${transactions.date} <= ${dateTo}`);
      }
      const [countResult] = await ctx.db.select({ count: count(transactions.id) }).from(transactions).where(and(...whereConditions));
      const totalCount = countResult.count;
      const paginatedTransactions = await ctx.db.query.transactions.findMany({
        where: and(...whereConditions),
        with: {
          payee: {
            columns: { id: true, name: true }
            // Only select needed fields
          },
          category: {
            columns: { id: true, name: true }
            // Only select needed fields
          }
        },
        orderBy: sortOrder === "desc" ? desc(transactions[sortBy]) : asc(transactions[sortBy]),
        limit: pageSize,
        offset
      });
      let transactionsWithBalance;
      if (page === 0 && sortBy === "date") {
        if (sortOrder === "asc") {
          let runningBalance = 0;
          transactionsWithBalance = paginatedTransactions.map((transaction) => {
            runningBalance += transaction.amount;
            return {
              ...transaction,
              balance: runningBalance
            };
          });
        } else {
          const [totalBalanceResult] = await ctx.db.select({
            balance: sql`COALESCE(SUM(${transactions.amount}), 0)`
          }).from(transactions).where(
            and(
              eq(transactions.accountId, accountId),
              isNull(transactions.deletedAt)
            )
          );
          let runningBalance = totalBalanceResult?.balance ?? 0;
          transactionsWithBalance = paginatedTransactions.map((transaction) => {
            const currentBalance = runningBalance;
            runningBalance -= transaction.amount;
            return {
              ...transaction,
              balance: currentBalance
            };
          });
        }
      } else {
        transactionsWithBalance = paginatedTransactions.map((t2) => ({ ...t2, balance: null }));
      }
      return {
        transactions: transactionsWithBalance,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          hasNextPage: offset + pageSize < totalCount,
          hasPreviousPage: page > 0
        }
      };
    });
    if (!searchQuery) {
      queryCache.set(cacheKey, result, 6e4);
    }
    return result;
  }),
  /**
   * Get recent transactions (optimized for dashboard widgets)
   */
  loadRecentTransactions: publicProcedure.input(
    z$1.object({
      accountId: z$1.coerce.number(),
      limit: z$1.number().min(5).max(20).default(10)
    })
  ).query(async ({ ctx, input }) => {
    const cacheKey = cacheKeys.recentTransactions(input.accountId, input.limit);
    const cached = queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const result = await trackQuery("recent-transactions", async () => {
      return ctx.db.query.transactions.findMany({
        where: and(
          eq(transactions.accountId, input.accountId),
          isNull(transactions.deletedAt)
        ),
        with: {
          payee: {
            columns: { id: true, name: true }
          },
          category: {
            columns: { id: true, name: true }
          }
        },
        orderBy: [desc(transactions.date), desc(transactions.id)],
        limit: input.limit
      });
    });
    queryCache.set(cacheKey, result, 12e4);
    return result;
  }),
  /**
   * Get balance history grouped by time periods
   * Useful for charts and analytics
   */
  getBalanceHistory: publicProcedure.input(
    z$1.object({
      accountId: z$1.coerce.number(),
      fromDate: z$1.string().datetime().optional(),
      toDate: z$1.string().datetime().optional(),
      groupBy: z$1.enum(["day", "week", "month"]).default("day")
    })
  ).query(async ({ ctx, input }) => {
    const { accountId, fromDate, toDate, groupBy } = input;
    return trackQuery("balance-history", async () => {
      let whereConditions = [
        eq(transactions.accountId, accountId),
        isNull(transactions.deletedAt)
      ];
      if (fromDate) {
        whereConditions.push(sql`${transactions.date} >= ${fromDate}`);
      }
      if (toDate) {
        whereConditions.push(sql`${transactions.date} <= ${toDate}`);
      }
      const dateFormat = groupBy === "month" ? "strftime('%Y-%m', date)" : groupBy === "week" ? "strftime('%Y-%W', date)" : "date(date)";
      const balanceHistory = await ctx.db.select({
        period: sql`${sql.raw(dateFormat)}`,
        totalAmount: sql`SUM(${transactions.amount})`,
        transactionCount: count(transactions.id)
      }).from(transactions).where(and(...whereConditions)).groupBy(sql.raw(dateFormat)).orderBy(sql.raw(dateFormat));
      return balanceHistory;
    });
  })
});
const categoriesRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(categories).where(isNull(categories.deletedAt));
  }),
  load: publicProcedure.input(z$1.object({ id: z$1.coerce.number() })).query(async ({ ctx, input }) => {
    const result = await ctx.db.query.categories.findMany({
      where: (categories2, { eq: eq2, and: and2, isNull: isNull2 }) => and2(eq2(categories2.id, input.id), isNull2(categories2.deletedAt))
    });
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Category not found"
      });
    }
    return result[0];
  }),
  remove: rateLimitedProcedure.input(removeCategorySchema).mutation(async ({ ctx, input }) => {
    if (!input) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Category ID is required for deletion"
      });
    }
    const result = await ctx.db.update(categories).set({ deletedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(categories.id, input.id)).returning();
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Category not found or could not be deleted"
      });
    }
    return result[0];
  }),
  delete: bulkOperationProcedure.input(removeCategoriesSchema).mutation(async ({ input: { entities }, ctx: { db: db2 } }) => {
    return await db2.update(categories).set({ deletedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(inArray(categories.id, entities)).returning();
  }),
  save: rateLimitedProcedure.input(formInsertCategorySchema).mutation(async ({ input: { id, name, notes }, ctx: { db: db2 } }) => {
    let entities;
    if (id) {
      entities = await db2.update(categories).set({
        name,
        notes
      }).where(eq(categories.id, id)).returning();
    } else {
      entities = await db2.insert(categories).values({
        name,
        notes
      }).returning();
    }
    if (!entities[0]) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to save category"
      });
    }
    const entity = entities[0];
    entity.is_new = !!id;
    return entity;
  })
});
const payeeRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(payees).where(isNull(payees.deletedAt));
  }),
  load: publicProcedure.input(z$1.object({ id: z$1.coerce.number() })).query(async ({ ctx, input }) => {
    const result = await ctx.db.query.payees.findMany({
      where: (payees2, { eq: eq2, and: and2, isNull: isNull2 }) => and2(eq2(payees2.id, input.id), isNull2(payees2.deletedAt))
    });
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Payee not found"
      });
    }
    return result[0];
  }),
  remove: rateLimitedProcedure.input(removePayeeSchema).mutation(async ({ ctx, input }) => {
    if (!input) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Payee ID is required for deletion"
      });
    }
    const result = await ctx.db.update(payees).set({ deletedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(payees.id, input.id)).returning();
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Payee not found or could not be deleted"
      });
    }
    return result[0];
  }),
  delete: bulkOperationProcedure.input(removePayeesSchema).mutation(async ({ input: { entities }, ctx: { db: db2 } }) => {
    return await db2.update(payees).set({ deletedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(inArray(payees.id, entities)).returning();
  }),
  save: rateLimitedProcedure.input(formInsertPayeeSchema).mutation(async ({ input: { id, name, notes }, ctx: { db: db2 } }) => {
    if (id) {
      const result2 = await db2.update(payees).set({
        name,
        notes
      }).where(eq(payees.id, id)).returning();
      if (!result2[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update payee"
        });
      }
      return result2[0];
    }
    const result = await db2.insert(payees).values({
      name,
      notes
    }).returning();
    if (!result[0]) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create payee"
      });
    }
    return result[0];
  })
});
const transactionRoutes = t.router({
  forAccount: publicProcedure.input(
    z$1.object({
      id: z$1.number()
    })
  ).query(async ({ ctx: { db: db2 }, input }) => {
    const records = await db2.query.transactions.findMany({
      where: (transactions2, { eq: eq2, and: and2, isNull: isNull2 }) => and2(eq2(transactions2.id, input.id), isNull2(transactions2.deletedAt))
    });
    return records;
  }),
  delete: bulkOperationProcedure.input(removeTransactionsSchema).mutation(async ({ input: { entities }, ctx: { db: db2 } }) => {
    return await db2.update(transactions).set({ deletedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(inArray(transactions.id, entities)).returning();
  }),
  save: rateLimitedProcedure.input(formInsertTransactionSchema).mutation(
    async ({
      input: { id, payeeId, amount, categoryId, notes, date, accountId, status },
      input,
      ctx: { db: db2 }
    }) => {
      if (!accountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Account ID is required for transaction"
        });
      }
      const accountExists = await db2.query.accounts.findFirst({
        where: (accounts2, { eq: eq2, isNull: isNull2, and: and2 }) => and2(eq2(accounts2.id, accountId), isNull2(accounts2.deletedAt))
      });
      if (!accountExists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found"
        });
      }
      let entity;
      if (id) {
        entity = await db2.update(transactions).set({
          payeeId,
          amount,
          categoryId,
          notes,
          date,
          status
        }).where(eq(transactions.id, id)).returning();
      } else {
        if (date && $fae977aafc393c5c$export$6b862160d295c8e(date) > $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3($14e0f24ef4ac5c92$export$aa8b41735afcabd2())) {
          status = "scheduled";
        }
        entity = await db2.insert(transactions).values({
          payeeId,
          amount,
          categoryId,
          notes,
          date,
          accountId,
          status: status ?? "pending"
        }).returning();
      }
      const result = entity[0];
      if (!result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save transaction"
        });
      }
      return result;
    }
  )
});
const viewsRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(views);
  }),
  load: publicProcedure.input(z$1.object({ id: z$1.coerce.number() })).query(async ({ ctx, input }) => {
    const result = await ctx.db.query.views.findMany({
      where: eq(views.id, input.id)
    });
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "View not found"
      });
    }
    return result[0];
  }),
  remove: rateLimitedProcedure.input(removeViewSchema).mutation(async ({ ctx, input }) => {
    if (!input) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "View ID is required for deletion"
      });
    }
    const result = await ctx.db.delete(views).where(eq(views.id, input.id)).returning();
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "View not found or could not be deleted"
      });
    }
    return result[0];
  }),
  delete: bulkOperationProcedure.input(removeViewsSchema).mutation(async ({ input: { entities }, ctx: { db: db2 } }) => {
    return await db2.delete(views).where(inArray(views.id, entities)).returning();
  }),
  save: rateLimitedProcedure.input(insertViewSchema).mutation(async ({ input: { id, name, description, icon, filters, display, dirty }, ctx: { db: db2 } }) => {
    const transformedDisplay = display ? {
      ...display,
      expanded: display.expanded === true ? {} : display.expanded,
      visibility: display.visibility === true ? {} : display.visibility
    } : display;
    let entities;
    if (id) {
      entities = await db2.update(views).set({
        name,
        description,
        icon,
        filters,
        display: transformedDisplay,
        dirty
      }).where(eq(views.id, id)).returning();
    } else {
      entities = await db2.insert(views).values({
        name,
        description,
        icon,
        filters,
        display: transformedDisplay,
        dirty
      }).returning();
    }
    if (!entities[0]) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to save view"
      });
    }
    const entity = entities[0];
    return entity;
  })
});
const scheduleRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.schedules.findMany();
  }),
  load: publicProcedure.input(z$1.object({ id: z$1.coerce.number() })).query(async ({ ctx, input }) => {
    const result = await ctx.db.query.schedules.findMany({
      where: eq(schedules.id, input.id),
      with: {
        transactions: {
          with: {
            payee: true,
            category: true
          }
        }
      }
    });
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Schedule not found"
      });
    }
    return result[0];
  }),
  save: rateLimitedProcedure.input(formInsertScheduleSchema).mutation(async ({ ctx, input }) => {
    if (input.id) {
      const result = await ctx.db.update(schedules).set(input).where(eq(schedules.id, input.id)).returning();
      if (!result[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update schedule"
        });
      }
      return result[0];
    }
    const insertResult = await ctx.db.insert(schedules).values(input).returning();
    if (!insertResult[0]) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create schedule"
      });
    }
    const new_schedule = insertResult[0];
    return new_schedule;
  }),
  remove: rateLimitedProcedure.input(removeScheduleSchema).mutation(async ({ ctx, input }) => {
    if (!input) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Schedule ID is required for deletion"
      });
    }
    const result = await ctx.db.delete(schedules).where(eq(schedules.id, input.id)).returning();
    if (!result[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Schedule not found or could not be deleted"
      });
    }
    return result[0];
  })
});
const router = t.router({
  accountRoutes,
  serverAccountsRoutes,
  categoriesRoutes,
  payeeRoutes,
  scheduleRoutes,
  transactionRoutes,
  viewsRoutes
});
const createCaller = t.createCallerFactory(router);
export {
  createContext as a,
  cacheKeys as b,
  createCaller as c,
  queryCache as q,
  router as r
};

# Utils Directory Documentation

Comprehensive documentation of all utility files in `apps/budget/src/lib/utils/`.

---

## Table of Contents

1. [index.ts](#indexts) - Core exports and utilities
2. [dates.ts](#datests) - Date manipulation utilities
3. [formatters.ts](#formattersts) - Formatting utilities
4. [colors.ts](#colorsts) - Color utilities for charts
5. [chart-statistics.ts](#chart-statisticsts) - Statistical utilities for charts
6. [comprehensive-statistics.ts](#comprehensive-statisticsts) - Extended statistics for analytics
7. [field-encryption.ts](#field-encryptionts) - Client-side encryption
8. [use-encryption.svelte.ts](#use-encryptionsveltets) - Reactive encryption helpers
9. [local-storage.svelte.ts](#local-storagesveltets) - Reactive localStorage
10. [search.ts](#searchts) - Search and filter utilities
11. [cache.ts](#cachets) - In-memory caching
12. [performance.ts](#performancets) - Performance monitoring
13. [type-validation.ts](#type-validationts) - Runtime type validation
14. [time-period.ts](#time-periodts) - Time period utilities
15. [toast-interceptor.ts](#toast-interceptorts) - Toast notification wrapper
16. [markdown-renderer.ts](#markdown-rendererts) - Markdown to HTML
17. [pdf-client.ts](#pdf-clientts) - PDF generation
18. [credit-card-analytics.ts](#credit-card-analyticsts) - Credit card analysis
19. [credit-card-metrics.ts](#credit-card-metricsts) - Credit card metrics
20. [utility-analytics.ts](#utility-analyticsts) - Utility account analytics
21. [date-frequency.ts](#date-frequencyts) - Recurring date generation
22. [options.ts](#optionsts) - Select option generators
23. [Additional Files](#additional-files)

---

## index.ts

**Purpose:** Core exports and general utilities

### Exports

```typescript
// Re-exports
export * from "./bind-helpers";
export * from "./dates";
export * from "./formatters";

// Tailwind class merging (from clsx + tailwind-merge)
export function cn(...inputs: ClassValue[]): string;

// Type helpers for shadcn-svelte components
export type WithoutChild<T>;
export type WithoutChildren<T>;
export type WithoutChildrenOrChild<T>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement>;

// Alphanumeric comparison for natural sorting
export function compareAlphanumeric(aStr: string, bStr: string): number;

// Array utilities
export function without<T>(array: T[], fn: (element: T) => boolean): [T[], T[]];

// Deep equality checks
export function deeplyEqual(left: unknown, right: unknown): boolean;
export function equalArray(left: unknown[], right: unknown[]): boolean;
export function equalArrayBuffer(left: ArrayBufferView, right: ArrayBufferView): boolean;
export function equalMap(left: Map<unknown, unknown>, right: Map<unknown, unknown>): boolean;
export function equalSet(left: Set<unknown>, right: Set<unknown>): boolean;

// Type guards
export function isFunction(value: unknown): value is Function;
export function isNull(value: unknown): value is null;
export function isRegex(value: unknown): value is RegExp;
export function isObject(value: unknown): value is AnyObject;
export function isUndefined(value: unknown): value is undefined;
```

---

## dates.ts

**Purpose:** Date manipulation using `@internationalized/date`

### Constants

```typescript
export const timezone: string;      // Local timezone
export const currentDate: DateValue; // Today's date
```

### Functions

```typescript
// Date extraction
export function getDayOfWeek(date: DateValue): number;           // 0=Sunday, 6=Saturday
export function getIsoWeekday(date: DateValue): number;          // 1=Monday, 7=Sunday (ISO)
export function getDaysInMonth(date: DateValue): number;         // 28-31
export function getOrdinalSuffix(day: number): string;           // "st", "nd", "rd", "th"

// Date comparison
export function sameMonthAndYear(date1: DateValue, date2: DateValue): boolean;
export function sameMonthOrFuture(date1: DateValue, date2?: DateValue): boolean;
export function sameMonthOrPast(date1: DateValue, date2?: DateValue): boolean;
export function isSamePeriod(date1: DateValue, date2: DateValue, unit: "day" | "month" | "quarter" | "year"): boolean;
export function dateDifference(date1: DateValue, date2: DateValue, unit: "days" | "months" | "quarters" | "years"): number;

// Weekday finding
export function getFirstDayInCalendarMonth(date: DateValue, locale?: string, firstDayOfWeek?: string): DateValue;
export function getFirstSpecifiedWeekdayInMonth(year: number, month: number, weekday: number): DateValue;
export function getFirstWeekday(date: DateValue): DateValue;
export function getNextWeekday(fromDate: DateValue, targetWeekday: number): DateValue;
export function getNextWeekdayFlexible(fromDate: DateValue, targetWeekday: number, includeSameDay?: boolean): DateValue;
export function getNextWeekdayByLabel(fromDate: DateValue, weekdayLabel: string, includeSameDay?: boolean): DateValue;
export function getNthWeekdayOfMonth(year: number, month: number, week: number, weekDay: number): DateValue | null;
export function getLastWeekdayOfMonth(year: number, month: number, weekDay: number): DateValue | null;

// Parsing and conversion
export function parseDateValue(dateValue: any): DateValue | null;
export function ensureDateValue(dateValue: any): DateValue;
export function dateValueToJSDate(dateValue: DateValue, timeZone?: string): Date;
export function parseISOString(isoString: string): DateValue | null;
export function toISOString(dateValue: DateValue): string;

// Formatting
export function formatDateDisplay(dateValue: DateValue, format?: "short" | "medium" | "long"): string;
export function getCurrentTimestamp(): string;
export function formatTimeAgo(date: Date): string;

// Types
export type SpecialDateValue = ["day" | "month" | "quarter" | "year" | "half-year", string];
export function getSpecialDateValue(date: string): SpecialDateValue;
```

---

## formatters.ts

**Purpose:** Number, currency, and display formatting

### Formatters

```typescript
export const currencyFormatter: Intl.NumberFormat;     // Legacy - prefer formatCurrency()
export const numberFormatter: Intl.NumberFormat;       // Legacy - prefer formatNumber()
export const percentageFormatter: { format(value: number): string };
export const daysFormatter: { format(value: number): string };
export const transactionFormatter: { format(transactions?: Transaction[]): TransactionsFormat[] | undefined };
export const periodFormatter: { toAdverb(period: string): string };
export const recurringFormatter: { format(frequency: string, interval?: number): string };
```

### Functions

```typescript
export function formatCurrency(amount: number): string;
export function formatNumber(value: number): string;
export function formatBudgetName(budgetId: number, budgetName?: string): string;
export function formatFileSize(bytes: number): string;
export function formatDisplayValue(value: any): string;
export function toSignedAmount(amount: number, referenceAmount: number): number;

// Percentage formatting (NEW)
export function formatPercent(value: number, decimals?: number): string;        // 0.75 → "75%"
export function formatPercentChange(value: number, decimals?: number): string;  // 0.15 → "+15.0%"
export function formatPercentRaw(value: number, decimals?: number): string;     // 75 → "75%"
```

---

## colors.ts

**Purpose:** Color utilities for charts and theming

### Constants

```typescript
export const FINANCIAL_COLORS: {
  positive: string;   // Green for income/gains
  negative: string;   // Red for expenses/losses
  neutral: string;    // Blue for balance
  zeroLine: string;   // Gray for reference lines
  primary: string;    // Blue primary
  accent: string;     // Orange accent
};

export const CHART_THEME: {
  background: string;
  gridLines: string;
  axisLines: string;
  text: string;
  tooltip: { background: string; text: string; border: string };
};
```

### colorUtils Object

```typescript
export const colorUtils = {
  getChartColor(index: number): string;
  getChartColors(count: number): string[];
  getFinancialColor(type: keyof typeof FINANCIAL_COLORS): string;
  getCategoryColors(categories: string[]): Record<string, string>;
  getValueColor(value: number, neutralThreshold?: number): string;
  resolve(input: string, config?: Partial<ColorConfig>): string;
  resolveMultiple(inputs: string[], config?: Partial<ColorConfig>): string[];
  getStrokeClass(color: string): string;
};
```

### Functions

```typescript
export function getLuminance(hex: string): number;
export function hexToHSL(hex: string): string;
export function hexToOKLCH(hex: string): string;
```

---

## chart-statistics.ts

**Purpose:** Statistical calculations for chart overlays

### Types

```typescript
export interface TrendLineData {
  data: Array<{ x: number; y: number }>;
  slope: number;
  intercept: number;
  direction: 'up' | 'down' | 'flat';
}

export interface PercentileBands { p25: number; p50: number; p75: number; }
export interface ExtendedPercentileBands extends PercentileBands {
  iqr: number; lowerFence: number; upperFence: number;
}
export interface BasicStats {
  mean: number; median: number; stdDev: number;
  min: number; max: number; range: number; count: number; total: number;
}
```

### Functions

```typescript
// Trend analysis
export function calculateLinearTrend(data: Array<{ spending: number; index?: number }>): TrendLineData | null;
export function getTrendValueAtIndex(trend: TrendLineData, index: number): number;
export function calculateGrowthRate(data: Array<{ spending: number }>): number | null;

// Averages and percentiles
export function calculateHistoricalAverage(data: Array<{ spending: number }>): number;
export function calculatePercentileBands(data: Array<{ spending: number }>): PercentileBands | null;
export function calculateExtendedPercentiles(values: number[]): ExtendedPercentileBands | null;

// Basic statistics
export function calculateBasicStats(values: number[]): BasicStats | null;
export function calculateCoefficientOfVariation(values: number[]): number;
export function calculateMovingAverage(values: number[], window: number): (number | null)[];

// Outliers
export function identifyOutliers(data: Array<{ spending: number }>): number[];

// Re-exports from simple-statistics
export { mean, median, standardDeviation, quantile } from 'simple-statistics';
```

---

## comprehensive-statistics.ts

**Purpose:** Extended statistics for analytics dashboards

### Types

```typescript
export interface ComprehensiveStats {
  summary: SummaryStats;
  trend: TrendStats;
  distribution: DistributionStats;
  outliers: OutlierStats;
  comparison: ComparisonStats;
}

export interface RateStats { ... }              // For percentage data
export interface DistributionChartStats { ... } // For histogram data
export interface RankingStats { ... }           // For ranking data
export interface DualSeriesStats { ... }        // For income vs expenses
```

### Functions

```typescript
// Main calculation
export function calculateComprehensiveStats(
  filteredData: MonthlyDataPoint[],
  allTimeData: MonthlyDataPoint[],
  budgetTarget?: number | null,
  lastYearTotal?: number | null
): ComprehensiveStats | null;

// Specialized calculators
export function calculateComprehensiveStatsForRate(data: RateDataPoint[], targetRate?: number): RateStats | null;
export function calculateComprehensiveStatsForDistribution(data: DistributionDataPoint[]): DistributionChartStats | null;
export function calculateComprehensiveStatsForRanking(data: RankingDataPoint[]): RankingStats | null;
export function calculateComprehensiveStatsForDualSeries(data: DualSeriesDataPoint[]): DualSeriesStats | null;

// Formatting helpers
export function formatStatCurrency(value: number): string;
export function formatStatPercent(value: number | null, includeSign?: boolean): string;
export function getTrendIndicator(direction: 'up' | 'down' | 'flat'): string;
```

---

## field-encryption.ts

**Purpose:** Client-side AES-256-GCM encryption using Web Crypto API

### Constants

```typescript
export const ENCRYPTED_PREFIX = "enc:";
```

### Functions

```typescript
// Detection
export function isEncryptedValue(value: string | null | undefined): boolean;

// Decryption
export async function decryptField(encryptedValue: string, dek: string): Promise<string>;
export async function decryptFields<T extends Record<string, string | null>>(fields: T, dek: string): Promise<T>;

// Encryption
export async function encryptField(plaintext: string, dek: string): Promise<string>;

// Helpers
export async function safeDecryptField(value: string | null | undefined, dek: string | null): Promise<string | null>;
export function getEncryptedFieldDisplay(value: string | null | undefined, dek: string | null, placeholder?: string): string;
```

---

## use-encryption.svelte.ts

**Purpose:** Reactive encryption helpers for Svelte 5 components

### Functions

```typescript
// State queries
export function getEncryptionLevel(): EncryptionLevel;
export function isEncryptionEnabled(): boolean;
export function isFieldEncrypted(fieldPath: string): boolean;

// Key management
export function getCachedDek(): string | null;
export function hasCachedDek(): boolean;
export async function requestUnlock(context?: UnlockContext): Promise<string>;

// Field operations
export async function decryptFieldValue(value: string | null | undefined, context?: UnlockContext): Promise<string | null>;
export async function decryptFieldSilent(value: string | null | undefined): Promise<string | null>;
export async function encryptFieldValue(value: string, context?: UnlockContext): Promise<string>;

// Reactive state factory (Svelte 5)
export function createEncryptedFieldState(getValue: () => string | null | undefined, context?: UnlockContext): {
  value: string | null;
  isLoading: boolean;
  error: string | null;
  needsUnlock: boolean;
  isEncrypted: boolean;
  unlock(): Promise<string | null>;
};

// Display helper
export function displayEncryptedField(value: string | null | undefined, placeholder?: string): string;
```

---

## local-storage.svelte.ts

**Purpose:** Reactive localStorage state with Svelte 5 runes

### Functions

```typescript
export function shouldPersistToLocalStorage(): boolean;

export function createLocalStorageState<T>(key: string, defaultValue: T): {
  get value(): T;
  set value(newValue: T): void;
};
```

---

## search.ts

**Purpose:** Search and filter utilities

### Functions

```typescript
export function highlightMatches(text: string, query: string): string;
export function countActiveFilters(filters: Record<string, any>): number;
export function isActiveFilterValue(value: any): boolean;
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
export function formatFilterValue(value: any): string;
export function getFilterLabel(key: string): string;
export function getFilterSummaries(filters: Record<string, any>, labelMap?: Record<string, string>): string[];
export function clearFilters<T>(filters: T, keys: (keyof T)[]): Partial<T>;
export function updateFilters<T>(currentFilters: T, updates: Partial<T>): T;
```

---

## cache.ts

**Purpose:** In-memory caching with TTL support

### Exports

```typescript
// Cache instances
export const queryCache: MemoryCache;  // 500 entries, 30s cleanup
export const dataCache: MemoryCache;   // 200 entries, 60s cleanup

// Cache key generators
export const cacheKeys = {
  accountSummary(id: number): string;
  accountTransactions(id: number, page: number, pageSize: number, ...): string;
  recentTransactions(id: number, limit: number): string;
  balanceHistory(id: number, fromDate?: string, toDate?: string, groupBy?: string): string;
  searchTransactions(id: number, query: string): string;
  allAccounts(): string;
  allCategories(): string;
  allPayees(): string;
  allViews(): string;
};

// Cache management
export function invalidateAccountCache(accountId: number): void;
export function invalidateEntityCache(entityType: "categories" | "payees" | "views"): void;
export function getCacheMetrics(): { queryCache: Stats; dataCache: Stats; totalMemoryUsage: any };
```

### MemoryCache Methods

```typescript
class MemoryCache {
  set<T>(key: string, value: T, ttlMs?: number): void;
  get<T>(key: string): T | undefined;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
  getStats(): { size: number; maxSize: number; utilizationPercent: number };
  destroy(): void;
}
```

---

## performance.ts

**Purpose:** Performance monitoring and Web Vitals

### Exports

```typescript
// Global monitor instance
export const perfMonitor: PerformanceMonitor;

// Decorator
export function timed(name?: string): MethodDecorator;

// Utilities
export function measureRender(componentName: string, renderFn: () => void): number;
export function analyzeBundleSize(): Promise<{ totalSize: number; chunks: Array<...> }>;
export function trackQuery<T>(queryName: string, queryFn: () => Promise<T>): Promise<T>;
export function generatePerformanceReport(): { summary: any; queries: any; renders: any; webVitals: any };

// Web Vitals
export class WebVitalsMonitor {
  measure(): void;
  getVitals(): Record<string, number>;
}
```

### PerformanceMonitor Methods

```typescript
class PerformanceMonitor {
  startTimer(name: string): void;
  endTimer(name: string, tags?: Record<string, string>): number;
  recordMetric(name: string, value: number, tags?: Record<string, string>): void;
  getMetrics(name?: string, limit?: number): PerformanceMetric[];
  getStats(name?: string): { count: number; avg: number; min: number; max: number; p50: number; p95: number; p99: number };
  clear(): void;
}
```

---

## type-validation.ts

**Purpose:** Runtime type validation with branded types

### Classes

```typescript
export class TypeValidator {
  static validateNonEmptyString(value: unknown): NonEmptyString | null;
  static validatePositiveNumber(value: unknown): PositiveNumber | null;
  static validateEmail(value: unknown): ValidEmail | null;
  static validateISODateString(value: unknown): ISODateString | null;
  static validateCurrencyAmount(value: unknown): CurrencyAmount | null;
  static validatePageSize(value: unknown): PositiveNumber | null;
  static validateObject<T>(value: unknown, schema: Record<string, (value: unknown) => ValidationResult>): ValidatedFormData<T>;
}

export class ValidationSchemaBuilder<T> {
  string(field: keyof T, constraints?: { required?: boolean; minLength?: number; maxLength?: number; pattern?: RegExp; email?: boolean }): this;
  number(field: keyof T, constraints?: { required?: boolean; min?: number; max?: number; integer?: boolean; positive?: boolean }): this;
  date(field: keyof T, constraints?: { required?: boolean; minDate?: Date; maxDate?: Date; isoString?: boolean }): this;
  array(field: keyof T, constraints?: { required?: boolean; minLength?: number; maxLength?: number; itemValidator?: Function }): this;
  custom(field: keyof T, validator: (value: unknown) => ValidationResult, required?: boolean): this;
  build(): Record<string, (value: unknown) => ValidationResult>;
}

export class CommonValidationSchemas {
  static account(): ValidationSchema;
  static transaction(): ValidationSchema;
  static user(): ValidationSchema;
  static paginationParams(): ValidationSchema;
}

export class RuntimeTypeChecker {
  static assert<T>(value: unknown, guard: (value: unknown) => value is T, message?: string): T;
  static safeCast<T>(value: unknown, validator: (value: unknown) => value is T): { success: true; data: T } | { success: false; error: NonEmptyString };
  static validateAPIResponse<T>(response: unknown, dataValidator: (data: unknown) => data is T): ...;
}
```

---

## time-period.ts

**Purpose:** Time period filtering utilities

### Types

```typescript
export type PeriodPresetGroup = 'days' | 'months' | 'year' | 'other';
export interface PeriodPresetOption {
  value: TimePeriodPreset;
  label: string;
  group: PeriodPresetGroup;
}
```

### Functions

```typescript
export function getPeriodPresetOptions(): PeriodPresetOption[];
export function getGroupedPresetOptions(allowedGroups?: PeriodPresetGroup[]): Record<string, PeriodPresetOption[]>;
export function getPresetLabel(preset: TimePeriodPreset): string;
export function formatPeriodLabel(period: TimePeriod): string;
export function formatPeriodShortLabel(period: TimePeriod): string;
export function isAllTime(period: TimePeriod): boolean;
export function periodsEqual(a: TimePeriod, b: TimePeriod): boolean;
```

---

## toast-interceptor.ts

**Purpose:** Toast notification wrapper around svelte-sonner

### Exports

```typescript
export const toast = {
  success(message: string, options?: ExternalToast): string | number | undefined;
  error(message: string, options?: ExternalToast): string | number | undefined;
  info(message: string, options?: ExternalToast): string | number | undefined;
  warning(message: string, options?: ExternalToast): string | number | undefined;
  loading(message: string, options?: ExternalToast): string | number;
  promise: typeof sonnerToast.promise;
  dismiss: typeof sonnerToast.dismiss;
  message: typeof sonnerToast.message;
  custom: typeof sonnerToast.custom;
};
```

---

## markdown-renderer.ts

**Purpose:** Markdown to styled HTML conversion

### Types

```typescript
export interface MarkdownFrontmatter {
  title?: string;
  description?: string;
  related?: string[];
  navigateTo?: string;
  modalId?: string;
  parent?: string;
  type?: string;
}
```

### Functions

```typescript
export function renderMarkdown(content: string): { html: string; frontmatter: MarkdownFrontmatter };
export function markdownToHtml(content: string): string;
```

---

## pdf-client.ts

**Purpose:** Client-side PDF generation using html2pdf.js

### Functions

```typescript
export async function generatePdf(element: HTMLElement, options?: PdfOptions): Promise<void>;
export async function generatePdfBlob(element: HTMLElement, options?: PdfOptions): Promise<Blob>;
export function generateHtmlExport(element: HTMLElement, title: string): string;
export function downloadHtml(element: HTMLElement, filename: string, title: string): void;
export function downloadMarkdown(content: string, filename: string): void;
```

### PdfOptions

```typescript
interface PdfOptions {
  filename?: string;              // Without .pdf extension
  margin?: number;                // In mm
  imageQuality?: number;          // 0-1
  scale?: number;                 // html2canvas scale
  format?: "a4" | "letter" | "legal";
  orientation?: "portrait" | "landscape";
}
```

---

## credit-card-analytics.ts

**Purpose:** Credit card analysis and payoff calculations

### Types

```typescript
export interface MonthlyUtilizationPoint { ... }
export interface PaymentAnalysisPoint { ... }
export interface PayoffScenario { ... }
export interface PayoffProjectionPoint { ... }
```

### Functions

```typescript
// Detection
export function isPaymentTransaction(tx: TransactionsFormat): boolean;
export function isInterestCharge(tx: TransactionsFormat): boolean;

// Analysis
export function calculateMonthlyUtilization(transactions: TransactionsFormat[], creditLimit: number): MonthlyUtilizationPoint[];
export function analyzePayments(transactions: TransactionsFormat[], minimumPayment: number, interestRate: number): PaymentAnalysisPoint[];
export function calculatePayoffScenarios(balance: number, interestRate: number, minimumPayment: number, customPayment?: number): PayoffScenario[];
export function calculateBalanceHistory(transactions: TransactionsFormat[], creditLimit: number, currentBalance?: number): MonthlyUtilizationPoint[];
export function getCurrentBalance(account: Account, transactions: TransactionsFormat[]): number;
```

---

## credit-card-metrics.ts

**Purpose:** Credit card metric definitions and calculations

### Types

```typescript
export type MetricId = "availableCredit" | "creditUtilization" | "overLimit" | "minimumPayment" | ...;

export interface MetricDefinition {
  id: MetricId;
  label: string;
  description: string;
  category: "credit-health" | "payment" | "balance" | "spending" | "financial" | "analytics";
  icon: string;
  defaultEnabled: boolean;
  requiresField?: keyof Account;
}

export interface CalculatedMetrics { ... }
```

### Exports

```typescript
export const AVAILABLE_METRICS: MetricDefinition[];
export const DEFAULT_ENABLED_METRICS: MetricId[];

export function getEnabledMetrics(account: Account): MetricId[];
export function getAvailableMetricsForAccount(account: Account): MetricDefinition[];
export function isMetricAvailable(metric: MetricDefinition, account: Account): boolean;
export function calculateAllMetrics(account: Account): CalculatedMetrics;
```

---

## utility-analytics.ts

**Purpose:** Utility account analytics (anomaly detection, forecasting)

### Types

```typescript
export type AnomalyType = "high_usage" | "low_usage" | "high_cost" | "usage_spike" | "potential_leak" | "billing_error";
export type AnomalySeverity = "info" | "warning" | "critical";

export interface UsageAnomaly { ... }
export interface UsageForecast { ... }
export interface BillProjection { ... }
export interface UtilityStats { ... }
```

### Functions

```typescript
export function calculateUtilityStats(records: UtilityUsage[]): UtilityStats | null;
export function detectAnomalies(records: UtilityUsage[], options?: { zsScoreThreshold?: number; monthOverMonthThreshold?: number; potentialLeakDays?: number }): UsageAnomaly[];
export function forecastUsage(records: UtilityUsage[], options?: { targetMonth?: number; useSeasonal?: boolean }): UsageForecast | null;
export function projectBill(records: UtilityUsage[], options?: { projectedUsage?: number; targetMonth?: number }): BillProjection | null;
```

---

## date-frequency.ts

**Purpose:** Generate recurring dates for schedules

### Functions

```typescript
export function nextDaily(start: DateValue, end: DateValue | null, interval: number, limit: number): DateValue[];
export function nextWeekly(start: DateValue, end: DateValue | null, interval: number, weekDays: number[], limit: number): DateValue[];
export function nextMonthly(start: DateValue, end: DateValue | null, interval: number, days: number[] | number | null, weeks: number[], weekDays: number[], limit: number): DateValue[];
export function nextYearly(actualStart: DateValue, start: DateValue, end: DateValue | null, interval: number, limit: number): DateValue[];
```

---

## options.ts

**Purpose:** Generate option arrays for select components

### Exports

```typescript
export type Option<T> = { value: T; label: string };

export const dayOptions: Option<number>[];           // 1-31 with ordinal suffixes
export const lastDayOption: Option<number>;          // { value: 32, label: "last day" }
export const weekdayOptions: Option<number>[];       // Sunday=0 to Saturday=6
export const weekOptions: Option<number>[];          // first, second, third, fourth, last
export const monthOptions: Option<number>[];         // January=1 to December=12
export const isoWeekdayOptions: Option<string>[];    // Monday=1 to Sunday=7 (ISO 8601)
export const monthStringOptions: Option<string>[];   // Months with string values
```

---

## Additional Files

### accessibility-colors.ts
WCAG-compliant color contrast utilities.

### account-display.ts
Account display formatting helpers.

### ai-response-parser.ts
Parse AI-generated responses for categorization.

### bind-helpers.ts
Svelte binding utilities.

### budget-calculations.ts
Budget allocation and rollover calculations.

### budget-validation.ts
Budget form validation.

### chart-color-config.ts
Chart color configuration and theme mappings.

### confidence-colors.ts
Confidence level color indicators.

### date-formatters.ts
Additional date formatting utilities.

### date-options.ts
Date range option generators.

### font-classes.ts
Font utility classes.

### generate-unique-slug.ts
Slug generation utilities.

### holidays.ts
Holiday detection and calendar utilities.

### icon-validation.ts
Icon name validation.

```typescript
export const VALID_ICON_NAMES: readonly string[];
export function isValidIconName(iconName: string): boolean;
export type ValidIconName = (typeof VALID_ICON_NAMES)[number];
```

### import.ts
Import preview utilities.

```typescript
export function parsePreviewAmount(value: any): string;
export function formatPreviewAmount(value: any, isDebit: boolean): string;
```

### input-sanitization.ts
XSS prevention and input validation.

```typescript
export function sanitizeTextInput(input: string | null | undefined): string | null;
export function containsHtmlTags(input: string): boolean;
export function validateAndSanitizeNotes(notes: string | null | undefined): { isValid: boolean; sanitized: string | null; error?: string };
```

### payee-matching.ts
Payee name comparison.

```typescript
export function normalizePayeeForMatching(payeeName: string): string;
export function arePayeesSimilar(payee1: string, payee2: string): boolean;
export function findSimilarPayeeTransactions<T>(...): { item: T; index: number }[];
```

### slug-utils.ts
Database-safe slug generation.

```typescript
export function generateUniqueSlugForDB(baseName: string, existingSlugs: string[]): string;
export const generateUniqueSlug = generateUniqueSlugForDB; // Deprecated alias
```

### wizard-validation.ts
Multi-step wizard validation.

### import/payment-processor-filter.ts
Payment processor detection for imports.

```typescript
export const PAYMENT_PROCESSORS: ProcessorPattern[];
export function detectPaymentProcessor(payeeName: string): ProcessorDetection | null;
export function filterPaymentProcessor(payeeName: string): string;
export function analyzePaymentProcessors(payeeNames: string[]): Map<string, ProcessorDetection[]>;
export function countProcessorTransactions(payeeNames: string[]): { total: number; byProcessor: Map<string, number> };
```

---

## Server-Side Utilities

### lib/server/utils/formatters.ts (NEW)

**Purpose:** Server-side formatting utilities safe for tRPC routes and services

```typescript
// Currency
export function formatCurrency(amount: number, decimals?: boolean): string;
export function formatCurrencyAbs(amount: number): string;

// Numbers
export function formatNumber(value: number): string;
export function formatNumberFixed(value: number, decimals: number): string;
export function formatCompact(value: number, decimals?: number): string;  // 1500000 → "1.5M"

// Percentages
export function formatPercent(value: number, decimals?: number): string;
export function formatPercentChange(value: number, decimals?: number): string;
export function formatPercentRaw(value: number, decimals?: number): string;

// Dates
export function formatShortDate(date: Date | string): string;     // "Jan 15"
export function formatMonthYear(date: Date | string): string;     // "January 2024"
export function formatFullDate(date: Date | string): string;      // "January 15, 2024"
export function formatISODate(date: Date): string;                // "2024-01-15"

// Files
export function formatFileSize(bytes: number): string;
```

---

## Usage Patterns

### Formatting Currency
```typescript
import { formatCurrency } from '$lib/utils';
const display = formatCurrency(1234.56); // "$1,234.56"
```

### Formatting Percentages

```typescript
import { formatPercent, formatPercentChange } from '$lib/utils';
formatPercent(0.75);          // "75%"
formatPercent(0.756, 1);      // "75.6%"
formatPercentChange(0.15);    // "+15.0%"
formatPercentChange(-0.08);   // "-8.0%"
```

### Server-Side Formatting (tRPC routes)

```typescript
import { formatCurrency, formatPercent } from '$lib/server/utils/formatters';
// Same API as client-side but without user preferences
```

### Date Manipulation
```typescript
import { currentDate, toISOString, getNextWeekday } from '$lib/utils/dates';
const nextMonday = getNextWeekday(currentDate, 1);
const isoDate = toISOString(nextMonday);
```

### Caching
```typescript
import { queryCache, cacheKeys } from '$lib/utils/cache';
const cached = queryCache.get(cacheKeys.allAccounts());
if (!cached) {
  const data = await fetchAccounts();
  queryCache.set(cacheKeys.allAccounts(), data, 300000);
}
```

### Encrypted Fields
```typescript
import { createEncryptedFieldState } from '$lib/utils/use-encryption.svelte';
const notesState = createEncryptedFieldState(() => transaction.notes);
// Access: notesState.value, notesState.isLoading, notesState.needsUnlock
```

### Toast Notifications
```typescript
import { toast } from '$lib/utils/toast-interceptor';
toast.success('Account created');
toast.error('Failed to save');
```

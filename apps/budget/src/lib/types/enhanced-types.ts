/**
 * Enhanced TypeScript types for improved type safety
 */

// Utility types for better type constraints
export type NonEmptyString = string & {__brand: "NonEmptyString"};
export type PositiveNumber = number & {__brand: "PositiveNumber"};
export type ValidEmail = string & {__brand: "ValidEmail"};
export type ISODateString = string & {__brand: "ISODateString"};
export type CurrencyAmount = number & {__brand: "CurrencyAmount"};

// Brand type helpers
export type Brand<T, TBrand> = T & {__brand: TBrand};

// Utility type for creating branded types
export const brand = <T, TBrand>(value: T): Brand<T, TBrand> => value as Brand<T, TBrand>;

// Type guards for branded types
export const isNonEmptyString = (value: string): value is NonEmptyString => value.length > 0;

export const isPositiveNumber = (value: number): value is PositiveNumber =>
  value > 0 && Number.isFinite(value);

export const isValidEmail = (value: string): value is ValidEmail =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const isISODateString = (value: string): value is ISODateString =>
  !isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);

export const isCurrencyAmount = (value: number): value is CurrencyAmount =>
  Number.isFinite(value) && Math.abs(value) < Number.MAX_SAFE_INTEGER;

// Enhanced entity types with strict validation
export interface EnhancedAccount {
  readonly id: PositiveNumber;
  name: NonEmptyString;
  type: AccountType;
  balance: CurrencyAmount;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface EnhancedTransaction {
  readonly id: PositiveNumber;
  accountId: PositiveNumber;
  amount: CurrencyAmount;
  description: NonEmptyString;
  date: ISODateString;
  categoryId?: PositiveNumber;
  payeeId?: PositiveNumber;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface EnhancedUser {
  readonly id: PositiveNumber;
  name: NonEmptyString;
  email: ValidEmail;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// Strict enum types
export const AccountTypes = {
  CHECKING: "checking",
  SAVINGS: "savings",
  CREDIT: "credit",
  INVESTMENT: "investment",
} as const;

export type AccountType = (typeof AccountTypes)[keyof typeof AccountTypes];

export const TransactionTypes = {
  INCOME: "income",
  EXPENSE: "expense",
  TRANSFER: "transfer",
} as const;

export type TransactionType = (typeof TransactionTypes)[keyof typeof TransactionTypes];

// API response types with strict validation
export interface APISuccess<T = unknown> {
  readonly success: true;
  readonly data: T;
  readonly timestamp: ISODateString;
}

export interface APIError {
  readonly success: false;
  readonly error: {
    readonly code: NonEmptyString;
    readonly message: NonEmptyString;
    readonly details?: Record<string, unknown>;
  };
  readonly timestamp: ISODateString;
}

export type APIResponse<T = unknown> = APISuccess<T> | APIError;

// Form validation types
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: Record<string, NonEmptyString[]>;
}

export interface ValidatedFormData<T> {
  readonly data: T;
  readonly validation: ValidationResult;
}

// Database operation types
export type CreateInput<T> = Omit<T, "id" | "createdAt" | "updatedAt">;
export type UpdateInput<T> = Partial<Omit<T, "id" | "createdAt" | "updatedAt">>;

// Pagination types with strict constraints
export interface PaginationParams {
  page: PositiveNumber;
  pageSize: PositiveNumber & {__constraint: "max100"};
  sortBy?: NonEmptyString;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  readonly data: readonly T[];
  readonly pagination: {
    readonly page: PositiveNumber;
    readonly pageSize: PositiveNumber;
    readonly total: PositiveNumber;
    readonly totalPages: PositiveNumber;
    readonly hasNext: boolean;
    readonly hasPrevious: boolean;
  };
}

// Filter types with type safety
export interface FilterParams {
  readonly search?: NonEmptyString;
  readonly dateFrom?: ISODateString;
  readonly dateTo?: ISODateString;
  readonly accountIds?: readonly PositiveNumber[];
  readonly categoryIds?: readonly PositiveNumber[];
  readonly amountMin?: CurrencyAmount;
  readonly amountMax?: CurrencyAmount;
}

// State management types
export interface AppState {
  readonly user: EnhancedUser | null;
  readonly selectedAccount: EnhancedAccount | null;
  readonly filters: FilterParams;
  readonly loading: {
    readonly accounts: boolean;
    readonly transactions: boolean;
    readonly categories: boolean;
  };
  readonly errors: {
    readonly accounts: string | null;
    readonly transactions: string | null;
    readonly categories: string | null;
  };
}

// Component prop types with strict validation
export interface BaseComponentProps {
  readonly id?: NonEmptyString;
  readonly className?: string;
  readonly testId?: NonEmptyString;
}

export interface FormComponentProps extends BaseComponentProps {
  readonly onSubmit: (data: unknown) => Promise<void> | void;
  readonly onCancel?: () => void;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly errors?: Record<string, NonEmptyString[]>;
}

export interface DataTableProps<T> extends BaseComponentProps {
  readonly data: readonly T[];
  readonly columns: readonly DataTableColumn<T>[];
  readonly pagination?: PaginationParams;
  readonly onSort?: (column: keyof T, direction: "asc" | "desc") => void;
  readonly onFilter?: (filters: FilterParams) => void;
  readonly onSelect?: (item: T) => void;
  readonly loading?: boolean;
}

export interface DataTableColumn<T> {
  readonly key: keyof T;
  readonly label: NonEmptyString;
  readonly sortable?: boolean;
  readonly filterable?: boolean;
  readonly formatter?: (value: T[keyof T]) => string;
  readonly className?: string;
}

// Event types with strict payloads
export interface AppEvent<TType extends string = string, TPayload = unknown> {
  readonly type: TType;
  readonly payload: TPayload;
  readonly timestamp: ISODateString;
  readonly source?: NonEmptyString;
}

export type AccountCreatedEvent = AppEvent<"account:created", EnhancedAccount>;
export type AccountUpdatedEvent = AppEvent<"account:updated", EnhancedAccount>;
export type AccountDeletedEvent = AppEvent<"account:deleted", {id: PositiveNumber}>;

export type TransactionCreatedEvent = AppEvent<"transaction:created", EnhancedTransaction>;
export type TransactionUpdatedEvent = AppEvent<"transaction:updated", EnhancedTransaction>;
export type TransactionDeletedEvent = AppEvent<"transaction:deleted", {id: PositiveNumber}>;

// Helper types for working with readonly data
export type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Validation schema types
export interface ValidationSchema<T> {
  readonly validate: (data: unknown) => data is T;
  readonly validateAsync: (data: unknown) => Promise<boolean>;
  readonly getErrors: (data: unknown) => ValidationResult;
}

// Async operation types
export interface AsyncOperation<T = unknown> {
  readonly status: "idle" | "loading" | "success" | "error";
  readonly data?: T;
  readonly error?: NonEmptyString;
  readonly timestamp?: ISODateString;
}

// Cache types
export interface CacheEntry<T> {
  readonly data: T;
  readonly timestamp: ISODateString;
  readonly ttl: PositiveNumber; // milliseconds
  readonly key: NonEmptyString;
}

export interface CacheManager {
  readonly get: <T>(key: NonEmptyString) => CacheEntry<T> | null;
  readonly set: <T>(key: NonEmptyString, data: T, ttl?: PositiveNumber) => void;
  readonly delete: (key: NonEmptyString) => boolean;
  readonly clear: () => void;
  readonly size: () => PositiveNumber;
}

// Configuration types
export interface AppConfig {
  readonly api: {
    readonly baseUrl: NonEmptyString;
    readonly timeout: PositiveNumber;
    readonly retryAttempts: PositiveNumber;
  };
  readonly ui: {
    readonly pageSize: PositiveNumber & {__constraint: "max100"};
    readonly debounceMs: PositiveNumber;
    readonly animationDuration: PositiveNumber;
  };
  readonly cache: {
    readonly defaultTtl: PositiveNumber;
    readonly maxSize: PositiveNumber;
    readonly enabled: boolean;
  };
}

// Type utility for exhaustive checks
export const assertNever = (value: never): never => {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
};

// Type-safe object keys
export const getTypedKeys = <T extends Record<string, unknown>>(obj: T): (keyof T)[] =>
  Object.keys(obj) as (keyof T)[];

// Type-safe object entries
export const getTypedEntries = <T extends Record<string, unknown>>(
  obj: T
): [keyof T, T[keyof T]][] => Object.entries(obj) as [keyof T, T[keyof T]][];

// Type guards for complex objects
export const isAPISuccess = <T>(response: APIResponse<T>): response is APISuccess<T> =>
  response.success === true;

export const isAPIError = (response: APIResponse): response is APIError =>
  response.success === false;

// Type-safe environment variable access
export interface EnvironmentVariables {
  readonly NODE_ENV: "development" | "production" | "test";
  readonly DATABASE_URL: NonEmptyString;
  readonly API_BASE_URL?: NonEmptyString;
  readonly LOG_LEVEL?: "debug" | "info" | "warn" | "error";
}

export const getEnvironmentVariable = <K extends keyof EnvironmentVariables>(
  key: K
): EnvironmentVariables[K] | undefined => {
  const value = process.env[key] as EnvironmentVariables[K] | undefined;
  return value;
};

export const getRequiredEnvironmentVariable = <K extends keyof EnvironmentVariables>(
  key: K
): NonNullable<EnvironmentVariables[K]> => {
  const value = getEnvironmentVariable(key);
  if (value === undefined) {
    throw new Error(`Required environment variable ${String(key)} is not set`);
  }
  return value;
};

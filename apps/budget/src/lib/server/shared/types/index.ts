// Re-export all shared types
export * from "./errors";

// Common types used across domains
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface SortOptions {
  field: string;
  direction: "asc" | "desc";
}

export interface FilterOptions {
  field: string;
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "like" | "in" | "nin";
  value: unknown;
}

export interface SearchOptions {
  query?: string;
  fields?: string[];
  pagination?: PaginationOptions;
  sort?: SortOptions[];
  filters?: FilterOptions[];
}

// Operation result wrapper
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Audit trail information
export interface AuditInfo {
  createdAt: Date;
  createdBy?: string;
  updatedAt?: Date;
  updatedBy?: string;
  version?: number;
}

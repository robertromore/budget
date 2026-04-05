export type ChatStatus = "idle" | "submitted" | "streaming" | "error";

export interface ChatContext {
  /** Current page/route the user is on */
  page: string;
  /** Selected entity type (account, payee, transaction, etc.) */
  entityType?: "account" | "payee" | "transaction" | "category" | "budget";
  /** Selected entity ID */
  entityId?: number;
  /** Additional context data (varies by page) */
  data?: Record<string, unknown>;
}

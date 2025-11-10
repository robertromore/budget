import type {Payee} from '$lib/schema/payees';

export type GroupStrategy =
  | 'none'           // Flat virtualized list
  | 'type'           // Group by payeeType
  | 'category'       // Group by payeeCategory (UI organization)
  | 'alphabetical'   // A-Z sections
  | 'usage'          // Frequent, Recent, Occasional, Rare
  | 'smart';         // ML-driven (future)

export type DisplayMode = 'compact' | 'normal' | 'detailed';

export interface TransactionContext {
  amount?: number;
  categoryId?: number;
  description?: string;
  accountId?: number;
  date?: string;
}

export interface PayeeGroup {
  label: string;
  payees: Payee[];
  count: number;
  isExpanded: boolean;
}

export interface QuickAccessSections {
  recent: Payee[];
  frequent: Payee[];
  suggested: Payee[];
}

export interface AdvancedPayeeSelectorProps {
  // Core
  value?: number | null;
  onValueChange: (payeeId: number | null) => void;

  // Context (for ML suggestions)
  transactionContext?: TransactionContext;

  // Display
  displayMode?: DisplayMode;
  groupStrategy?: GroupStrategy;
  placeholder?: string;

  // Features
  showQuickAccess?: boolean;
  enableMLSuggestions?: boolean;
  allowCreate?: boolean;

  // Customization
  maxVisibleItems?: number; // for virtual list
  popoverWidth?: string;
  buttonClass?: string;
}

export interface PayeeWithMetadata extends Payee {
  _score?: number;          // Search/ML relevance score
  _isSuggested?: boolean;   // ML suggestion
  _isRecent?: boolean;      // Recently used
  _isFrequent?: boolean;    // Frequently used
  _matchedField?: string;   // Which field matched search
}

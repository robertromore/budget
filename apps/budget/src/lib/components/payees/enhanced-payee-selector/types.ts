import type { Payee } from "$lib/schema/payees";

export type LayoutMode = "slide-in" | "side-by-side";

export type EditMode = "view" | "edit" | "create";

export type GroupStrategy =
	| "none"
	| "type"
	| "category"
	| "alphabetical"
	| "usage";

export type DisplayMode = "compact" | "normal";

export interface PayeeGroup {
	label: string;
	payees: Payee[];
	count: number;
}

export interface TransactionContext {
	amount?: number;
	categoryId?: number;
	description?: string;
	accountId?: number;
	date?: string;
}

export interface EnhancedPayeeSelectorProps {
	value?: number | null;
	onValueChange: (payeeId: number | null) => void;
	transactionContext?: TransactionContext;
	groupStrategy?: GroupStrategy;
	displayMode?: DisplayMode;
	allowCreate?: boolean;
	allowEdit?: boolean;
	buttonClass?: string;
	placeholder?: string;
}

export interface PayeeListItemProps {
	payee: Payee;
	isSelected: boolean;
	isFocused: boolean;
	displayMode: DisplayMode;
	onFocus: () => void;
	onSelect: () => void;
	onEdit: () => void;
}

export interface PayeeDetailPanelProps {
	payee?: Payee | null;
	mode: EditMode;
	initialName?: string;
	onModeChange: (mode: EditMode) => void;
	onSave: (payee: Partial<Payee>) => Promise<void>;
	onSelect: () => void;
	onCancel: () => void;
}

export interface PayeeQuickEditFormProps {
	payee?: Payee | null;
	initialName?: string;
	onSave: (data: QuickEditPayeeData) => Promise<void>;
	onCancel: () => void;
}

export interface QuickEditPayeeData {
	name: string;
	defaultCategoryId: number | null;
	notes: string | null;
}

export interface FlatListItem {
	type: "header" | "payee";
	id: string;
	data: PayeeGroup | Payee;
}

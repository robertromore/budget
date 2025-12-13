import type { Category } from "$lib/schema/categories";

export type LayoutMode = "slide-in" | "side-by-side";

export type EditMode = "view" | "edit" | "create";

export type DisplayMode = "compact" | "normal";

export interface CategoryGroup {
	label: string;
	categories: Category[];
	count: number;
}

export interface EnhancedCategorySelectorProps {
	value?: number | null;
	onValueChange: (categoryId: number | null) => void;
	displayMode?: DisplayMode;
	allowCreate?: boolean;
	allowEdit?: boolean;
	buttonClass?: string;
	placeholder?: string;
}

export interface CategoryListItemProps {
	category: Category;
	isSelected: boolean;
	isFocused: boolean;
	displayMode: DisplayMode;
	onFocus: () => void;
	onSelect: () => void;
	onEdit: () => void;
}

export interface CategoryDetailPanelProps {
	category?: Category | null;
	mode: EditMode;
	initialName?: string;
	showBackButton?: boolean;
	onModeChange: (mode: EditMode) => void;
	onSave: (data: QuickEditCategoryData) => Promise<void>;
	onSelect: () => void;
	onBack: () => void;
}

export interface CategoryQuickEditFormProps {
	category?: Category | null;
	initialName?: string;
	onSave: (data: QuickEditCategoryData) => Promise<void>;
	onCancel: () => void;
}

export interface QuickEditCategoryData {
	name: string;
	parentId: number | null;
	categoryType: string;
	categoryIcon: string | null;
	categoryColor: string | null;
	notes: string | null;
}

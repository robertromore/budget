export type IntelligenceMode = 'none' | 'ml' | 'llm';

export interface DisabledMode {
	mode: IntelligenceMode;
	reason?: string;
}

// Enhancement tracking types for persisted AI state
export interface FieldEnhancementInfo {
	fieldName: string;
	isEnhanced: boolean;
	lastEnhancedAt?: string;
	lastMode?: 'ml' | 'llm';
	lastConfidence?: number;
	enhancementCount?: number;
}

export interface PayeeEnhancementState {
	fieldModes: Record<string, IntelligenceMode>;
	enhancedFields: Set<string>;
	enhancementInfo: Map<string, FieldEnhancementInfo>;
}

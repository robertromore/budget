/**
 * Fine-tuning Module
 *
 * Tools for generating training data and creating specialized budget assistant models.
 *
 * Two approaches:
 * 1. Synthetic data (generator.ts) - Privacy-safe, shareable, works immediately
 * 2. Real data (real-data-generator.ts) - Personalized, more accurate, private
 *
 * @example Synthetic data
 * ```typescript
 * import { generateTrainingDataset, exportToJSONL } from '$lib/server/ai/fine-tuning';
 *
 * const dataset = generateTrainingDataset({ minQuality: 4 });
 * const jsonl = exportToJSONL(dataset);
 * ```
 *
 * @example Real data (personalized)
 * ```typescript
 * import { generateRealDataset, exportRealToJSONL } from '$lib/server/ai/fine-tuning';
 *
 * const dataset = await generateRealDataset(workspaceId);
 * const jsonl = exportRealToJSONL(dataset);
 * ```
 */

// Synthetic data generator (shareable, privacy-safe)
export {
	generateTrainingDataset,
	exportToJSONL,
	exportToAlpaca,
} from "./generator";

// Real data generator (personalized, private)
export {
	generateRealDataset,
	exportRealToJSONL,
} from "./real-data-generator";

// Types and utilities
export {
	BUDGET_ASSISTANT_SYSTEM_PROMPT,
	toAlpacaFormat,
	toShareGPTFormat,
	toJSONLFormat,
	type TrainingExample,
	type TrainingMessage,
	type TrainingCategory,
	type TrainingDataset,
	type ExportFormat,
} from "./types";

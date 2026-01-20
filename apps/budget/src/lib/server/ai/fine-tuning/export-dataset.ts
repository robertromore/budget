/**
 * Export Training Dataset Script
 *
 * Generates and exports training data for fine-tuning.
 * Run with: npx tsx src/lib/server/ai/fine-tuning/export-dataset.ts
 */

import * as fs from "fs";
import * as path from "path";
import { getCurrentTimestamp } from "$lib/utils/dates";
import { exportToAlpaca, exportToJSONL, generateTrainingDataset } from "./generator";

const OUTPUT_DIR = path.join(process.cwd(), "training-data");

async function main() {
	console.log("Generating training dataset...\n");

	// Generate dataset
	const dataset = generateTrainingDataset({
		includeToolCalls: true,
		minQuality: 4,
	});

	console.log(`Generated ${dataset.count} training examples`);
	console.log("\nCategory distribution:");
	for (const [category, count] of Object.entries(dataset.categories)) {
		console.log(`  ${category}: ${count}`);
	}

	// Create output directory
	if (!fs.existsSync(OUTPUT_DIR)) {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	const timestamp = getCurrentTimestamp();

	// JSONL format (most common)
	const jsonlPath = path.join(OUTPUT_DIR, `budget-assistant-${timestamp}.jsonl`);
	fs.writeFileSync(jsonlPath, exportToJSONL(dataset));
	console.log(`\nExported JSONL: ${jsonlPath}`);

	// Alpaca format
	const alpacaPath = path.join(OUTPUT_DIR, `budget-assistant-${timestamp}-alpaca.json`);
	fs.writeFileSync(alpacaPath, exportToAlpaca(dataset));
	console.log(`Exported Alpaca: ${alpacaPath}`);

	// Full dataset with metadata
	const fullPath = path.join(OUTPUT_DIR, `budget-assistant-${timestamp}-full.json`);
	fs.writeFileSync(fullPath, JSON.stringify(dataset, null, 2));
	console.log(`Exported Full: ${fullPath}`);

	console.log("\nDone! Use these files with your fine-tuning framework:");
	console.log("  - Unsloth/HuggingFace: Use the .jsonl file");
	console.log("  - LLaMA-Factory: Use the alpaca .json file");
	console.log("  - Analysis: Use the full .json file");
}

main().catch(console.error);

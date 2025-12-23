/**
 * Export Personal Training Dataset Script
 *
 * Generates training data from YOUR actual financial data.
 *
 * WARNING: The output contains personal financial information.
 * Do not share these files or the resulting model.
 *
 * Usage:
 *   bun run src/lib/server/ai/fine-tuning/export-real-data.ts
 *   bun run src/lib/server/ai/fine-tuning/export-real-data.ts --workspace 2
 */

import * as fs from "fs";
import * as path from "path";
import { exportRealToJSONL, generateRealDataset } from "./real-data-generator";

const OUTPUT_DIR = path.join(process.cwd(), "training-data", "personal");

async function main() {
	// Parse workspace ID from args
	const args = process.argv.slice(2);
	const workspaceIndex = args.indexOf("--workspace");
	const workspaceId = workspaceIndex !== -1 ? parseInt(args[workspaceIndex + 1]!, 10) : 1;

	if (isNaN(workspaceId)) {
		console.error("Invalid workspace ID");
		process.exit(1);
	}

	console.log("╔══════════════════════════════════════════════════════════╗");
	console.log("║  PERSONAL TRAINING DATA GENERATOR                        ║");
	console.log("║                                                          ║");
	console.log("║  ⚠️  WARNING: Output contains personal financial data    ║");
	console.log("║  Do not share the generated files or resulting model     ║");
	console.log("╚══════════════════════════════════════════════════════════╝");
	console.log("");

	console.log(`Generating personal training dataset for workspace ${workspaceId}...\n`);

	try {
		// Generate dataset from real data
		const dataset = await generateRealDataset(workspaceId);

		console.log(`\nGenerated ${dataset.count} training examples from your data`);
		console.log("\nCategory distribution:");
		for (const [category, count] of Object.entries(dataset.categories)) {
			console.log(`  ${category}: ${count}`);
		}

		if (dataset.count === 0) {
			console.log("\n⚠️  No training examples generated. Make sure you have:");
			console.log("   - Accounts with balances");
			console.log("   - Recent transactions (last 30 days)");
			console.log("   - Payees and categories set up");
			process.exit(0);
		}

		// Create output directory
		if (!fs.existsSync(OUTPUT_DIR)) {
			fs.mkdirSync(OUTPUT_DIR, { recursive: true });
		}

		// Create .gitignore in personal folder
		const gitignorePath = path.join(OUTPUT_DIR, ".gitignore");
		if (!fs.existsSync(gitignorePath)) {
			fs.writeFileSync(gitignorePath, "# Personal training data - do not commit\n*\n!.gitignore\n");
		}

		const timestamp = new Date().toISOString().split("T")[0];

		// Export JSONL
		const jsonlPath = path.join(OUTPUT_DIR, `personal-${timestamp}.jsonl`);
		fs.writeFileSync(jsonlPath, exportRealToJSONL(dataset));
		console.log(`\n✅ Exported JSONL: ${jsonlPath}`);

		// Export full dataset with metadata
		const fullPath = path.join(OUTPUT_DIR, `personal-${timestamp}-full.json`);
		fs.writeFileSync(fullPath, JSON.stringify(dataset, null, 2));
		console.log(`✅ Exported Full: ${fullPath}`);

		console.log("\n" + "═".repeat(60));
		console.log("NEXT STEPS:");
		console.log("═".repeat(60));
		console.log("\n1. Review the generated data for accuracy");
		console.log("\n2. Optionally merge with synthetic data:");
		console.log(`   cat training-data/budget-assistant-*.jsonl ${jsonlPath} > training-data/combined.jsonl`);
		console.log("\n3. Fine-tune your model:");
		console.log("   cd training-data");
		console.log(`   python finetune-unsloth.py --data personal/${path.basename(jsonlPath)}`);
		console.log("\n4. The resulting model will be personalized to YOUR finances");
		console.log("\n⚠️  Remember: Keep these files private!");
	} catch (error) {
		console.error("\nError generating dataset:", error);
		process.exit(1);
	}
}

main();

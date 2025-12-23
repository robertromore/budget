/**
 * LLM-Based Training Data Augmentation
 *
 * Uses a larger LLM (Claude, GPT-4, or local Ollama) to generate additional
 * training examples for fine-tuning the budget assistant.
 *
 * Usage:
 *   # With Ollama (default)
 *   bun run training-data/augment-with-llm.ts
 *
 *   # With specific provider
 *   PROVIDER=anthropic ANTHROPIC_API_KEY=sk-... bun run training-data/augment-with-llm.ts
 *   PROVIDER=openai OPENAI_API_KEY=sk-... bun run training-data/augment-with-llm.ts
 *
 *   # Specify output count
 *   bun run training-data/augment-with-llm.ts --count 50
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

// Training example interface
interface TrainingExample {
	id: string;
	category: string;
	source: "llm_augmented";
	quality: number;
	messages: Array<{
		role: "system" | "user" | "assistant";
		content: string;
	}>;
}

// Categories we want to generate examples for
const CATEGORIES = [
	"account_balance",
	"spending_analysis",
	"budget_management",
	"transaction_search",
	"payee_management",
	"category_suggestion",
	"financial_advice",
	"forecasting",
	"general_chat",
] as const;

// System prompt for the augmentation LLM
const AUGMENTATION_PROMPT = `You are helping create training data for a personal finance assistant chatbot. Your task is to generate realistic, high-quality conversation examples.

The budget assistant helps users:
- Check account balances and net worth
- Analyze spending patterns and trends
- Manage budgets and track progress
- Search and categorize transactions
- Manage payees and merchants
- Get personalized financial advice
- Forecast future expenses and savings

For each example, generate:
1. A realistic user question or request
2. A helpful, detailed assistant response with:
   - Specific numbers and dates (use realistic values)
   - Markdown formatting (bold, tables, lists)
   - Actionable insights when appropriate
   - Follow-up questions or suggestions

The assistant should be:
- Concise but thorough
- Use specific numbers (not vague)
- Provide context and trends
- Be helpful without being preachy
- Use markdown formatting effectively

Generate diverse examples covering different:
- Question phrasings (formal, casual, abbreviated)
- Financial situations (good, tight, concerning)
- Time periods (daily, weekly, monthly, yearly)
- Account types (checking, savings, credit, investment)`;

// Sample prompts for each category
const CATEGORY_PROMPTS: Record<string, string[]> = {
	account_balance: [
		"Questions about checking/savings balances",
		"Net worth inquiries",
		"Credit card balance and limit questions",
		"Investment account values",
		"Comparing balances across accounts",
	],
	spending_analysis: [
		"Monthly spending breakdowns",
		"Category-specific spending",
		"Spending trends and comparisons",
		"Finding unusual spending patterns",
		"Cost-per-use analysis for subscriptions",
	],
	budget_management: [
		"Budget status and progress",
		"Creating new budgets",
		"Adjusting budget amounts",
		"Budget recommendations",
		"Over/under budget alerts",
	],
	transaction_search: [
		"Finding specific transactions",
		"Filtering by date range",
		"Searching by payee or amount",
		"Finding uncategorized transactions",
		"Detecting duplicates",
	],
	payee_management: [
		"Spending at specific merchants",
		"Merging duplicate payees",
		"Setting default categories",
		"Top merchants analysis",
		"Payee spending patterns",
	],
	category_suggestion: [
		"Categorizing ambiguous transactions",
		"Splitting transactions across categories",
		"Bulk categorization",
		"Creating new categories",
		"Category recommendations",
	],
	financial_advice: [
		"Savings strategies",
		"Debt payoff plans",
		"Budget recommendations",
		"Spending habit analysis",
		"Emergency fund planning",
	],
	forecasting: [
		"End of month balance predictions",
		"Cash flow forecasting",
		"Bill payment timing",
		"Savings goal projections",
		"Year-end net worth estimates",
	],
	general_chat: [
		"Greetings and capabilities",
		"Financial health summaries",
		"Weekly/monthly briefings",
		"App feature questions",
		"Privacy and security questions",
	],
};

// Budget assistant system prompt (from types.ts)
const BUDGET_ASSISTANT_SYSTEM_PROMPT = `You are a helpful personal finance assistant integrated into a budget tracking application. Your role is to help users understand their finances, manage their budgets, and make informed financial decisions.

You have access to the user's financial data including:
- Account balances (checking, savings, credit cards, investments)
- Transaction history
- Budget allocations and spending
- Payees and merchants
- Categories

When asked about finances, use the available tools to fetch real data. Be specific with numbers and dates.
When giving advice, be practical and actionable. Avoid generic financial advice.
Always respect user privacy - never share or reference data from other users.

Be concise but helpful. Use markdown formatting for clarity when presenting data.`;

/**
 * Generate examples using Ollama
 */
async function generateWithOllama(
	category: string,
	count: number,
	model: string = "qwen2.5:7b"
): Promise<TrainingExample[]> {
	const examples: TrainingExample[] = [];
	const prompts = CATEGORY_PROMPTS[category] || [];

	for (let i = 0; i < count; i++) {
		const promptHint = prompts[i % prompts.length];

		const prompt = `${AUGMENTATION_PROMPT}

Generate a training example for category: ${category}
Topic hint: ${promptHint}

Output format (JSON):
{
  "user_message": "The user's question",
  "assistant_response": "The assistant's detailed response with markdown formatting"
}

Generate a single example now:`;

		try {
			const response = await fetch("http://localhost:11434/api/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model,
					prompt,
					stream: false,
					format: "json",
				}),
			});

			if (!response.ok) {
				console.error(`Ollama error: ${response.statusText}`);
				continue;
			}

			const data = await response.json();
			const generated = JSON.parse(data.response);

			if (generated.user_message && generated.assistant_response) {
				examples.push({
					id: `llm_${category}_${Date.now()}_${i}`,
					category,
					source: "llm_augmented",
					quality: 4, // LLM-generated, needs review
					messages: [
						{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
						{ role: "user", content: generated.user_message },
						{ role: "assistant", content: generated.assistant_response },
					],
				});
			}
		} catch (error) {
			console.error(`Error generating example: ${error}`);
		}
	}

	return examples;
}

/**
 * Generate examples using Anthropic Claude
 */
async function generateWithAnthropic(
	category: string,
	count: number
): Promise<TrainingExample[]> {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		throw new Error("ANTHROPIC_API_KEY not set");
	}

	const examples: TrainingExample[] = [];
	const prompts = CATEGORY_PROMPTS[category] || [];

	// Generate in batches to be more efficient
	const batchSize = Math.min(count, 5);
	const batches = Math.ceil(count / batchSize);

	for (let batch = 0; batch < batches; batch++) {
		const currentCount = Math.min(batchSize, count - batch * batchSize);
		const promptHints = prompts.slice(0, currentCount).join(", ");

		const prompt = `${AUGMENTATION_PROMPT}

Generate ${currentCount} diverse training examples for category: ${category}
Cover these topics: ${promptHints}

Output format (JSON array):
[
  {
    "user_message": "The user's question",
    "assistant_response": "The assistant's detailed response"
  },
  ...
]

Generate ${currentCount} unique examples now:`;

		try {
			const response = await fetch("https://api.anthropic.com/v1/messages", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": apiKey,
					"anthropic-version": "2023-06-01",
				},
				body: JSON.stringify({
					model: "claude-3-haiku-20240307",
					max_tokens: 4096,
					messages: [{ role: "user", content: prompt }],
				}),
			});

			if (!response.ok) {
				const error = await response.text();
				console.error(`Anthropic error: ${error}`);
				continue;
			}

			const data = await response.json();
			const content = data.content[0]?.text || "";

			// Extract JSON from response
			const jsonMatch = content.match(/\[[\s\S]*\]/);
			if (jsonMatch) {
				const generated = JSON.parse(jsonMatch[0]);
				for (let i = 0; i < generated.length; i++) {
					const item = generated[i];
					if (item.user_message && item.assistant_response) {
						examples.push({
							id: `llm_${category}_${Date.now()}_${batch}_${i}`,
							category,
							source: "llm_augmented",
							quality: 4,
							messages: [
								{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
								{ role: "user", content: item.user_message },
								{ role: "assistant", content: item.assistant_response },
							],
						});
					}
				}
			}
		} catch (error) {
			console.error(`Error generating example: ${error}`);
		}
	}

	return examples;
}

/**
 * Generate examples using OpenAI
 */
async function generateWithOpenAI(
	category: string,
	count: number
): Promise<TrainingExample[]> {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		throw new Error("OPENAI_API_KEY not set");
	}

	const examples: TrainingExample[] = [];
	const prompts = CATEGORY_PROMPTS[category] || [];

	const batchSize = Math.min(count, 5);
	const batches = Math.ceil(count / batchSize);

	for (let batch = 0; batch < batches; batch++) {
		const currentCount = Math.min(batchSize, count - batch * batchSize);
		const promptHints = prompts.slice(0, currentCount).join(", ");

		const prompt = `${AUGMENTATION_PROMPT}

Generate ${currentCount} diverse training examples for category: ${category}
Cover these topics: ${promptHints}

Output format (JSON array):
[
  {
    "user_message": "The user's question",
    "assistant_response": "The assistant's detailed response"
  }
]

Generate ${currentCount} unique examples now:`;

		try {
			const response = await fetch(
				"https://api.openai.com/v1/chat/completions",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						model: "gpt-4o-mini",
						messages: [{ role: "user", content: prompt }],
						response_format: { type: "json_object" },
					}),
				}
			);

			if (!response.ok) {
				const error = await response.text();
				console.error(`OpenAI error: ${error}`);
				continue;
			}

			const data = await response.json();
			const content = data.choices[0]?.message?.content || "";
			const parsed = JSON.parse(content);
			const generated = parsed.examples || parsed;

			if (Array.isArray(generated)) {
				for (let i = 0; i < generated.length; i++) {
					const item = generated[i];
					if (item.user_message && item.assistant_response) {
						examples.push({
							id: `llm_${category}_${Date.now()}_${batch}_${i}`,
							category,
							source: "llm_augmented",
							quality: 4,
							messages: [
								{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
								{ role: "user", content: item.user_message },
								{ role: "assistant", content: item.assistant_response },
							],
						});
					}
				}
			}
		} catch (error) {
			console.error(`Error generating example: ${error}`);
		}
	}

	return examples;
}

/**
 * Main function
 */
async function main() {
	const args = process.argv.slice(2);
	const countArg = args.find((a) => a.startsWith("--count="));
	const totalCount = countArg ? parseInt(countArg.split("=")[1]!) : 50;
	const provider = process.env.PROVIDER || "ollama";
	const model = process.env.MODEL || "qwen2.5:7b";

	console.log(`\n=== LLM Training Data Augmentation ===`);
	console.log(`Provider: ${provider}`);
	console.log(`Target examples: ${totalCount}`);
	console.log();

	const allExamples: TrainingExample[] = [];
	const perCategory = Math.ceil(totalCount / CATEGORIES.length);

	for (const category of CATEGORIES) {
		console.log(`Generating ${perCategory} examples for ${category}...`);

		let examples: TrainingExample[] = [];

		try {
			switch (provider) {
				case "anthropic":
					examples = await generateWithAnthropic(category, perCategory);
					break;
				case "openai":
					examples = await generateWithOpenAI(category, perCategory);
					break;
				case "ollama":
				default:
					examples = await generateWithOllama(category, perCategory, model);
					break;
			}
		} catch (error) {
			console.error(`Error with ${category}: ${error}`);
		}

		console.log(`  Generated ${examples.length} examples`);
		allExamples.push(...examples);
	}

	console.log(`\nTotal generated: ${allExamples.length} examples`);

	// Save results
	const timestamp = new Date().toISOString().split("T")[0];
	const outputPath = join(
		process.cwd(),
		"training-data",
		`augmented-${timestamp}.jsonl`
	);

	// Convert to JSONL format
	const jsonl = allExamples
		.map((ex) =>
			JSON.stringify({
				messages: ex.messages.map((m) => ({
					role: m.role,
					content: m.content,
				})),
			})
		)
		.join("\n");

	writeFileSync(outputPath, jsonl);
	console.log(`\nSaved to: ${outputPath}`);

	// Also save full metadata version
	const fullPath = join(
		process.cwd(),
		"training-data",
		`augmented-${timestamp}-full.json`
	);
	writeFileSync(fullPath, JSON.stringify(allExamples, null, 2));
	console.log(`Full version: ${fullPath}`);

	// Combine with existing synthetic data
	const syntheticPath = join(
		process.cwd(),
		"training-data",
		`budget-assistant-${timestamp}.jsonl`
	);
	if (existsSync(syntheticPath)) {
		const synthetic = readFileSync(syntheticPath, "utf-8");
		const combinedPath = join(
			process.cwd(),
			"training-data",
			`combined-${timestamp}.jsonl`
		);
		writeFileSync(combinedPath, synthetic + "\n" + jsonl);
		console.log(`\nCombined with synthetic: ${combinedPath}`);
	}

	console.log(`\nDone! Review the generated examples for quality.`);
	console.log(
		`Examples marked with quality=4 may need manual review before training.`
	);
}

main().catch(console.error);

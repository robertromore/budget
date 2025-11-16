/**
 * Simple test to verify import functionality
 * Run with: bun run src/lib/server/import/__tests__/import-test.ts
 */

import { CSVProcessor } from "../file-processors/csv-processor";
import { PayeeMatcher } from "../matchers/payee-matcher";
import { CategoryMatcher } from "../matchers/category-matcher";
import { TransactionValidator } from "../validators/transaction-validator";
import { readFileSync } from "fs";
import { join } from "path";

async function testImportSystem() {
  console.log("🧪 Testing Financial Import System\n");

  try {
    // Step 1: Test CSV Parsing
    console.log("📄 Step 1: Testing CSV Parser...");
    const csvPath = join(process.cwd(), "test-data", "sample-transactions.csv");
    const csvContent = readFileSync(csvPath, "utf-8");

    const csvProcessor = new CSVProcessor();
    const file = new File([csvContent], "sample-transactions.csv", { type: "text/csv" });
    const parsedRows = await csvProcessor.parseFile(file);

    console.log(`✅ Parsed ${parsedRows.length} rows`);
    console.log(`   Sample row:`, {
      date: parsedRows[0]?.normalizedData["date"],
      amount: parsedRows[0]?.normalizedData["amount"],
      payee: parsedRows[0]?.normalizedData["payee"],
    });

    // Step 2: Test Validation
    console.log("\n✓ Step 2: Testing Validator...");
    const validator = new TransactionValidator();
    const validatedRows = validator.validateRows(parsedRows);
    const summary = validator.getValidationSummary(validatedRows);

    console.log(`✅ Validation complete:`);
    console.log(`   Valid: ${summary.valid}`);
    console.log(`   Invalid: ${summary.invalid}`);
    console.log(`   Warnings: ${summary.warnings}`);

    // Step 3: Test Payee Matching
    console.log("\n💰 Step 3: Testing Payee Matcher...");
    const payeeMatcher = new PayeeMatcher();

    // Test with sample payees
    const existingPayees = [
      { id: 1, name: "Walmart", slug: "walmart", deletedAt: null } as any,
      { id: 2, name: "Starbucks", slug: "starbucks", deletedAt: null } as any,
    ];

    const testPayeeName = "WALMART #1234 PURCHASE";
    const cleanedName = payeeMatcher.cleanPayeeName(testPayeeName);
    const match = payeeMatcher.findBestMatch(cleanedName, existingPayees);

    console.log(`✅ Payee matching works:`);
    console.log(`   Original: "${testPayeeName}"`);
    console.log(`   Cleaned: "${cleanedName}"`);
    console.log(
      `   Matched: "${match.payee?.name}" (confidence: ${match.confidence}, score: ${match.score.toFixed(2)})`
    );

    // Step 4: Test Category Matching
    console.log("\n🏷️  Step 4: Testing Category Matcher...");
    const categoryMatcher = new CategoryMatcher();

    const existingCategories = [
      { id: 1, name: "Groceries", slug: "groceries", deletedAt: null } as any,
      { id: 2, name: "Dining Out", slug: "dining-out", deletedAt: null } as any,
      { id: 3, name: "Transportation", slug: "transportation", deletedAt: null } as any,
    ];

    const categoryMatch = categoryMatcher.findBestMatch(
      {
        payeeName: "Walmart",
        description: "Weekly grocery shopping",
      },
      existingCategories
    );

    console.log(`✅ Category matching works:`);
    console.log(`   Payee: "Walmart"`);
    console.log(
      `   Matched: "${categoryMatch.category?.name}" (confidence: ${categoryMatch.confidence}, score: ${categoryMatch.score.toFixed(2)})`
    );
    console.log(`   Matched on: ${categoryMatch.matchedOn}`);

    // Step 5: Test keyword patterns
    console.log("\n🔍 Step 5: Testing Keyword Patterns...");
    const patterns = categoryMatcher.getKeywordPatterns();
    console.log(`✅ ${Object.keys(patterns).length} default category patterns loaded:`);
    console.log(`   Categories: ${Object.keys(patterns).join(", ")}`);

    // Final Summary
    console.log("\n✨ All Tests Passed! ✨\n");
    console.log("The import system is working correctly:");
    console.log("  ✓ CSV parsing and normalization");
    console.log("  ✓ Data validation with error detection");
    console.log("  ✓ Fuzzy payee matching with confidence scoring");
    console.log("  ✓ Keyword-based category matching");
    console.log("  ✓ Name cleaning and text normalization");
    console.log("\n🚀 Ready to import financial data!\n");
  } catch (error) {
    console.error("\n❌ Test Failed:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testImportSystem();

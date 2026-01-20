/**
 * Synthetic Training Data Generator
 *
 * Generates training examples for fine-tuning a budget assistant model.
 * Creates diverse, realistic conversations covering all app capabilities.
 */

import { nowISOString } from "$lib/utils/dates";
import {
	BUDGET_ASSISTANT_SYSTEM_PROMPT,
	type TrainingCategory,
	type TrainingDataset,
	type TrainingExample,
} from "./types";

// Realistic financial data for synthetic examples
const ACCOUNT_NAMES = [
	"Chase Checking",
	"Ally Savings",
	"Amex Platinum",
	"Vanguard 401k",
	"Fidelity Brokerage",
	"Capital One Venture",
	"Marcus Savings",
	"Schwab Checking",
];

const PAYEE_NAMES = [
	"Whole Foods",
	"Amazon",
	"Netflix",
	"Spotify",
	"Target",
	"Costco",
	"Shell Gas",
	"Starbucks",
	"Uber",
	"DoorDash",
	"Trader Joe's",
	"Home Depot",
	"CVS Pharmacy",
	"Verizon",
	"Electric Company",
	"Water Utility",
	"Rent Payment",
	"Gym Membership",
];

const CATEGORIES = [
	"Groceries",
	"Dining Out",
	"Transportation",
	"Entertainment",
	"Utilities",
	"Shopping",
	"Healthcare",
	"Subscriptions",
	"Gas",
	"Travel",
	"Personal Care",
	"Gifts",
	"Education",
	"Home Improvement",
];

/**
 * Generate a random amount in a realistic range
 */
function randomAmount(min: number, max: number): string {
	return (Math.random() * (max - min) + min).toFixed(2);
}

/**
 * Generate a random date within the last N days
 */
function randomDate(daysBack: number): string {
	const date = new Date();
	date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Pick random item from array
 */
function pick<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)]!;
}

/**
 * Generate account balance examples
 */
function generateAccountBalanceExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	// Simple balance inquiry
	examples.push({
		id: "account_balance_001",
		category: "account_balance",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What's my checking account balance?" },
			{
				role: "assistant",
				content: `Your Chase Checking account has a current balance of **$3,245.67**.

This reflects all cleared transactions as of today. You have 2 pending transactions totaling $45.23 that will post soon.`,
			},
		],
		toolCalls: [{ name: "getAccountBalance", arguments: { accountName: "Chase Checking" } }],
	});

	// All accounts overview
	examples.push({
		id: "account_balance_002",
		category: "account_balance",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Show me all my account balances" },
			{
				role: "assistant",
				content: `Here's an overview of all your accounts:

**Cash Accounts**
- Chase Checking: $3,245.67
- Ally Savings: $12,500.00
- Marcus Savings: $5,000.00

**Credit Cards**
- Amex Platinum: -$1,234.56 (limit: $15,000)
- Capital One Venture: -$456.78 (limit: $10,000)

**Investment Accounts**
- Vanguard 401k: $45,678.90
- Fidelity Brokerage: $12,345.67

**Total Net Worth: $77,078.90**`,
			},
		],
	});

	// Net worth question
	examples.push({
		id: "account_balance_003",
		category: "account_balance",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What's my net worth?" },
			{
				role: "assistant",
				content: `Your current net worth is **$77,078.90**.

This is calculated as:
- Total Assets: $78,770.24
- Total Liabilities: -$1,691.34 (credit card balances)

Your net worth has increased by $2,345.67 (+3.1%) since last month, primarily due to contributions to your 401k and market gains.`,
			},
		],
	});

	// Savings inquiry
	examples.push({
		id: "account_balance_004",
		category: "account_balance",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How much do I have in savings?" },
			{
				role: "assistant",
				content: `You have **$17,500.00** in savings accounts:

- Ally Savings: $12,500.00 (Emergency Fund)
- Marcus Savings: $5,000.00 (Vacation Fund)

Your emergency fund covers approximately 3.5 months of expenses based on your average monthly spending of $3,500.`,
			},
		],
	});

	// Additional variations
	examples.push({
		id: "account_balance_005",
		category: "account_balance",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How much money do I have?" },
			{
				role: "assistant",
				content: `You have **$20,745.67** in liquid cash:

- Chase Checking: $3,245.67
- Ally Savings: $12,500.00
- Marcus Savings: $5,000.00

Including investments, your total assets are $78,770.24. After subtracting credit card balances of $1,691.34, your net worth is **$77,078.90**.`,
			},
		],
	});

	examples.push({
		id: "account_balance_006",
		category: "account_balance",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What's my credit card balance?" },
			{
				role: "assistant",
				content: `Your credit card balances:

- **Amex Platinum**: $1,234.56 (due ${randomDate(-7)})
  - Credit limit: $15,000
  - Available: $13,765.44

- **Capital One Venture**: $456.78 (due ${randomDate(-10)})
  - Credit limit: $10,000
  - Available: $9,543.22

**Total owed: $1,691.34**

You're using 7.5% of your total credit, which is excellent for your credit score.`,
			},
		],
	});

	examples.push({
		id: "account_balance_007",
		category: "account_balance",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Do I have enough in checking to pay rent?" },
			{
				role: "assistant",
				content: `Your rent payment is typically $1,500. Currently you have **$3,245.67** in Chase Checking.

✅ Yes, you have enough! After rent, you'd have $1,745.67 remaining.

Upcoming expenses to consider:
- Electric bill (~$145): Due in 5 days
- Phone bill (~$85): Due in 8 days

You should still have about $1,515 after these bills.`,
			},
		],
	});

	examples.push({
		id: "account_balance_008",
		category: "account_balance",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How much is in my 401k?" },
			{
				role: "assistant",
				content: `Your Vanguard 401k balance is **$45,678.90**.

**Performance this year:**
- Contributions: $8,400 ($700/month)
- Employer match: $4,200
- Investment gains: $3,456.78 (+8.2%)

You're on track to max out your contributions this year. Your current allocation is 80% stocks, 20% bonds.`,
			},
		],
	});

	examples.push({
		id: "account_balance_009",
		category: "account_balance",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Show me my investment accounts" },
			{
				role: "assistant",
				content: `Your investment accounts total **$58,024.57**:

**Vanguard 401k** - $45,678.90
- YTD return: +8.2%
- Allocation: 80/20 stocks/bonds

**Fidelity Brokerage** - $12,345.67
- YTD return: +12.4%
- Holdings: AAPL, VTI, VXUS

Combined, your investments have grown $4,892.34 (+9.2%) this year.`,
			},
		],
	});

	examples.push({
		id: "account_balance_010",
		category: "account_balance",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What's my available credit?" },
			{
				role: "assistant",
				content: `Your available credit across all cards: **$23,308.66**

| Card | Used | Limit | Available |
|------|------|-------|-----------|
| Amex Platinum | $1,234.56 | $15,000 | $13,765.44 |
| Capital One Venture | $456.78 | $10,000 | $9,543.22 |

**Credit utilization: 6.7%** (Excellent - under 10%)`,
			},
		],
	});

	return examples;
}

/**
 * Generate spending analysis examples
 */
function generateSpendingAnalysisExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	// Monthly spending breakdown
	examples.push({
		id: "spending_001",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How much did I spend this month?" },
			{
				role: "assistant",
				content: `This month you've spent **$3,456.78** across 47 transactions.

**Top Categories:**
1. Groceries: $567.89 (16%)
2. Dining Out: $345.67 (10%)
3. Transportation: $289.45 (8%)
4. Shopping: $234.56 (7%)
5. Utilities: $198.90 (6%)

This is 5% lower than last month ($3,640.12). Your largest purchase was $234.56 at Home Depot on ${randomDate(15)}.`,
			},
		],
	});

	// Category-specific spending
	examples.push({
		id: "spending_002",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How much am I spending on groceries?" },
			{
				role: "assistant",
				content: `Your grocery spending this month: **$567.89**

**Breakdown by store:**
- Whole Foods: $234.56 (8 visits)
- Trader Joe's: $189.45 (5 visits)
- Costco: $143.88 (2 visits)

**Trend:** You're spending 12% more than last month ($507.23). Your average grocery trip is $37.86.

**Tip:** Your Costco trips have the lowest per-visit cost. Consider consolidating more shopping there if convenient.`,
			},
		],
		toolCalls: [{ name: "getCategorySpending", arguments: { category: "Groceries" } }],
	});

	// Comparison question
	examples.push({
		id: "spending_003",
		category: "spending_analysis",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Am I spending more than usual on dining out?" },
			{
				role: "assistant",
				content: `Yes, your dining out spending is **23% higher** than your 3-month average.

- This month: $345.67
- Last month: $298.45
- 3-month average: $280.12

**Recent dining transactions:**
- ${randomDate(3)}: DoorDash - $34.56
- ${randomDate(5)}: Chipotle - $15.67
- ${randomDate(7)}: Olive Garden - $67.89

You've ordered delivery 6 times this month vs. your usual 3-4 times. Consider cooking more meals at home to reduce this spending.`,
			},
		],
	});

	// Payee spending
	examples.push({
		id: "spending_004",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How much have I spent at Amazon this year?" },
			{
				role: "assistant",
				content: `Your Amazon spending this year: **$2,345.67** across 45 orders.

**By category:**
- Shopping: $1,234.56 (53%)
- Groceries (Amazon Fresh): $567.89 (24%)
- Subscriptions (Prime, etc.): $234.56 (10%)
- Other: $308.66 (13%)

**Monthly trend:**
- Highest: December ($456.78)
- Lowest: February ($123.45)
- Average: $195.47/month

Your Prime membership ($14.99/mo) has saved you approximately $180 in shipping costs based on your order frequency.`,
			},
		],
		toolCalls: [{ name: "getPayeeSpending", arguments: { payeeName: "Amazon", period: "year" } }],
	});

	// Additional spending analysis variations
	examples.push({
		id: "spending_005",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Where is my money going?" },
			{
				role: "assistant",
				content: `Here's where your money went this month:

**Top Spending Categories:**
1. 🏠 Housing: $1,500 (43%) - Rent
2. 🛒 Groceries: $567 (16%)
3. 🍽️ Dining Out: $345 (10%)
4. 🚗 Transportation: $289 (8%)
5. 🛍️ Shopping: $234 (7%)
6. ⚡ Utilities: $199 (6%)
7. 🎬 Entertainment: $178 (5%)
8. 📱 Subscriptions: $145 (4%)

**Total: $3,457** (You typically spend $3,400-3,600/month)

Your biggest variable expenses are dining out and shopping - those are the best areas to cut back if needed.`,
			},
		],
	});

	examples.push({
		id: "spending_006",
		category: "spending_analysis",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How much did I spend last week?" },
			{
				role: "assistant",
				content: `Last week you spent **$423.67** across 18 transactions.

**Daily breakdown:**
- Monday: $45.23 (Groceries, Coffee)
- Tuesday: $12.99 (Lunch)
- Wednesday: $156.78 (Gas, Target)
- Thursday: $28.45 (DoorDash)
- Friday: $89.99 (Dinner out, Drinks)
- Saturday: $67.34 (Shopping)
- Sunday: $22.89 (Groceries)

This is 8% lower than your average weekly spending of $460.`,
			},
		],
	});

	examples.push({
		id: "spending_007",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Compare my spending this month vs last month" },
			{
				role: "assistant",
				content: `**Monthly Spending Comparison:**

| Category | This Month | Last Month | Change |
|----------|------------|------------|--------|
| Groceries | $567 | $523 | +8% 📈 |
| Dining Out | $345 | $298 | +16% 📈 |
| Transportation | $289 | $312 | -7% 📉 |
| Shopping | $234 | $189 | +24% 📈 |
| Entertainment | $178 | $167 | +7% 📈 |
| **Total** | **$3,457** | **$3,289** | **+5%** |

**Key changes:**
- Shopping up 24% - You made 3 extra Target trips
- Dining out up 16% - 4 more delivery orders than usual
- Gas down 7% - Fewer commute days`,
			},
		],
	});

	examples.push({
		id: "spending_008",
		category: "spending_analysis",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What are my subscriptions costing me?" },
			{
				role: "assistant",
				content: `Your recurring subscriptions total **$124.95/month** ($1,499/year):

**Streaming & Entertainment:**
- Netflix: $15.99
- Spotify: $9.99
- HBO Max: $15.99
- Disney+: $7.99

**Services:**
- Amazon Prime: $14.99
- iCloud: $2.99
- Gym: $49.99

**Software:**
- Microsoft 365: $6.99

**Tip:** You could save $24/month by bundling Disney+ with Hulu, or using Spotify's student discount if eligible.`,
			},
		],
	});

	examples.push({
		id: "spending_009",
		category: "spending_analysis",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How much do I spend on coffee?" },
			{
				role: "assistant",
				content: `Your coffee spending this month: **$87.45**

**Breakdown:**
- Starbucks: $56.78 (12 visits, avg $4.73)
- Dunkin: $23.45 (6 visits, avg $3.91)
- Local cafe: $7.22 (2 visits)

**Trend:** You're averaging $85/month on coffee. That's **$1,020/year**.

If you made coffee at home 3 days/week instead, you'd save about $45/month ($540/year).`,
			},
		],
	});

	examples.push({
		id: "spending_010",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What's my biggest expense?" },
			{
				role: "assistant",
				content: `Your biggest expenses this month:

1. **Rent** - $1,500 (43% of spending)
   - Paid to: Landlord
   - Due: 1st of each month

2. **Costco** - $234.56 (single transaction)
   - Category: Groceries
   - Date: ${randomDate(8)}

3. **Car Insurance** - $189.00 (quarterly)
   - Paid to: State Farm
   - Category: Insurance

**Largest category overall:** Housing at $1,500/month

Your fixed expenses (rent, insurance, subscriptions) are $1,824/month, leaving about $1,676 for variable spending.`,
			},
		],
	});

	return examples;
}

/**
 * Generate budget management examples
 */
function generateBudgetManagementExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	// Budget status check
	examples.push({
		id: "budget_001",
		category: "budget_management",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How am I doing on my budgets?" },
			{
				role: "assistant",
				content: `Here's your budget status for this month:

**On Track** ✅
- Groceries: $456/$600 (76%) - $144 remaining
- Transportation: $189/$250 (76%) - $61 remaining
- Utilities: $145/$200 (73%) - $55 remaining

**Warning** ⚠️
- Dining Out: $234/$250 (94%) - Only $16 remaining!
- Entertainment: $89/$100 (89%) - $11 remaining

**Over Budget** 🔴
- Shopping: $345/$300 (115%) - $45 over

Overall, you're 87% through your monthly budgets with 40% of the month remaining. Consider reducing shopping and dining out for the rest of the month.`,
			},
		],
		toolCalls: [{ name: "getBudgetStatus", arguments: {} }],
	});

	// Create a budget
	examples.push({
		id: "budget_002",
		category: "budget_management",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Create a budget for entertainment of $150 per month" },
			{
				role: "assistant",
				content: `Done! I've created a new monthly budget:

**Entertainment Budget**
- Amount: $150/month
- Category: Entertainment
- Start Date: This month

Based on your spending history, you've averaged $134/month on entertainment over the last 3 months, so this budget gives you a comfortable 12% buffer.

I'll track all transactions categorized as Entertainment against this budget. You can view your progress anytime by asking "How's my entertainment budget?"`,
			},
		],
		toolCalls: [
			{
				name: "createBudget",
				arguments: { categoryName: "Entertainment", amount: 150, period: "monthly" },
			},
		],
	});

	// Specific budget inquiry
	examples.push({
		id: "budget_003",
		category: "budget_management",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How much of my grocery budget is left?" },
			{
				role: "assistant",
				content: `You have **$144** remaining in your grocery budget.

- Budget: $600/month
- Spent: $456 (76%)
- Remaining: $144

With 12 days left in the month, that's about $12/day for groceries. Based on your shopping pattern, you typically make 2-3 more grocery trips, averaging $50 each. You're on track to stay within budget!`,
			},
		],
	});

	// Adjust budget amount
	examples.push({
		id: "budget_004",
		category: "budget_management",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Change my dining budget to $300" },
			{
				role: "assistant",
				content: `Done! I've updated your Dining Out budget:

**Previous:** $250/month
**New:** $300/month (+20%)

This month's status with the new budget:
- Spent: $234 (78% → now 78% of $300)
- Remaining: $66

Based on your recent spending, this increase gives you about 2 extra restaurant visits per month. Good adjustment given your recent patterns!`,
			},
		],
	});

	// Budget recommendation
	examples.push({
		id: "budget_005",
		category: "budget_management",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What budget should I set for groceries?" },
			{
				role: "assistant",
				content: `Based on your spending history, here's my recommendation:

**Suggested Grocery Budget: $550/month**

**Analysis of last 6 months:**
- Average: $523/month
- Highest: $612 (December - holidays)
- Lowest: $478 (February)
- Trend: Stable with +3% seasonal increase

**Why $550:**
- Covers your average with 5% buffer
- Accommodates occasional bulk shopping
- Realistic target you can consistently hit

**Alternative options:**
- Conservative: $500 (may feel tight)
- Comfortable: $600 (more flexibility)

Would you like me to create this budget?`,
			},
		],
	});

	// Multiple budget overview
	examples.push({
		id: "budget_006",
		category: "budget_management",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Show all my budgets" },
			{
				role: "assistant",
				content: `**Your Active Budgets:**

| Category | Budget | Spent | Remaining | Status |
|----------|--------|-------|-----------|--------|
| Groceries | $600 | $456 | $144 | ✅ On track |
| Dining Out | $250 | $234 | $16 | ⚠️ Almost spent |
| Transportation | $250 | $189 | $61 | ✅ On track |
| Shopping | $300 | $345 | -$45 | 🔴 Over |
| Entertainment | $100 | $89 | $11 | ⚠️ Almost spent |
| Utilities | $200 | $145 | $55 | ✅ On track |

**Total Budgeted:** $1,700/month
**Total Spent:** $1,458 (86%)

3 budgets on track, 2 close to limit, 1 over budget.`,
			},
		],
	});

	// Budget progress by category
	examples.push({
		id: "budget_007",
		category: "budget_management",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Am I over budget on anything?" },
			{
				role: "assistant",
				content: `Yes, you're over budget on **Shopping**:

**Over Budget:**
🔴 **Shopping**: $345 of $300 (115%)
   - $45 over budget
   - 5 transactions this month
   - Largest: $89.99 at Target

**Close to Limit (>90%):**
⚠️ **Dining Out**: $234 of $250 (94%)
   - Only $16 remaining
⚠️ **Entertainment**: $89 of $100 (89%)
   - Only $11 remaining

**Recommendation:** Try to avoid shopping for the rest of the month, and maybe cook at home a few more times to stay within dining budget.`,
			},
		],
	});

	// Create budget with category
	examples.push({
		id: "budget_008",
		category: "budget_management",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "I want to budget $75 per month for subscriptions" },
			{
				role: "assistant",
				content: `I'll create a Subscriptions budget for you.

**Current subscription spending:**
- Netflix: $15.99
- Spotify: $9.99
- HBO Max: $15.99
- Disney+: $7.99
- iCloud: $2.99
- **Total: $52.95/month**

**Budget Created:**
- Category: Subscriptions
- Amount: $75/month
- Buffer: $22.05 (29%)

This budget gives you room for:
- 1-2 new services
- Price increases
- Annual service trials

You're currently at 71% of your new budget. Would you like me to set up alerts when you're at 80% and 100%?`,
			},
		],
		toolCalls: [
			{
				name: "createBudget",
				arguments: { categoryName: "Subscriptions", amount: 75, period: "monthly" },
			},
		],
	});

	// Budget history comparison
	examples.push({
		id: "budget_009",
		category: "budget_management",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How have I done on my budgets this year?" },
			{
				role: "assistant",
				content: `**Budget Performance YTD:**

| Category | Avg % Used | Months Over | Trend |
|----------|------------|-------------|-------|
| Groceries | 87% | 2/12 | Stable |
| Dining Out | 102% | 7/12 | ⬆️ Increasing |
| Transportation | 72% | 0/12 | ⬇️ Decreasing |
| Shopping | 98% | 5/12 | Stable |
| Entertainment | 81% | 1/12 | Stable |

**Key Insights:**
- Dining Out is consistently over budget - consider increasing to $300
- Transportation is under-utilized - could reduce or reallocate
- Shopping spikes during holidays (Nov/Dec)

**Overall score:** 78% within budget across all categories. That's solid!`,
			},
		],
	});

	// Delete/modify budget question
	examples.push({
		id: "budget_010",
		category: "budget_management",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "I don't need a transportation budget anymore" },
			{
				role: "assistant",
				content: `I can help you manage your Transportation budget.

**Current status:**
- Budget: $250/month
- This month: $189 spent (76%)
- History: You've never gone over this budget

**Options:**
1. **Pause** - Stop tracking but keep history
2. **Archive** - Hide from active view, keep for reports
3. **Delete** - Remove completely

Since you're consistently under this budget, you could also:
- Reduce it to $200 and reallocate $50 elsewhere
- Keep it as a safety net (no harm in having it)

What would you prefer?`,
			},
		],
	});

	return examples;
}

/**
 * Generate transaction search examples
 */
function generateTransactionSearchExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	// Recent transactions
	examples.push({
		id: "transaction_001",
		category: "transaction_search",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Show me my recent transactions" },
			{
				role: "assistant",
				content: `Here are your last 10 transactions:

| Date | Payee | Category | Amount |
|------|-------|----------|--------|
| ${randomDate(1)} | Whole Foods | Groceries | -$67.89 |
| ${randomDate(1)} | Shell Gas | Transportation | -$45.23 |
| ${randomDate(2)} | Netflix | Subscriptions | -$15.99 |
| ${randomDate(2)} | Starbucks | Dining Out | -$6.45 |
| ${randomDate(3)} | Amazon | Shopping | -$34.56 |
| ${randomDate(3)} | Uber | Transportation | -$23.45 |
| ${randomDate(4)} | Target | Shopping | -$89.99 |
| ${randomDate(5)} | DoorDash | Dining Out | -$28.76 |
| ${randomDate(5)} | CVS | Healthcare | -$12.34 |
| ${randomDate(6)} | Spotify | Subscriptions | -$9.99 |

Would you like me to filter these by category or search for something specific?`,
			},
		],
		toolCalls: [{ name: "searchTransactions", arguments: { limit: 10 } }],
	});

	// Search specific payee
	examples.push({
		id: "transaction_002",
		category: "transaction_search",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Find my Costco transactions" },
			{
				role: "assistant",
				content: `Found 8 Costco transactions in the last 3 months:

| Date | Amount | Category |
|------|--------|----------|
| ${randomDate(7)} | -$234.56 | Groceries |
| ${randomDate(21)} | -$189.45 | Groceries |
| ${randomDate(35)} | -$156.78 | Groceries |
| ${randomDate(42)} | -$267.89 | Shopping |
| ${randomDate(56)} | -$145.67 | Groceries |
| ${randomDate(63)} | -$198.34 | Groceries |
| ${randomDate(77)} | -$212.45 | Groceries |
| ${randomDate(84)} | -$134.56 | Groceries |

**Total: $1,539.70** | **Average: $192.46/trip**

You visit Costco about 2-3 times per month. Your largest trip was $267.89 on ${randomDate(42)}.`,
			},
		],
		toolCalls: [{ name: "searchTransactions", arguments: { payee: "Costco" } }],
	});

	// Amount-based search
	examples.push({
		id: "transaction_003",
		category: "transaction_search",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What transactions over $100 did I have this month?" },
			{
				role: "assistant",
				content: `You have 5 transactions over $100 this month:

1. **Rent Payment** - $1,500.00 (${randomDate(5)})
   - Category: Housing
   - Account: Chase Checking

2. **Costco** - $234.56 (${randomDate(8)})
   - Category: Groceries
   - Account: Amex Platinum

3. **Electric Company** - $145.67 (${randomDate(10)})
   - Category: Utilities
   - Account: Chase Checking

4. **Home Depot** - $189.45 (${randomDate(12)})
   - Category: Home Improvement
   - Account: Capital One Venture

5. **Verizon** - $125.00 (${randomDate(15)})
   - Category: Utilities
   - Account: Chase Checking

**Total: $2,194.68** (These represent 63% of your monthly spending)`,
			},
		],
		toolCalls: [{ name: "searchTransactions", arguments: { minAmount: 100 } }],
	});

	// Date range search
	examples.push({
		id: "transaction_004",
		category: "transaction_search",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Show me transactions from last weekend" },
			{
				role: "assistant",
				content: `Here are your transactions from last weekend (Sat-Sun):

**Saturday:**
- Target: -$67.89 (Shopping)
- Whole Foods: -$45.23 (Groceries)
- Netflix: -$15.99 (Subscriptions)
- Starbucks: -$6.45 (Dining Out)

**Sunday:**
- Gas Station: -$42.00 (Transportation)
- DoorDash: -$28.76 (Dining Out)

**Weekend Total: $206.32**

This is about average for your weekend spending. Your Saturdays tend to be higher due to grocery shopping.`,
			},
		],
	});

	// Category-based search
	examples.push({
		id: "transaction_005",
		category: "transaction_search",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Find all my dining transactions this month" },
			{
				role: "assistant",
				content: `Found 12 dining transactions this month totaling **$345.67**:

| Date | Payee | Amount |
|------|-------|--------|
| ${randomDate(2)} | Starbucks | -$6.45 |
| ${randomDate(3)} | Chipotle | -$15.67 |
| ${randomDate(5)} | DoorDash | -$28.76 |
| ${randomDate(7)} | Olive Garden | -$67.89 |
| ${randomDate(9)} | Starbucks | -$5.99 |
| ${randomDate(10)} | Uber Eats | -$34.56 |
| ${randomDate(12)} | Dunkin | -$8.45 |
| ${randomDate(14)} | Panda Express | -$12.34 |
| ${randomDate(16)} | Starbucks | -$6.99 |
| ${randomDate(18)} | DoorDash | -$42.11 |
| ${randomDate(20)} | Coffee Shop | -$4.50 |
| ${randomDate(22)} | Panera | -$18.96 |

**Breakdown:**
- Restaurants: $114.86 (33%)
- Delivery: $105.43 (31%)
- Coffee: $123.38 (36%)`,
			},
		],
		toolCalls: [{ name: "searchTransactions", arguments: { category: "Dining Out" } }],
	});

	// Uncategorized transactions
	examples.push({
		id: "transaction_006",
		category: "transaction_search",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Do I have any uncategorized transactions?" },
			{
				role: "assistant",
				content: `You have **4 uncategorized transactions** that need attention:

1. **ACH PAYMENT 847392** - $89.99 (${randomDate(3)})
   - Likely: Insurance payment or subscription
   - Suggested: Insurance or Subscriptions

2. **POS DEBIT 2847** - $34.56 (${randomDate(7)})
   - Likely: Retail purchase
   - Suggested: Shopping

3. **CHECKCARD 1234** - $23.45 (${randomDate(12)})
   - Likely: Card transaction
   - Need more info to categorize

4. **TRANSFER FROM** - $500.00 (${randomDate(15)})
   - This is a transfer, not spending
   - Suggested: Mark as Transfer

Would you like me to apply these suggestions?`,
			},
		],
	});

	// Search by account
	examples.push({
		id: "transaction_007",
		category: "transaction_search",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What did I charge to my Amex this month?" },
			{
				role: "assistant",
				content: `Your Amex Platinum charges this month: **$1,234.56** (18 transactions)

**Top Categories:**
- Shopping: $456.78 (37%)
- Dining Out: $234.56 (19%)
- Groceries: $189.45 (15%)
- Entertainment: $134.67 (11%)
- Other: $219.10 (18%)

**Largest Charges:**
1. Costco: $234.56 (${randomDate(5)})
2. Best Buy: $189.99 (${randomDate(8)})
3. Amazon: $123.45 (${randomDate(12)})

You're earning 5x points on restaurants and flights. Consider using this card more for dining!`,
			},
		],
	});

	// Refund/credit search
	examples.push({
		id: "transaction_008",
		category: "transaction_search",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Have I gotten any refunds recently?" },
			{
				role: "assistant",
				content: `Found 3 refunds/credits in the last 30 days:

1. **Amazon Refund** - +$45.67 (${randomDate(5)})
   - Original purchase: ${randomDate(20)}
   - Reason: Return

2. **Target** - +$23.99 (${randomDate(12)})
   - Price adjustment credit

3. **Netflix** - +$15.99 (${randomDate(18)})
   - Account credit (promotional)

**Total refunds: $85.65**

Your largest pending return is $89.99 from Best Buy (shipped ${randomDate(3)}, should arrive in 5-7 business days).`,
			},
		],
	});

	// Pending transactions
	examples.push({
		id: "transaction_009",
		category: "transaction_search",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What transactions are pending?" },
			{
				role: "assistant",
				content: `You have **3 pending transactions**:

| Payee | Amount | Account | Expected to Post |
|-------|--------|---------|------------------|
| Amazon | -$67.89 | Chase | Tomorrow |
| Shell Gas | -$45.23 | Amex | Tomorrow |
| Restaurant | -$89.45 | Capital One | 2-3 days |

**Total Pending: $202.57**

These will post within 1-3 business days. Your available balances already reflect these holds.

**Note:** The restaurant charge is higher than the original - likely includes tip that was added after authorization.`,
			},
		],
	});

	// Duplicate detection
	examples.push({
		id: "transaction_010",
		category: "transaction_search",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Are there any duplicate transactions?" },
			{
				role: "assistant",
				content: `I found **2 potential duplicates** to review:

**Likely Duplicates:**

1. **Netflix - $15.99** (appears twice)
   - ${randomDate(15)}: Chase Checking
   - ${randomDate(15)}: Amex Platinum
   - ⚠️ Same amount, same date, different accounts
   - Recommendation: Check if you have 2 Netflix accounts or if one is fraudulent

2. **Whole Foods - $45.23** (appears twice)
   - ${randomDate(7)}: $45.23 - Amex
   - ${randomDate(7)}: $45.32 - Amex
   - These are $0.09 apart on the same day
   - Likely: 2 separate trips (confirm receipt)

**Not Duplicates (similar but different):**
- Starbucks: 3 charges this week are normal (different dates/amounts)

Want me to help resolve these?`,
			},
		],
	});

	return examples;
}

/**
 * Generate payee management examples
 */
function generatePayeeManagementExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	// Create a payee
	examples.push({
		id: "payee_001",
		category: "payee_management",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Add a new payee for my gym membership called Equinox" },
			{
				role: "assistant",
				content: `Done! I've created a new payee:

**Equinox**
- Default Category: Health & Fitness

Future transactions from Equinox will automatically be categorized as Health & Fitness. Would you like me to set up a recurring transaction for your membership fee?`,
			},
		],
		toolCalls: [
			{
				name: "createPayee",
				arguments: { name: "Equinox", defaultCategoryName: "Health & Fitness" },
			},
		],
	});

	// Payee spending inquiry
	examples.push({
		id: "payee_002",
		category: "payee_management",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Which merchants do I spend the most at?" },
			{
				role: "assistant",
				content: `Here are your top 10 merchants by spending this year:

1. **Rent Payment** - $18,000 (Housing)
2. **Amazon** - $2,345 (Various)
3. **Whole Foods** - $1,890 (Groceries)
4. **Costco** - $1,567 (Groceries)
5. **Shell Gas** - $1,234 (Transportation)
6. **Target** - $987 (Shopping)
7. **Electric Company** - $876 (Utilities)
8. **DoorDash** - $654 (Dining)
9. **Starbucks** - $543 (Dining)
10. **Netflix** - $192 (Subscriptions)

Excluding rent, your top discretionary spending is at Amazon and grocery stores.`,
			},
		],
	});

	// Merge payees
	examples.push({
		id: "payee_003",
		category: "payee_management",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "I have duplicate payees for Starbucks" },
			{
				role: "assistant",
				content: `I found 3 variations of Starbucks in your payees:

1. **Starbucks** - 24 transactions, $234.56 total
2. **STARBUCKS STORE** - 8 transactions, $67.89 total
3. **SBX*STARBUCKS** - 5 transactions, $45.23 total

**Recommendation:** Merge all into "Starbucks"

This will:
- Combine 37 transactions under one payee
- Total spending: $347.68
- Set default category: Dining Out

Would you like me to merge these? Your transaction history will be preserved.`,
			},
		],
	});

	// Payee details
	examples.push({
		id: "payee_004",
		category: "payee_management",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Tell me about my spending at Target" },
			{
				role: "assistant",
				content: `**Target Spending Analysis:**

**This Year:** $987.45 across 23 visits
**Average per visit:** $42.93

**By Category:**
- Shopping: $456.78 (46%)
- Groceries: $234.56 (24%)
- Household: $189.34 (19%)
- Personal Care: $106.77 (11%)

**Visit Patterns:**
- Most visits: Weekends (67%)
- Average time between visits: 12 days
- Highest spending month: December ($156.78)

**Trend:** Your Target spending is up 15% vs last year. Most increase is in Groceries category.`,
			},
		],
	});

	// Set default category for payee
	examples.push({
		id: "payee_005",
		category: "payee_management",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Always categorize Shell as Transportation" },
			{
				role: "assistant",
				content: `Done! I've updated Shell's default category:

**Shell**
- Previous default: Uncategorized
- New default: Transportation

**Also updated:**
- 15 existing Shell transactions recategorized to Transportation
- Total: $567.89 now in Transportation category

Future transactions from Shell will automatically be categorized as Transportation. You can always override individual transactions if needed.`,
			},
		],
		toolCalls: [
			{
				name: "updatePayee",
				arguments: { payeeName: "Shell", defaultCategory: "Transportation" },
			},
		],
	});

	// Find similar payees
	examples.push({
		id: "payee_006",
		category: "payee_management",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Do I have any payees that should be merged?" },
			{
				role: "assistant",
				content: `I found **4 groups** of similar payees that could be merged:

**1. Amazon variants:**
- Amazon, AMAZON.COM, AMZN MKTP → 45 transactions
- Recommendation: Merge to "Amazon"

**2. Starbucks variants:**
- Starbucks, STARBUCKS STORE, SBX*STARBUCKS → 37 transactions
- Recommendation: Merge to "Starbucks"

**3. Uber services:**
- Uber, UBER EATS, UBER TRIP → 28 transactions
- Recommendation: Keep separate (different services)

**4. Gas stations:**
- Shell, SHELL OIL, SHELL SERVICE → 15 transactions
- Recommendation: Merge to "Shell"

Would you like me to merge the recommended groups?`,
			},
		],
	});

	// Rename payee
	examples.push({
		id: "payee_007",
		category: "payee_management",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Rename 'WHOLEFDS MKT' to 'Whole Foods'" },
			{
				role: "assistant",
				content: `Done! I've renamed the payee:

**Before:** WHOLEFDS MKT
**After:** Whole Foods

**Updated:**
- 12 transactions now show "Whole Foods"
- Default category remains: Groceries

I notice you also have a "Whole Foods Market" payee with 8 transactions. Would you like to merge these together?`,
			},
		],
	});

	return examples;
}

/**
 * Generate category suggestion examples
 */
function generateCategorySuggestionExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	// Suggest category
	examples.push({
		id: "category_001",
		category: "category_suggestion",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "I have a transaction from 'CHEESECAKE FACTORY', what category should it be?",
			},
			{
				role: "assistant",
				content: `I'd suggest categorizing this as **Dining Out**.

The Cheesecake Factory is a restaurant chain, so it fits best under your Dining Out category. This is where you have similar restaurant transactions like:
- Olive Garden
- Chipotle
- Local restaurants

Would you like me to categorize it as Dining Out?`,
			},
		],
	});

	// Categorize transaction
	examples.push({
		id: "category_002",
		category: "category_suggestion",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Categorize my last Uber transaction as Transportation" },
			{
				role: "assistant",
				content: `Done! I've updated your Uber transaction:

**Transaction Updated:**
- Payee: Uber
- Amount: -$23.45
- Date: ${randomDate(2)}
- Category: Transportation (was: Uncategorized)

I've also set Transportation as the default category for future Uber transactions.`,
			},
		],
		toolCalls: [
			{
				name: "categorizeTransaction",
				arguments: { transactionId: 12345, categoryName: "Transportation" },
			},
		],
	});

	// Ambiguous category
	examples.push({
		id: "category_003",
		category: "category_suggestion",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "What category should I use for my CVS purchase?",
			},
			{
				role: "assistant",
				content: `CVS purchases can fall into different categories depending on what you bought:

**Common CVS categories:**
- **Healthcare** - Prescriptions, medicine, first aid
- **Personal Care** - Toiletries, cosmetics, hygiene
- **Groceries** - Snacks, drinks, food items
- **Household** - Cleaning supplies

**Your recent CVS patterns:**
- 60% Healthcare ($234.56)
- 25% Personal Care ($97.89)
- 15% Groceries ($45.67)

**Suggestion:** If this was a typical visit, I'd categorize it as **Healthcare** since that's your most common use.

What did you buy? Or should I use Healthcare as the default?`,
			},
		],
	});

	// Split transaction category
	examples.push({
		id: "category_004",
		category: "category_suggestion",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "I bought groceries and household items at Target for $89.99",
			},
			{
				role: "assistant",
				content: `I can help you split this transaction:

**Original:** Target - $89.99

**Split options:**

1. **Estimated split** (based on your patterns):
   - Groceries: $54.00 (60%)
   - Household: $35.99 (40%)

2. **Even split:**
   - Groceries: $45.00
   - Household: $44.99

3. **Custom split:**
   - Tell me the exact amounts

Your typical Target breakdown is 60% groceries, 40% other. Would you like me to apply the estimated split, or do you know the exact amounts?`,
			},
		],
	});

	// Bulk categorization
	examples.push({
		id: "category_005",
		category: "category_suggestion",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Categorize all my Amazon transactions as Shopping" },
			{
				role: "assistant",
				content: `I'll update your Amazon transactions, but first a heads up:

**Amazon has mixed categories currently:**
- Shopping: 28 transactions ($1,234.56)
- Groceries (Amazon Fresh): 12 transactions ($456.78)
- Subscriptions (Prime, etc.): 8 transactions ($167.88)

**Options:**
1. **Categorize ALL as Shopping** - Simpler but less accurate
2. **Keep current categories** - More accurate spending breakdown
3. **Categorize only "Uncategorized" Amazon transactions**

I recommend option 3 - there are 5 uncategorized Amazon transactions totaling $234.56 that I can set to Shopping.

What would you prefer?`,
			},
		],
	});

	// Category recommendation
	examples.push({
		id: "category_006",
		category: "category_suggestion",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Should gym memberships be Healthcare or Entertainment?" },
			{
				role: "assistant",
				content: `Great question! Here are both perspectives:

**Healthcare (Recommended):**
- Exercise is health-related
- Some HSA/FSA accounts allow gym reimbursement
- Groups with medical expenses for tax planning
- Your pattern: Other fitness costs are in Healthcare

**Entertainment:**
- Could argue it's leisure activity
- Groups with fun/recreational spending

**My recommendation: Healthcare**

This matches how most budgeting apps categorize it, and keeps your health-related spending together for analysis.

Your current gym ($49.99/mo) is categorized as "Subscriptions". Want me to move it to Healthcare?`,
			},
		],
	});

	// Create new category
	examples.push({
		id: "category_007",
		category: "category_suggestion",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "I need a category for pet expenses" },
			{
				role: "assistant",
				content: `I can create a new "Pets" category for you.

**Suggested setup:**
- Name: Pets
- Parent: Lifestyle (or standalone)
- Icon: 🐾

**Transactions I can recategorize:**
- Petco: 6 transactions ($234.56) - currently "Shopping"
- PetSmart: 4 transactions ($156.78) - currently "Shopping"
- Vet visits: 2 transactions ($189.00) - currently "Healthcare"

**Total to recategorize:** $580.34

Would you like me to:
1. Create the category
2. Move these transactions
3. Set up a monthly budget (your average: $97/month)

All of the above?`,
			},
		],
	});

	return examples;
}

/**
 * Generate financial advice examples
 */
function generateFinancialAdviceExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	// Savings advice
	examples.push({
		id: "advice_001",
		category: "financial_advice",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How can I save more money?" },
			{
				role: "assistant",
				content: `Based on your spending patterns, here are some personalized recommendations:

**Quick Wins (Save ~$200/month)**
1. **Reduce dining out** - You're spending $345/month vs. your $250 budget. Cooking 2 more meals at home weekly could save ~$100.

2. **Consolidate streaming** - You have Netflix ($15.99), Spotify ($9.99), and Hulu ($12.99). Consider a bundle or rotating services to save ~$20.

3. **Gas optimization** - You fill up at Shell frequently. Using GasBuddy or a gas rewards card could save $15-20/month.

**Bigger Opportunities**
- Your grocery spending at Whole Foods is 30% higher than average. Trader Joe's or Costco runs could save $50-75/month.
- Consider refinancing your car loan if rate is above 5%.

Would you like me to create a specific savings goal to track progress?`,
			},
		],
	});

	// Budget recommendation
	examples.push({
		id: "advice_002",
		category: "financial_advice",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Should I increase my grocery budget?" },
			{
				role: "assistant",
				content: `Looking at your grocery spending trends:

**Current budget:** $600/month
**Actual spending (3-month avg):** $567/month
**This month so far:** $456 (76% used, 60% of month passed)

My recommendation: **Keep your current budget.**

You're averaging 94% utilization, which is healthy - not too tight, not too loose. Your spending is consistent and predictable.

However, if you're feeling constrained, consider:
- Increasing to $650 (+8%) for more flexibility
- Shifting $50 from your under-utilized Entertainment budget instead of increasing overall spending

What would you prefer?`,
			},
		],
	});

	// Debt payoff advice
	examples.push({
		id: "advice_003",
		category: "financial_advice",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How can I pay off my credit cards faster?" },
			{
				role: "assistant",
				content: `Let's create a payoff strategy for your credit cards:

**Current Debt:**
- Amex Platinum: $1,234.56 (18.9% APR)
- Capital One Venture: $456.78 (22.9% APR)
- **Total: $1,691.34**

**Recommended Strategy: Avalanche Method**
Pay Capital One first (higher interest), then Amex.

**Payoff Timeline:**

| Extra Payment | Time to Payoff | Interest Saved |
|---------------|----------------|----------------|
| $100/month | 16 months | $234 |
| $200/month | 8 months | $156 |
| $300/month | 6 months | $98 |

**Quick Wins to Find $200/month:**
1. Reduce dining out: $100
2. Pause streaming services: $45
3. Shop less at Target: $55

**Current minimum payments:** ~$60/month
**With extra $200:** Pay off in 8 months, save $156 in interest

Would you like me to track your payoff progress?`,
			},
		],
	});

	// Tax planning advice
	examples.push({
		id: "advice_004",
		category: "financial_advice",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What can I deduct on my taxes?" },
			{
				role: "assistant",
				content: `Based on your spending, here are potential deductions to discuss with a tax professional:

**Potentially Deductible (if you itemize):**

1. **Charitable Donations** - $567 YTD
   - Goodwill: $234
   - Various charities: $333

2. **Medical Expenses** (if > 7.5% of income)
   - Healthcare category: $1,234 YTD
   - Pharmacy: $456
   - Dentist: $278

3. **Home Office** (if self-employed)
   - Portion of rent/utilities
   - Office supplies from Amazon: $189

**Not Deductible:**
- Gym membership (unless prescribed)
- Commuting costs
- Most subscription services

**Recommendation:** Your standard deduction ($14,600 single) likely exceeds your itemized deductions. But track charitable giving - it may help next year.

*Note: I'm not a tax advisor. Please consult a CPA for tax guidance.*`,
			},
		],
	});

	// Spending habit insights
	examples.push({
		id: "advice_005",
		category: "financial_advice",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What are my worst spending habits?" },
			{
				role: "assistant",
				content: `Based on analyzing your transactions, here are areas to improve:

**1. Impulse Delivery Orders** 🍕
- DoorDash/Uber Eats: $187/month
- Average order: $28.45
- Frequency: 6-7x/month, mostly weeknights
- **Savings potential:** $100/month by cooking more

**2. Coffee Shop Habit** ☕
- Starbucks: $87/month
- 18 visits/month = almost daily
- **Savings potential:** $60/month with home brewing

**3. Subscription Creep** 📺
- You added 2 services in 6 months
- HBO Max + Discovery+ = $26/month
- **Question:** Do you use both?

**4. Weekend Splurges** 🛍️
- Saturday spending 45% higher than weekdays
- Often unplanned Target/Amazon purchases
- **Savings potential:** $75/month with shopping lists

**Total potential savings: $300/month**

Which would you like to tackle first?`,
			},
		],
	});

	// Investment advice
	examples.push({
		id: "advice_006",
		category: "financial_advice",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Should I invest more in my 401k?" },
			{
				role: "assistant",
				content: `Let me analyze your retirement savings:

**Current 401k Status:**
- Balance: $45,678.90
- Contribution: $700/month (10% of salary)
- Employer match: 50% up to 6% = $350/month
- **Total monthly: $1,050**

**Analysis:**
✅ You're getting full employer match ($4,200/year free money!)
✅ You're above average contribution rate
⚠️ You're not maxing out ($23,000 limit for 2024)

**Options:**

| Strategy | Monthly Increase | Tax Savings | Impact |
|----------|-----------------|-------------|--------|
| Stay current | $0 | - | Comfortable |
| Max match | Already doing! | - | Great |
| Increase to 15% | +$350 | ~$84/mo | Better retirement |
| Max out | +$1,216 | ~$292/mo | Fastest growth |

**My recommendation:**
Your emergency fund is solid (3.5 months). Consider increasing to 12-15% to accelerate retirement savings. You have the cash flow to support it.

Would you like to see the long-term impact?`,
			},
		],
	});

	// Affordability check
	examples.push({
		id: "advice_007",
		category: "financial_advice",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Can I afford a $500 purchase?" },
			{
				role: "assistant",
				content: `Let me check your financial situation:

**Quick Answer: Yes, but let's be smart about it.**

**Your Current Position:**
- Checking balance: $3,245.67
- After purchase: $2,745.67
- Min recommended balance: $1,500

**Upcoming Expenses (next 2 weeks):**
- Rent: $1,500 (due in 8 days)
- Bills: ~$300
- Typical spending: ~$400
- **Total: ~$2,200**

**After purchase + expenses:** $545.67

⚠️ This would leave you below your minimum buffer.

**Better Options:**
1. **Wait 6 days** - After your paycheck ($3,500), you'd have plenty
2. **Use credit card** - If you can pay it off next month
3. **Split payment** - Many retailers offer 4 payments of $125

**Recommendation:** Wait for your paycheck. You'll feel better making the purchase without stress.

What's the purchase for? I can help you find deals or alternatives.`,
			},
		],
	});

	// Financial health check
	examples.push({
		id: "advice_008",
		category: "financial_advice",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Give me a financial health check" },
			{
				role: "assistant",
				content: `**Your Financial Health Report**

**Overall Score: B+ (Good)**

**✅ Strengths:**

| Area | Status | Score |
|------|--------|-------|
| Emergency Fund | 3.5 months | B+ |
| Debt Level | Low (6.7% utilization) | A |
| Savings Rate | 17% | A |
| Net Worth Trend | +$2,345/month | A |
| Budget Adherence | 78% on track | B |

**⚠️ Areas to Improve:**

| Area | Issue | Action |
|------|-------|--------|
| Dining Budget | 23% over | Reduce delivery |
| Emergency Fund | Below 6 months | Continue saving |
| Subscriptions | $125/month | Audit usage |

**Key Metrics vs Benchmarks:**
- Savings rate: 17% (Recommended: 15-20%) ✅
- Housing cost: 43% of spending (Recommended: <30%) ⚠️
- Debt ratio: 2% of net worth (Recommended: <20%) ✅

**Next Steps:**
1. Build emergency fund to 6 months (+$8,500)
2. Reduce dining out by 20%
3. Review streaming subscriptions

You're doing great! Focus on the emergency fund and you'll be in excellent shape.`,
			},
		],
	});

	return examples;
}

/**
 * Generate forecasting examples
 */
function generateForecastingExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	examples.push({
		id: "forecast_001",
		category: "forecasting",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What will my balance be at the end of the month?" },
			{
				role: "assistant",
				content: `Based on your spending patterns and upcoming transactions:

**Projected End-of-Month Balance: $2,156.78**

**Expected Income:**
- Salary deposit (${randomDate(-5)}): +$3,500.00

**Expected Expenses:**
- Remaining budget spending: ~$800
- Scheduled bills:
  - Netflix (${randomDate(-3)}): -$15.99
  - Gym (${randomDate(-5)}): -$49.99
  - Phone (${randomDate(-7)}): -$85.00

**Current Balance:** $3,245.67
**Net Change:** -$1,088.89

This projection assumes you stay within your remaining budgets. You have a comfortable buffer above your typical minimum balance of $1,500.`,
			},
		],
	});

	// Monthly spending forecast
	examples.push({
		id: "forecast_002",
		category: "forecasting",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How much will I spend this month?" },
			{
				role: "assistant",
				content: `**Projected Monthly Spending: $3,520**

**Already Spent:** $2,456 (70%)
**Projected Remaining:** $1,064

**By Category:**

| Category | Spent | Projected Total | vs Budget |
|----------|-------|-----------------|-----------|
| Groceries | $456 | $590 | -$10 ✅ |
| Dining Out | $234 | $290 | +$40 ⚠️ |
| Transportation | $189 | $245 | -$5 ✅ |
| Shopping | $345 | $380 | +$80 🔴 |
| Entertainment | $89 | $120 | +$20 ⚠️ |
| Utilities | $145 | $195 | -$5 ✅ |

**Prediction Confidence:** 85% (based on 6 months of data)

**Risk Factors:**
- You tend to overspend in the last week of the month
- Shopping might increase with upcoming sales

Want me to alert you if spending trends toward over budget?`,
			},
		],
	});

	// Cash flow forecast
	examples.push({
		id: "forecast_003",
		category: "forecasting",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Will I have cash flow problems this month?" },
			{
				role: "assistant",
				content: `**Cash Flow Forecast - This Month**

Good news: **No cash flow issues expected!**

**Day-by-Day Projection:**

| Date | Event | Balance After |
|------|-------|---------------|
| Today | Current | $3,245 |
| ${randomDate(-3)} | Electric bill | $3,100 |
| ${randomDate(-5)} | Groceries (est.) | $2,950 |
| ${randomDate(-8)} | Rent | $1,450 |
| ${randomDate(-10)} | Paycheck | $4,950 |
| ${randomDate(-12)} | Phone bill | $4,865 |
| ${randomDate(-14)} | End of month | $4,200 |

**Lowest Point:** $1,450 (after rent, before paycheck)
**Minimum Recommended:** $1,500

⚠️ **Slight Concern:** You'll dip $50 below your minimum briefly.

**Recommendation:** Either:
1. Move $100 from savings temporarily
2. Wait to pay electric until after paycheck
3. Reduce spending by $50 before rent

This is a very minor issue - your finances are solid overall.`,
			},
		],
	});

	// Next month forecast
	examples.push({
		id: "forecast_004",
		category: "forecasting",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What does next month look like financially?" },
			{
				role: "assistant",
				content: `**Next Month Forecast:**

**Expected Income:** $7,000
- 2 paychecks @ $3,500

**Expected Expenses:** $3,650
- Fixed: $1,855 (rent, utilities, subscriptions)
- Variable: $1,795 (based on patterns)

**Projected Cash Flow:** +$3,350

**Notable Items:**
- Car insurance due ($189 - quarterly)
- Amazon Prime renewal ($139 - annual)
- 1 extra day in month = ~$50 more spending

**Budget Adjustments to Consider:**
- Holiday shopping typically starts (plan extra $200)
- Heating costs may increase (+$30 in utilities)

**Projected End Balance:** $7,550 (up from current $4,200)

**Opportunities:**
- Great month to boost savings (+$500 extra)
- Pay extra on credit card
- Start holiday fund

Would you like me to create a savings plan for next month?`,
			},
		],
	});

	// Savings goal projection
	examples.push({
		id: "forecast_005",
		category: "forecasting",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "When will I reach my savings goal?" },
			{
				role: "assistant",
				content: `**Savings Goal Progress:**

**Emergency Fund Goal:** $21,000 (6 months expenses)
**Current:** $12,500 (59%)
**Remaining:** $8,500

**At Current Rate ($400/month):**
- Time to goal: **21 months** (October next year)

**Accelerated Scenarios:**

| Monthly Savings | Time to Goal | Date |
|-----------------|--------------|------|
| $400 (current) | 21 months | Oct '25 |
| $500 | 17 months | Jun '25 |
| $600 | 14 months | Mar '25 |
| $700 | 12 months | Jan '25 |

**Where to Find Extra Savings:**
- Dining out reduction: +$100
- Subscription audit: +$45
- Coffee at home: +$55

**Interest Earned:**
At 4.5% APY, you'll earn ~$380 in interest while saving.

**Recommendation:** Push for $600/month - you'll hit your goal 7 months sooner and have peace of mind faster.`,
			},
		],
	});

	// Year-end forecast
	examples.push({
		id: "forecast_006",
		category: "forecasting",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What will my net worth be at year end?" },
			{
				role: "assistant",
				content: `**Year-End Net Worth Projection:**

**Current Net Worth:** $77,079
**Projected Year-End:** $85,400 (+$8,321, +10.8%)

**Growth Breakdown:**

| Category | Current | Year-End | Growth |
|----------|---------|----------|--------|
| Cash | $20,746 | $23,000 | +$2,254 |
| Investments | $58,025 | $65,000 | +$6,975 |
| Debt | -$1,692 | -$2,600 | -$908 |

**Assumptions:**
- Savings: $500/month
- 401k: $700/month + $350 match
- Investment returns: 8% annualized
- Credit card usage: Maintained

**Scenarios:**

| Scenario | Year-End NW |
|----------|-------------|
| Conservative (5% returns) | $82,100 |
| Expected (8% returns) | $85,400 |
| Optimistic (12% returns) | $88,900 |

**Milestone Alert:**
At this rate, you'll cross **$100,000 net worth** in ~18 months!`,
			},
		],
	});

	return examples;
}

/**
 * Generate recurring transaction examples
 */
function generateRecurringTransactionExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	examples.push({
		id: "recurring_001",
		category: "transaction_search",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What bills do I have coming up?" },
			{
				role: "assistant",
				content: `**Upcoming Bills (Next 14 Days):**

| Due Date | Payee | Amount | Account |
|----------|-------|--------|---------|
| ${randomDate(-3)} | Netflix | $15.99 | Chase |
| ${randomDate(-5)} | Electric Company | ~$145 | Chase |
| ${randomDate(-7)} | Gym Membership | $49.99 | Amex |
| ${randomDate(-10)} | Phone Bill | $85.00 | Chase |
| ${randomDate(-12)} | Spotify | $9.99 | Amex |

**Total expected: ~$306**

You have $3,245 in checking, so you're well covered for these bills.`,
			},
		],
	});

	examples.push({
		id: "recurring_002",
		category: "transaction_search",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "When is my rent due?" },
			{
				role: "assistant",
				content: `Your rent payment of **$1,500** is due on the **1st of each month**.

**Next payment:** ${randomDate(-8)} (in 8 days)
**Paid from:** Chase Checking

Your last 3 rent payments:
- Dec 1: $1,500 ✅
- Nov 1: $1,500 ✅
- Oct 1: $1,500 ✅

You currently have $3,245.67 in checking - enough to cover rent with $1,745.67 remaining.`,
			},
		],
	});

	examples.push({
		id: "recurring_003",
		category: "transaction_search",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Show my recurring transactions" },
			{
				role: "assistant",
				content: `**Your Recurring Transactions:**

**Monthly - Fixed Amount:**
- Rent: $1,500 (1st)
- Netflix: $15.99 (15th)
- Spotify: $9.99 (20th)
- Gym: $49.99 (5th)
- Phone: $85.00 (12th)
- iCloud: $2.99 (18th)

**Monthly - Variable:**
- Electric: ~$145 (varies by usage)
- Water: ~$45 (every 2 months)

**Annual:**
- Amazon Prime: $139/year (renews March)
- Car Insurance: $756/year ($189/quarter)

**Total monthly recurring: ~$1,855**`,
			},
		],
	});

	examples.push({
		id: "recurring_004",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How much do I pay for utilities each month?" },
			{
				role: "assistant",
				content: `Your monthly utility costs average **$244**:

| Utility | Average | Last Month | Trend |
|---------|---------|------------|-------|
| Electric | $145 | $152 | +5% (summer AC) |
| Water | $45 | $42 | -7% |
| Gas | $54 | $50 | -8% |

**Seasonal variation:**
- Summer (Jun-Aug): ~$280 (higher electric for AC)
- Winter (Dec-Feb): ~$260 (higher gas for heating)
- Spring/Fall: ~$200 (lowest)

You're in the lower utility months now. Expect costs to rise in summer.`,
			},
		],
	});

	return examples;
}

/**
 * Generate savings goal examples
 */
function generateSavingsGoalExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	examples.push({
		id: "savings_001",
		category: "financial_advice",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "I want to save for a vacation" },
			{
				role: "assistant",
				content: `Great! Let's set up a vacation savings goal.

**Quick Questions:**
1. How much do you want to save? (e.g., $3,000)
2. When do you want to travel? (e.g., 6 months from now)

Based on your current savings rate of ~$400/month and a typical vacation costing $2,500-4,000:

**Suggested Goal:**
- Target: $3,000
- Timeline: 6 months
- Monthly savings needed: $500

You could achieve this by:
- Reducing dining out by $100/month
- Skipping 2 streaming services temporarily
- Using your Marcus Savings account to earn 4.5% APY

Would you like me to create this goal and track your progress?`,
			},
		],
	});

	examples.push({
		id: "savings_002",
		category: "financial_advice",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How long until I have a 6 month emergency fund?" },
			{
				role: "assistant",
				content: `Let me calculate that for you:

**Current Emergency Fund:** $12,500 (Ally Savings)
**Monthly Expenses:** ~$3,500
**6-Month Target:** $21,000

**Gap:** $8,500 needed

At your current savings rate of $400/month:
- **Time to goal: 21 months**

**To reach it faster:**
| Monthly Savings | Time to Goal |
|-----------------|--------------|
| $400 (current) | 21 months |
| $500 | 17 months |
| $700 | 12 months |
| $850 | 10 months |

You already have 3.5 months covered - that's a solid foundation! Many experts say 3-6 months is sufficient.`,
			},
		],
	});

	examples.push({
		id: "savings_003",
		category: "financial_advice",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How can I save $500 more per month?" },
			{
				role: "assistant",
				content: `Here's a plan to save $500 more monthly based on your spending:

**Quick Wins (~$200/month):**
1. Cook more, dine out less: -$100
   - You spent $345 on dining; cut to $245
2. Reduce coffee shops: -$50
   - Make coffee at home 3 days/week
3. Review subscriptions: -$50
   - Cancel HBO Max or rotate streaming services

**Moderate Changes (~$200/month):**
4. Shop smarter: -$100
   - Use Costco more, Whole Foods less
5. Reduce entertainment: -$50
   - Free activities, library, parks
6. Gas savings: -$50
   - Combine errands, use GasBuddy

**Lifestyle Changes (~$100/month):**
7. Negotiate phone bill: -$25
8. Gym alternatives: -$50 (cancel gym, workout at home)
9. Energy savings: -$25

**Total potential: $550/month**

Start with the quick wins - they're easiest to maintain!`,
			},
		],
	});

	return examples;
}

/**
 * Generate transfer and income examples
 */
function generateTransferExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	examples.push({
		id: "transfer_001",
		category: "transaction_search",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "When did I last transfer money to savings?" },
			{
				role: "assistant",
				content: `Your last transfer to savings was **${randomDate(5)}**:

- Amount: $500
- From: Chase Checking
- To: Ally Savings
- Type: Manual transfer

**Recent savings transfers:**
| Date | Amount | To Account |
|------|--------|------------|
| ${randomDate(5)} | $500 | Ally Savings |
| ${randomDate(35)} | $500 | Ally Savings |
| ${randomDate(65)} | $400 | Marcus Savings |

You've transferred $1,400 to savings in the last 3 months. Would you like me to help set up automatic transfers?`,
			},
		],
	});

	examples.push({
		id: "transfer_002",
		category: "account_balance",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "When did I get paid last?" },
			{
				role: "assistant",
				content: `Your last paycheck was **${randomDate(12)}**:

- Amount: $3,500.00 (net)
- From: Employer Direct Deposit
- To: Chase Checking

**Pay schedule:** Bi-weekly (every other Friday)
**Next paycheck:** ${randomDate(-2)} (estimated)

**This month's income:**
- Paycheck 1: $3,500 (${randomDate(12)})
- Paycheck 2: $3,500 (expected ${randomDate(-2)})
- **Total: $7,000**`,
			},
		],
	});

	examples.push({
		id: "transfer_003",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What's my income vs expenses?" },
			{
				role: "assistant",
				content: `**Monthly Cash Flow Summary:**

**Income:** $7,000
- Salary: $7,000 (2 paychecks)

**Expenses:** $3,457
- Fixed: $1,855 (rent, utilities, subscriptions)
- Variable: $1,602 (groceries, dining, shopping)

**Net Cash Flow: +$3,543**

**Where it's going:**
- Savings transfers: $500 (7%)
- 401k contribution: $700 (10%)
- Remaining in checking: $2,343

**Savings Rate: 17%** (Savings + 401k)

This is above the recommended 15-20%. Great job!`,
			},
		],
	});

	return examples;
}

/**
 * Generate edge case and error handling examples
 */
function generateEdgeCaseExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	examples.push({
		id: "edge_001",
		category: "general_chat",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What's my balance at Bank of America?" },
			{
				role: "assistant",
				content: `I don't see a Bank of America account in your connected accounts.

**Your current accounts are:**
- Chase Checking
- Ally Savings
- Marcus Savings
- Amex Platinum
- Capital One Venture
- Vanguard 401k
- Fidelity Brokerage

Would you like to add a Bank of America account? You can connect it in Settings > Accounts.`,
			},
		],
	});

	examples.push({
		id: "edge_002",
		category: "spending_analysis",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How much did I spend on travel?" },
			{
				role: "assistant",
				content: `You haven't had any transactions categorized as Travel this month.

**Last travel expenses (past 6 months):**
- September: $567 (flight to Denver)
- July: $1,234 (vacation hotel + flights)

**Travel-related spending this month:**
- Uber: $89.45 (categorized as Transportation)
- Would you like me to recategorize some Uber rides as Travel?

To track travel better, you could create a Travel budget for future trips.`,
			},
		],
	});

	examples.push({
		id: "edge_003",
		category: "budget_management",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Delete my grocery budget" },
			{
				role: "assistant",
				content: `I can't delete budgets directly, but I can help you manage them.

**Your Groceries budget:**
- Current: $600/month
- This month: $456 spent (76%)

**Options:**
1. **Pause it** - Stop tracking temporarily
2. **Modify it** - Change the amount
3. **Archive it** - Keep history but hide from active view

To delete it completely, go to Budgets > Groceries > Settings > Delete.

Would you like me to modify the amount instead?`,
			},
		],
	});

	examples.push({
		id: "edge_004",
		category: "category_suggestion",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "I have an uncategorized transaction from 'ACH PAYMENT 847392'" },
			{
				role: "assistant",
				content: `That description looks like an ACH transfer. Let me help identify it:

**Transaction Details:**
- Description: ACH PAYMENT 847392
- Amount: ? (please share if you'd like specific help)
- Date: ?

**Common matches for ACH payments:**
- Utility bills (electric, water, gas)
- Insurance payments
- Loan payments
- Subscriptions

**To identify it:**
1. Check the amount - does it match any recurring bill?
2. Check the date - is it around when a bill is due?
3. The number might be a reference ID from the company

Would you like to share the amount and date so I can help match it?`,
			},
		],
	});

	// Unusual spending alert
	examples.push({
		id: "edge_005",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Do I have any unusual spending?" },
			{
				role: "assistant",
				content: `I analyzed your transactions and found a few unusual items:

**Flagged Transactions:**

1. **Large purchase at Best Buy** - $456.78 (${randomDate(5)})
   - 3x larger than your typical electronics purchase
   - Category: Shopping
   - Worth reviewing?

2. **International charge** - $89.99 (${randomDate(8)})
   - From: SPOTIFY IRELAND
   - Note: This is normal for Spotify (billed from Ireland)

3. **Duplicate gas station charge** - $45.23 twice (${randomDate(3)})
   - Same amount, same day, 2 hours apart
   - Could be: Pre-auth + actual charge
   - Action: One should drop off, monitor

**Patterns I noticed:**
- Your dining spending is 35% higher than usual this week
- You had 3 late-night online purchases (Amazon at 1-2am)

Nothing looks fraudulent, but the Best Buy purchase is worth remembering if you need to return it.`,
			},
		],
	});

	// Data export request
	examples.push({
		id: "edge_006",
		category: "general_chat",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Can I export my transaction data?" },
			{
				role: "assistant",
				content: `Yes! You can export your data in several formats:

**Export Options:**
1. **CSV** - For Excel/Google Sheets
2. **PDF** - For records/printing
3. **OFX/QFX** - For other finance apps

**What to export:**
- All transactions
- Specific date range
- Specific account(s)
- By category

**To export:**
Go to **Settings > Data > Export** or I can help you with a specific export.

**What would you like to export?**
- "Export all transactions for 2024"
- "Export just my Chase account"
- "Export my dining out transactions"

Let me know what you need!`,
			},
		],
	});

	// Privacy/data question
	examples.push({
		id: "edge_007",
		category: "general_chat",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Is my financial data secure?" },
			{
				role: "assistant",
				content: `Great question! Your financial data is protected:

**Security Measures:**
✅ **Encryption** - All data encrypted at rest and in transit
✅ **Local processing** - AI runs on your device, not cloud
✅ **No sharing** - Your data is never sold or shared
✅ **Bank-level security** - 256-bit AES encryption

**Your Control:**
- Export all your data anytime
- Delete individual transactions or full account history
- Revoke connections to linked accounts

**What I can see:**
- Transaction data you've imported
- Categories and budgets you've created
- Your preferences and settings

**What I cannot do:**
- Access your bank login credentials
- Make transactions on your behalf
- Share your data with anyone

Need more details on any security aspect?`,
			},
		],
	});

	// Feature request/limitation
	examples.push({
		id: "edge_008",
		category: "general_chat",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Can you set up automatic bill pay?" },
			{
				role: "assistant",
				content: `I can't set up automatic payments directly, but I can help in other ways:

**What I CAN do:**
✅ Remind you of upcoming bills
✅ Track if bills were paid
✅ Notify you of unusual bill amounts
✅ Show your payment history

**To set up auto-pay:**
You'll need to do this through:
1. Your bank's online banking
2. The biller's website (utility company, etc.)
3. Your credit card company

**Want me to:**
- List your recurring bills?
- Set up payment reminders?
- Show which bills you've paid this month?

I'm here to help you stay organized, even if I can't make the actual payments!`,
			},
		],
	});

	// Multiple accounts question
	examples.push({
		id: "edge_009",
		category: "account_balance",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Why are my balances different from my bank?" },
			{
				role: "assistant",
				content: `Good question! Differences usually come from:

**Common Reasons:**

1. **Pending transactions** - Your bank may show pending, we show cleared
   - Check: Do you have pending charges at the bank?

2. **Sync timing** - Data might not be real-time
   - Last sync: ${randomDate(0)} at 9:00 AM
   - Try: Manual refresh in Settings > Accounts

3. **Interest/fees** - Small bank charges we haven't picked up
   - Check: Any bank fees not imported?

4. **Transfers in progress** - Moving between accounts
   - Takes 1-3 days to settle

**To reconcile:**
| Account | Our Balance | Bank Balance | Difference |
|---------|-------------|--------------|------------|
| Chase | $3,245.67 | $3,295.67 | -$50.00 |

Would you like me to help find the $50 discrepancy? I can show all transactions in the last week.`,
			},
		],
	});

	// Goal tracking edge case
	examples.push({
		id: "edge_010",
		category: "financial_advice",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "I need to buy a car in 3 months. Can I afford it?" },
			{
				role: "assistant",
				content: `Let's figure this out! I'll need a few details:

**Quick Analysis (assuming $15,000 car):**

**Your Current Position:**
- Available savings: $17,500
- Monthly surplus: ~$3,350
- 3-month projection: +$10,050

**After car purchase:**
- Remaining savings: $2,500
- Emergency fund: Would be below target

**Financing Options:**

| Option | Monthly Payment | Total Cost |
|--------|-----------------|------------|
| Cash (all) | $0 | $15,000 |
| 50% down | ~$300/mo (48mo) | $16,400 |
| 20% down | ~$375/mo (48mo) | $18,000 |

**My Recommendation:**
With your finances, you could afford a $10-12K car in cash while keeping a 3-month emergency fund intact.

For a $15K car:
- Put 50% down ($7,500)
- Finance the rest at low rate
- Keeps emergency fund healthy

**Questions:**
- What's your target budget?
- New or used?
- Have you checked your credit for loan rates?`,
			},
		],
	});

	return examples;
}

/**
 * Generate general chat examples
 */
function generateGeneralChatExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	examples.push({
		id: "general_001",
		category: "general_chat",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Hello!" },
			{
				role: "assistant",
				content: `Hi! I'm your personal finance assistant. I can help you:

- Check account balances and net worth
- Analyze your spending patterns
- Track budgets and goals
- Search for specific transactions
- Get personalized savings tips

What would you like to know about your finances today?`,
			},
		],
	});

	examples.push({
		id: "general_002",
		category: "general_chat",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What can you do?" },
			{
				role: "assistant",
				content: `I can help you manage your finances in several ways:

**Information & Analysis**
- View account balances and net worth
- Analyze spending by category, payee, or time period
- Compare spending trends month-over-month
- Search and filter transactions

**Actions**
- Create and track budgets
- Categorize transactions
- Add new payees
- Set up financial goals

**Insights**
- Identify unusual spending patterns
- Suggest ways to save money
- Forecast upcoming expenses
- Track progress toward goals

Just ask me anything about your finances! For example:
- "How much did I spend on dining this month?"
- "Show me my Amazon transactions"
- "Create a $200 budget for entertainment"`,
			},
		],
	});

	examples.push({
		id: "general_003",
		category: "general_chat",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Thanks for the help!" },
			{
				role: "assistant",
				content: `You're welcome! I'm here whenever you need help with your finances.

A few things to try next time:
- Ask "How am I doing financially?" for a quick overview
- Say "Surprise me with an insight" for spending patterns you might have missed
- Check in weekly with "What should I know this week?"

Have a great day! 💰`,
			},
		],
	});

	examples.push({
		id: "general_004",
		category: "general_chat",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Give me a quick financial summary" },
			{
				role: "assistant",
				content: `**Your Financial Snapshot:**

💰 **Cash:** $20,746 across 3 accounts
📈 **Investments:** $58,025 (+9.2% YTD)
💳 **Debt:** $1,691 (credit cards)
📊 **Net Worth:** $77,079

**This Month:**
- Spent: $2,456 of ~$3,500 typical
- Budgets: 5 of 6 on track
- Saved: $500 transferred to savings

**Action Items:**
⚠️ Dining Out budget is 94% used
✅ All bills paid on time
💡 You could save $45/mo on subscriptions

Anything specific you'd like to dive into?`,
			},
		],
	});

	examples.push({
		id: "general_005",
		category: "general_chat",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Am I doing okay financially?" },
			{
				role: "assistant",
				content: `Yes, you're doing well! Here's why:

**Strengths:**
✅ Positive net worth: $77,079
✅ Emergency fund: 3.5 months of expenses
✅ Savings rate: 17% (above recommended 15%)
✅ Low credit utilization: 6.7%
✅ Consistent 401k contributions

**Areas to improve:**
⚡ Dining out is trending 23% above budget
⚡ Could increase emergency fund to 6 months
⚡ Subscription spending could be optimized

**Compared to averages:**
- Your savings rate beats 70% of people your age
- Your debt-to-income ratio is excellent
- Your emergency fund is above the median

Overall grade: **B+** - You're in good shape with room to grow!`,
			},
		],
	});

	// Comparison question
	examples.push({
		id: "general_006",
		category: "general_chat",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How do I compare to others my age?" },
			{
				role: "assistant",
				content: `Here's how you compare to others in your age group (assuming 30-35):

**Net Worth:**
- You: $77,079
- Average (30-35): $76,300
- Median (30-35): $35,200
- **You're in the top 40%!**

**Savings Rate:**
- You: 17%
- Average: 8%
- Recommended: 15-20%
- **Excellent! Better than 70%**

**Emergency Fund:**
- You: 3.5 months
- Average: 1.5 months
- Recommended: 3-6 months
- **Good! Better than 60%**

**Debt:**
- You: $1,691 (credit cards only)
- Average (30-35): $21,800 (includes student loans)
- **Very low debt!**

**Overall:** You're doing better than most people your age. Focus on hitting 6-month emergency fund and you'll be in the top 25%.`,
			},
		],
	});

	// Surprise insight
	examples.push({
		id: "general_007",
		category: "general_chat",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Surprise me with an insight" },
			{
				role: "assistant",
				content: `Here's something interesting I noticed:

**You spend 40% more on weekends! 📊**

**Weekly Pattern:**
- Weekday average: $85/day
- Weekend average: $119/day (+40%)

**What's happening:**
- Saturday: Big grocery shop + dining out
- Sunday: Entertainment + online shopping

**Another surprise:**
You've spent **$1,020 on coffee** this year - that's enough for a weekend getaway!

**One more:**
Your Netflix account costs you **$0.53 per hour** of use (based on your viewing). Spotify costs **$0.12 per hour** - much better value!

**Quick win:**
If you shifted one weekend meal to cooking at home, you'd save $200/month.

Want me to dig into any of these patterns?`,
			},
		],
	});

	// Weekly check-in
	examples.push({
		id: "general_008",
		category: "general_chat",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What should I know this week?" },
			{
				role: "assistant",
				content: `**Your Weekly Financial Briefing:**

**Upcoming Bills:**
- Electric bill (~$145) - Due in 3 days
- Phone bill ($85) - Due in 5 days
- Gym ($49.99) - Auto-pays in 6 days

**Budget Check:**
| Category | Status | Action |
|----------|--------|--------|
| Groceries | 76% used, 40% month left | ✅ On track |
| Dining | 94% used | ⚠️ Slow down |
| Shopping | 115% | 🔴 Over budget |

**Alerts:**
- Your credit card bill is due in 8 days ($1,234)
- You have 4 uncategorized transactions
- Netflix price increased $2 this month

**Money In:**
- Paycheck expected Friday: $3,500

**Recommendation:**
Hold off on non-essential purchases until after Friday. You're doing well but the dining budget is tight.

Have a great week!`,
			},
		],
	});

	// Natural language date handling
	examples.push({
		id: "general_009",
		category: "transaction_search",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What did I buy yesterday?" },
			{
				role: "assistant",
				content: `Here are your transactions from yesterday (${randomDate(1)}):

1. **Starbucks** - $6.45 (Dining Out)
   - Time: 8:15 AM
   - Account: Amex Platinum

2. **Chipotle** - $15.67 (Dining Out)
   - Time: 12:30 PM
   - Account: Amex Platinum

3. **Amazon** - $34.56 (Shopping)
   - Time: 7:45 PM
   - Account: Chase Checking

4. **Shell Gas** - $42.00 (Transportation)
   - Time: 5:30 PM
   - Account: Amex Platinum

**Yesterday's Total: $98.68**

This is 15% higher than your typical weekday ($85). The Amazon purchase pushed it above average.`,
			},
		],
	});

	// Complex question handling
	examples.push({
		id: "general_010",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "How much have I spent on food if you include groceries and dining out?",
			},
			{
				role: "assistant",
				content: `**Combined Food Spending This Month:**

| Category | Amount | % of Total |
|----------|--------|------------|
| Groceries | $567.89 | 62% |
| Dining Out | $345.67 | 38% |
| **Total Food** | **$913.56** | 100% |

**That's 26% of your total spending this month.**

**Breakdown of Dining Out:**
- Restaurants: $156.78
- Coffee shops: $87.45
- Delivery (DoorDash, etc.): $101.44

**Food spending trend:**
- This month: $913
- Last month: $867
- 3-month average: $845

**You're spending $105/week on food**, which is reasonable for one person. The dining/grocery ratio (38%/62%) is a bit high - 30%/70% is more economical.

Want tips to reduce the dining out portion?`,
			},
		],
	});

	// Help with app features
	examples.push({
		id: "general_011",
		category: "general_chat",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How do I add a new account?" },
			{
				role: "assistant",
				content: `Here's how to add a new account:

**Option 1: Manual Account**
1. Go to **Accounts** in the sidebar
2. Click **+ Add Account**
3. Choose account type (Checking, Savings, Credit Card, etc.)
4. Enter starting balance
5. Done!

**Option 2: Import Transactions**
1. Go to **Accounts** > **+ Add Account**
2. Click **Import from file**
3. Upload CSV, OFX, or QFX file
4. Map the columns
5. Done!

**Account Types Available:**
- Checking
- Savings
- Credit Card
- Cash
- Investment
- Loan
- Other

**Tips:**
- Start with your main checking account
- Add credit cards to track spending
- Investment accounts help track net worth

Would you like me to walk you through adding a specific type of account?`,
			},
		],
	});

	// Year over year comparison
	examples.push({
		id: "general_012",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How does this year compare to last year?" },
			{
				role: "assistant",
				content: `**Year-Over-Year Comparison:**

**Total Spending:**
- This year: $38,456 (10 months)
- Last year (same period): $36,234
- Change: **+6.1%** ($2,222 more)

**By Category:**

| Category | This Year | Last Year | Change |
|----------|-----------|-----------|--------|
| Housing | $15,000 | $15,000 | Same |
| Groceries | $5,670 | $5,234 | +8% |
| Dining | $3,456 | $2,890 | +20% 📈 |
| Transportation | $2,890 | $3,120 | -7% 📉 |
| Shopping | $4,567 | $3,890 | +17% 📈 |
| Entertainment | $1,780 | $1,560 | +14% |

**What changed:**
- Dining out increased most (more delivery orders)
- Transportation down (working from home more)
- Shopping up (home improvement projects)

**Bright spot:** Your savings rate improved from 14% to 17%!`,
			},
		],
	});

	// Fun/engaging question
	examples.push({
		id: "general_013",
		category: "general_chat",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What's my most interesting financial fact?" },
			{
				role: "assistant",
				content: `Here's your most interesting financial fact:

**You've spent more on coffee than on Netflix, Spotify, and gym combined!** ☕

**The numbers:**
- Coffee shops: $1,020/year
- Netflix + Spotify + Gym: $912/year

**More fun facts:**

🍕 **Pizza stat:** You order DoorDash 73% more on Fridays than any other day

💰 **Lucky number:** Your most common transaction amount is $15.99 (Netflix)

📈 **Best day:** You save the most money on Mondays (lowest spending day)

🛒 **Shopping pattern:** 67% of your Amazon purchases happen between 8-10 PM

⏰ **Timing:** Your bills are paid an average of 3 days before due date (nicely organized!)

Want more financial trivia about your spending?`,
			},
		],
	});

	return examples;
}

/**
 * Generate calculation and "what-if" scenario examples
 */
function generateCalculationExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	examples.push({
		id: "calc_001",
		category: "financial_advice",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "How much can I spend per day if I want to save $500 this month?",
			},
			{
				role: "assistant",
				content: `Let me calculate your daily spending budget:

**Your Monthly Picture:**
- Expected income: $7,000
- Fixed expenses: $1,855 (rent, bills, subscriptions)
- Target savings: $500
- **Available for spending: $4,645**

**Daily Budget: $154.83/day** (30 days)

**Current pace:**
- You've spent $1,456 in 10 days = $145.60/day
- ✅ You're under budget by $9.23/day

**To hit your $500 savings goal:**
- Remaining days: 20
- Remaining budget: $3,189
- Daily limit: **$159.45/day**

You're on track! Keep spending under $160/day and you'll hit your savings goal.`,
			},
		],
	});

	examples.push({
		id: "calc_002",
		category: "financial_advice",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "If I cut my coffee spending in half, how long until I save $1000?",
			},
			{
				role: "assistant",
				content: `Great question! Let's do the math:

**Your Coffee Spending:**
- Current: $87/month
- If cut in half: $43.50/month
- **Monthly savings: $43.50**

**Time to $1,000:**
- At $43.50/month: **23 months** (just under 2 years)

**Want to speed it up?**

| Coffee Reduction | Monthly Saved | Time to $1K |
|------------------|---------------|-------------|
| Cut 25% | $21.75 | 46 months |
| Cut 50% | $43.50 | 23 months |
| Cut 75% | $65.25 | 15 months |
| Eliminate | $87.00 | 11.5 months |

**Alternative:** Make coffee at home 4 days/week (current: 0) and treat yourself 1 day. That's roughly a 60% cut = **19 months to $1,000**.

The coffee alone won't make you rich, but it's $522/year that could go to investments!`,
			},
		],
	});

	examples.push({
		id: "calc_003",
		category: "forecasting",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "What if I got a $500/month raise? How would that change things?",
			},
			{
				role: "assistant",
				content: `Let's model a $500/month raise:

**Current Finances:**
- Income: $7,000/month
- Expenses: $3,500/month
- Savings: $500/month
- Savings rate: 7.1%

**With $500 Raise ($7,500/month):**

| Scenario | New Savings | Savings Rate | Impact |
|----------|-------------|--------------|--------|
| Save it all | $1,000/mo | 13.3% | +$6,000/year |
| 50/50 split | $750/mo | 10% | +$3,000/year |
| Lifestyle creep | $500/mo | 6.7% | No change |

**My Recommendation: 50/50 Split**
- Extra $250/month to savings
- Extra $250/month to quality of life
- Emergency fund complete in 12 months instead of 21

**Long-term Impact (if you invest the extra $250):**
- In 5 years: ~$18,500
- In 10 years: ~$45,000
- In 20 years: ~$130,000

The key is avoiding lifestyle creep! Want me to set up a savings goal for when you get the raise?`,
			},
		],
	});

	examples.push({
		id: "calc_004",
		category: "financial_advice",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "How much house can I afford?",
			},
			{
				role: "assistant",
				content: `Based on your financial profile, here's a home affordability estimate:

**Your Financials:**
- Annual income: ~$84,000
- Monthly income: $7,000
- Current debt payments: $60/month (credit cards)
- Down payment available: ~$17,500 (savings)

**Affordability Estimates:**

| Guideline | Max Home Price | Monthly Payment |
|-----------|---------------|-----------------|
| 28% rule (housing only) | $280,000 | $1,960 |
| 36% rule (total debt) | $310,000 | $2,100 |
| Conservative (25%) | $250,000 | $1,750 |

**Recommended: $250,000 - $280,000**

**With 10% down ($25-28K):**
- Mortgage: $225,000 - $252,000
- Est. monthly: $1,600 - $1,800 (P&I)
- Add ~$400 for taxes/insurance
- **Total: $2,000 - $2,200/month**

**Note:** You'd need to save an additional $7,500 - $10,500 for a 10% down payment. At your current savings rate, that's about 15-21 months.

*This is a rough estimate. Talk to a lender for pre-approval.*`,
			},
		],
	});

	examples.push({
		id: "calc_005",
		category: "spending_analysis",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "How much am I spending per meal when I eat out?",
			},
			{
				role: "assistant",
				content: `Let me break down your dining cost per meal:

**This Month's Dining Data:**
- Total dining spending: $345.67
- Number of transactions: 18
- **Average per transaction: $19.20**

**By Type:**

| Type | Spending | Visits | Avg/Visit |
|------|----------|--------|-----------|
| Restaurants | $156.78 | 5 | $31.36 |
| Fast food | $67.45 | 6 | $11.24 |
| Coffee shops | $78.44 | 7 | $11.21 |
| Delivery | $43.00 | 2 | $21.50* |

*Delivery includes fees & tips

**Comparison:**
- Your average restaurant meal: **$31.36**
- Average home-cooked meal: ~$4-6
- **You spend 5-6x more eating out!**

**If you shifted 2 restaurant meals to home cooking:**
- Savings: ~$50/month
- Annual: $600

Your most expensive dining spot? Olive Garden at $67.89 for one meal.`,
			},
		],
	});

	return examples;
}

/**
 * Generate credit card rewards and optimization examples
 */
function generateRewardsExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	examples.push({
		id: "rewards_001",
		category: "financial_advice",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "Which card should I use for groceries?",
			},
			{
				role: "assistant",
				content: `Based on your cards, here's the best choice for groceries:

**Your Cards & Grocery Rewards:**

| Card | Grocery Rate | Your Monthly Groceries | Monthly Rewards |
|------|--------------|----------------------|-----------------|
| Amex Platinum | 1x | $567 | $5.67 |
| Capital One Venture | 2x | $567 | $11.34 |

**Winner: Capital One Venture** (2x on everything)

**But consider:**
- If you got a card like Amex Blue Cash Preferred (6% groceries), you'd earn **$34/month** instead
- Annual fee of $95 would be covered after $158/month in groceries
- You spend $567/month - it would pay off!

**Current Strategy:**
Use Capital One Venture for groceries until you decide on a dedicated grocery card.

**Your best cards by category:**
- Groceries: Capital One Venture (2x)
- Dining: Amex Platinum (5x at restaurants)
- Travel: Amex Platinum (5x flights)
- Everything else: Capital One Venture (2x)`,
			},
		],
	});

	examples.push({
		id: "rewards_002",
		category: "spending_analysis",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "How much have I earned in credit card rewards?",
			},
			{
				role: "assistant",
				content: `Here's your estimated rewards earnings this year:

**Amex Platinum:**
- Total spend: $8,456
- Rewards rate: Mix of 1x-5x
- Est. points earned: ~12,500 MR points
- **Value: ~$250** (at 2cpp)

**Capital One Venture:**
- Total spend: $6,234
- Rewards rate: 2x on everything
- Miles earned: ~12,468 miles
- **Value: ~$125** (at 1cpp)

**Total Rewards Value: ~$375 YTD**

**Are you maximizing?**
- ✅ Using Amex for dining (5x) - Good!
- ⚠️ Using Amex for groceries (1x) - Could be 6x with Blue Cash
- ⚠️ Not using category bonuses fully

**Potential if optimized:** $500-600/year

**Tip:** You're paying $695 in annual fees. You're getting $375 in rewards plus other perks (lounge access, credits). Make sure you're using all the perks!`,
			},
		],
	});

	examples.push({
		id: "rewards_003",
		category: "financial_advice",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "Is my credit card worth the annual fee?",
			},
			{
				role: "assistant",
				content: `Let's analyze your Amex Platinum ($695/year):

**Value You're Getting:**

| Benefit | Annual Value | You Using? |
|---------|--------------|------------|
| Uber credits | $200 | ✅ Yes ($180 used) |
| Dining credits | $240 | ⚠️ Partial ($120 used) |
| Airline fee credit | $200 | ❌ No |
| Hotel credit | $200 | ❌ No |
| Lounge access | $100+ | ✅ Yes (4 visits) |
| 5x dining/flights | ~$150 | ✅ Yes |

**Your Total Value: ~$550**
**Annual Fee: $695**
**Net: -$145** 😬

**Verdict: You're not quite breaking even.**

**To make it worth it:**
1. Use the $200 airline credit (bag fees, seat upgrades)
2. Use the $200 hotel credit (book through Amex Travel)
3. Max out the $240 dining credits ($20/month at Grubhub, etc.)

**Alternative:** The Capital One Venture X ($395/year) might be better for your spending patterns. Want me to compare?`,
			},
		],
	});

	return examples;
}

/**
 * Generate seasonal and holiday budgeting examples
 */
function generateSeasonalExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	examples.push({
		id: "seasonal_001",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "How much did I spend last Christmas?",
			},
			{
				role: "assistant",
				content: `Here's your Christmas spending breakdown (Dec 1-25 last year):

**Total Holiday Spending: $1,234.56**

**By Category:**
- Gifts: $678.90 (55%)
- Decorations: $123.45 (10%)
- Holiday food/entertaining: $234.56 (19%)
- Travel: $156.78 (13%)
- Other: $40.87 (3%)

**Gift Recipients:**
- Amazon: $345.67 (likely gifts)
- Target: $189.45
- Best Buy: $143.78
- Various stores: $remainder

**Compared to this year's budget:**
- Last year's spending: $1,235
- Your current holiday budget: $0 (not set up!)

**Recommendation:**
Start setting aside **$150-175/month** now to avoid credit card debt during the holidays. Want me to create a "Holiday Fund" goal?`,
			},
		],
	});

	examples.push({
		id: "seasonal_002",
		category: "budget_management",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "Help me budget for the holidays",
			},
			{
				role: "assistant",
				content: `Let's create a holiday budget based on your history:

**Last Year's Holiday Spending: $1,235**

**Suggested Budget:**

| Category | Suggested | Notes |
|----------|-----------|-------|
| Gifts | $700 | ~$50-100 per person |
| Food/Entertaining | $200 | Holiday meals, parties |
| Decorations | $75 | You already have basics |
| Travel | $200 | If visiting family |
| Buffer | $75 | Unexpected expenses |
| **Total** | **$1,250** | |

**Funding Plan (2 months until holidays):**
- Monthly set-aside: $625/month
- OR start earlier next year: $105/month for 12 months

**Current Cash Available:**
- You have $17,500 in savings
- Could allocate $1,250 without impacting emergency fund

**Budget Created:**
- Holiday Spending: $1,250
- Category: Seasonal
- Period: Nov 1 - Dec 31

I'll track your holiday spending and alert you at 75% and 100%. Would you like to also create a gift list to track individual recipients?`,
			},
		],
	});

	examples.push({
		id: "seasonal_003",
		category: "spending_analysis",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "How does my summer spending compare to winter?",
			},
			{
				role: "assistant",
				content: `**Seasonal Spending Comparison:**

| Category | Summer (Jun-Aug) | Winter (Dec-Feb) | Difference |
|----------|------------------|------------------|------------|
| Utilities | $840 | $720 | +17% (AC) |
| Dining Out | $1,045 | $867 | +21% (patios!) |
| Entertainment | $534 | $423 | +26% |
| Travel | $1,234 | $456 | +171% |
| Shopping | $567 | $1,123 | -50% (holidays) |
| **Total** | **$10,456** | **$11,234** | **-7%** |

**Key Insights:**

☀️ **Summer peaks:**
- Travel (+$778) - vacation
- Dining (+$178) - more social outings
- Entertainment (+$111) - activities

❄️ **Winter peaks:**
- Shopping (+$556) - holiday gifts
- Heating is offset by less AC

**Your most expensive month:** December ($4,234)
**Your cheapest month:** February ($3,012)

**Tip:** Your summer travel spending spikes. Consider starting a "Vacation Fund" in January to spread the cost.`,
			},
		],
	});

	examples.push({
		id: "seasonal_004",
		category: "forecasting",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "What expenses should I expect in January?",
			},
			{
				role: "assistant",
				content: `**January Expense Forecast:**

**Regular Monthly Expenses: $3,500**
(Same as usual)

**January-Specific Items:**

| Expense | Amount | Due Date | Notes |
|---------|--------|----------|-------|
| Gym renewal | $599 | Jan 1 | Annual fee |
| Car registration | $189 | Jan 15 | Due this month |
| Amazon Prime | $139 | Jan 22 | Annual renewal |
| Property tax (if applicable) | - | Varies | Check if due |

**Seasonal Adjustments:**
- Heating: +$30-50 (cold month)
- Dining: -$50 (post-holiday slowdown)
- Shopping: -$100 (holiday recovery)

**Total January Estimate: $4,427**
(vs typical $3,500 = +$927)

**Cash Flow Check:**
- Expected income: $7,000
- Expected expenses: $4,427
- Credit card from holidays: ~$500 (if any)
- **Available: $2,073**

**Recommendation:** January is expensive with annual renewals. Make sure you have extra buffer. Want me to create reminders for these expenses?`,
			},
		],
	});

	return examples;
}

/**
 * Generate goal tracking examples beyond savings
 */
function generateGoalTrackingExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	examples.push({
		id: "goal_001",
		category: "budget_management",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "Help me set up a 50/30/20 budget",
			},
			{
				role: "assistant",
				content: `Let's set up a 50/30/20 budget based on your income:

**Your Monthly Income: $7,000**

**50/30/20 Breakdown:**

| Category | Target % | Target $ | Your Current |
|----------|----------|----------|--------------|
| Needs | 50% | $3,500 | $2,855 ✅ |
| Wants | 30% | $2,100 | $1,645 ✅ |
| Savings/Debt | 20% | $1,400 | $1,200 ⚠️ |

**Needs ($3,500 target):**
- Rent: $1,500
- Utilities: $245
- Groceries: $567
- Transportation: $289
- Insurance: $189
- Phone: $85
- **Current: $2,855** (41% - under target ✅)

**Wants ($2,100 target):**
- Dining out: $345
- Entertainment: $178
- Shopping: $234
- Subscriptions: $125
- Personal care: $89
- **Current: $971** (could add ~$1,100 more!)

**Savings/Debt ($1,400 target):**
- Current savings: $500
- 401k: $700
- **Current: $1,200** (17% - need +$200)

**Action Plan:**
Move $200 from "Wants" surplus to savings to hit 20%.

Want me to set up budget alerts based on these targets?`,
			},
		],
	});

	examples.push({
		id: "goal_002",
		category: "budget_management",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "Track my no-spend challenge progress",
			},
			{
				role: "assistant",
				content: `**No-Spend Challenge Progress:**

**Challenge Details:**
- Type: No discretionary spending
- Duration: 30 days
- Start: ${randomDate(15)}
- End: ${randomDate(-15)}

**Day 16 of 30 - You're over halfway! 🎉**

**Spending Status:**

| Category | Allowed? | Spent | Status |
|----------|----------|-------|--------|
| Groceries | ✅ Yes | $234 | Essential |
| Gas | ✅ Yes | $45 | Essential |
| Bills | ✅ Yes | $245 | Essential |
| Dining out | ❌ No | $12.45 | ⚠️ Slip! |
| Shopping | ❌ No | $0 | ✅ Clean |
| Entertainment | ❌ No | $9.99 | ⚠️ Netflix? |
| Coffee shops | ❌ No | $0 | ✅ Clean |

**Challenge Score: 85%** (2 small slips)

**Savings So Far:**
- Typical 16-day discretionary: ~$400
- Your actual: $22.44
- **Saved: $377.56!**

**Projected 30-day savings: $708**

Keep going! You've resisted 12 temptations (I saw those almost-purchases at Amazon and Target that you deleted from cart).`,
			},
		],
	});

	examples.push({
		id: "goal_003",
		category: "financial_advice",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "Set a goal to pay off my credit card by June",
			},
			{
				role: "assistant",
				content: `Let's create a credit card payoff plan:

**Current Credit Card Debt:**
- Amex Platinum: $1,234.56 (18.9% APR)
- Capital One: $456.78 (22.9% APR)
- **Total: $1,691.34**

**Goal: Pay off by June (6 months)**

**Required Monthly Payment: $295**

| Month | Payment | Remaining | Interest |
|-------|---------|-----------|----------|
| Jan | $295 | $1,422 | $26 |
| Feb | $295 | $1,148 | $21 |
| Mar | $295 | $869 | $16 |
| Apr | $295 | $585 | $11 |
| May | $295 | $296 | $5 |
| Jun | $301 | $0 | $0 |

**Total Interest: $79**

**Strategy: Avalanche Method**
1. Pay minimums on Amex (~$35)
2. Put rest ($260) toward Capital One (higher rate)
3. Once Capital One is paid (month 2), attack Amex

**Can you afford it?**
- Current surplus: ~$3,350/month
- Required: $295/month
- ✅ Very affordable!

**Goal Created:**
- Name: Credit Card Freedom
- Target: $0 balance
- Deadline: June 30
- Monthly payment: $295

I'll track your payments and alert you if you're off pace!`,
			},
		],
	});

	examples.push({
		id: "goal_004",
		category: "spending_analysis",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "How am I doing on my fitness spending goal?",
			},
			{
				role: "assistant",
				content: `**Fitness Spending Goal Progress:**

**Your Goal:** Spend at least $100/month on fitness
**Reasoning:** Invest in health

**This Month:**
- Gym membership: $49.99
- Fitness app: $12.99
- Workout gear (Amazon): $34.56
- Sports drinks/supplements: $23.45
- **Total: $120.99** ✅

**Monthly Trend:**

| Month | Spent | Target | Status |
|-------|-------|--------|--------|
| Oct | $49.99 | $100 | ❌ Under |
| Nov | $87.45 | $100 | ❌ Close |
| Dec | $120.99 | $100 | ✅ Met! |

**Insights:**
- You went to the gym 12 times this month (vs 8 last month)
- Cost per gym visit: $4.17
- You're getting good value from the membership!

**Suggestion:** Your gym has classes included. Try one to get even more value from your $49.99.

Keep it up! Spending on health is an investment, not an expense.`,
			},
		],
	});

	return examples;
}

/**
 * Generate historical pattern examples
 */
function generatePatternExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	examples.push({
		id: "pattern_001",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "What day of the month do I usually run low on cash?",
			},
			{
				role: "assistant",
				content: `Based on 6 months of data, here's your cash flow pattern:

**Your Lowest Balance Days:**

| Day | Avg Balance | Why |
|-----|-------------|-----|
| 1st-3rd | $1,456 | After rent |
| 14th-16th | $2,890 | Mid-month bills |
| 28th-30th | $1,678 | Before paycheck |

**Your Tightest Day: The 2nd** (average $1,234)

**Pattern Breakdown:**
- 1st: Rent ($1,500) hits
- 2nd: Auto-pay bills trigger
- 5th: Paycheck arrives (+$3,500)
- 15th: Second round of bills
- 20th: Paycheck arrives (+$3,500)

**Risk Assessment:**
- Minimum balance needed: $1,500 (your preference)
- Times you dipped below: 2 of 6 months
- Lowest recorded: $987 (October 2nd)

**Recommendation:**
Consider paying rent on the 3rd instead of 1st (if allowed), so your paycheck clears first. Or keep an extra $500 buffer for month-end.`,
			},
		],
	});

	examples.push({
		id: "pattern_002",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "When did my delivery spending start increasing?",
			},
			{
				role: "assistant",
				content: `I analyzed your delivery app spending over the past year:

**Delivery Spending Timeline:**

| Period | Monthly Avg | Change |
|--------|-------------|--------|
| Jan-Mar | $67/month | Baseline |
| Apr-Jun | $89/month | +33% |
| Jul-Sep | $134/month | +100% |
| Oct-Dec | $187/month | +179% |

**The inflection point: April**

**What happened in April?**
- You signed up for DashPass ($9.99/month on Apr 12)
- First month: 8 orders vs previous 3-4
- Your average order size stayed the same (~$28)

**The DashPass Effect:**
- You're ordering 2x more frequently
- "Free delivery" is costing you $120/month extra
- DashPass saves you ~$30 in fees
- **Net cost of DashPass: +$90/month**

**Pattern I noticed:**
- 73% of orders are weeknights (tired after work?)
- Most orders: 7-9 PM
- Most common: Thai food, pizza

**Suggestion:** The convenience is costing you $1,080/year more than before. Consider meal prepping on Sundays?`,
			},
		],
	});

	examples.push({
		id: "pattern_003",
		category: "spending_analysis",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "Show me my spending by day of week",
			},
			{
				role: "assistant",
				content: `**Spending by Day of Week (Last 3 Months):**

| Day | Avg Spending | # Transactions | Top Category |
|-----|--------------|----------------|--------------|
| Monday | $72 | 2.3 | Groceries |
| Tuesday | $68 | 2.1 | Gas |
| Wednesday | $75 | 2.5 | Dining |
| Thursday | $82 | 2.8 | Shopping |
| Friday | $124 | 3.4 | Dining |
| Saturday | $156 | 4.2 | Shopping |
| Sunday | $89 | 2.8 | Groceries |

**Weekly Pattern:**
📉 Mon-Tue: Low spending (recovery mode)
📈 Wed-Thu: Building up
🔥 Fri-Sat: Peak spending (+80% vs weekday avg)
📉 Sunday: Moderate (groceries prep)

**Weekend Impact:**
- Weekday average: $79/day
- Weekend average: $123/day
- **Extra weekend spending: $88/week = $352/month**

**Your most expensive day ever:** Saturday, Dec 14 ($456 - holiday shopping)
**Your cheapest day ever:** Monday, Feb 10 ($0 - no spend day!)

Want me to set a weekend spending limit?`,
			},
		],
	});

	examples.push({
		id: "pattern_004",
		category: "spending_analysis",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "What time of day do I spend the most?",
			},
			{
				role: "assistant",
				content: `**Spending by Time of Day:**

| Time | Avg/Transaction | Total Spending | Category |
|------|-----------------|----------------|----------|
| 6-9 AM | $6.23 | $186 | Coffee ☕ |
| 9-12 PM | $23.45 | $234 | Various |
| 12-2 PM | $14.56 | $291 | Lunch 🍽️ |
| 2-5 PM | $45.67 | $456 | Shopping 🛍️ |
| 5-8 PM | $67.89 | $678 | Groceries, Dinner |
| 8-11 PM | $34.56 | $345 | Online shopping |
| 11 PM-6 AM | $28.99 | $145 | Late-night orders 🌙 |

**Peak Spending Hours:**
🔴 5-8 PM (20% of all spending)
- This is when you grocery shop and pick up dinner
- Tired + hungry = higher spending

**Impulse Zone:**
🌙 8 PM - 12 AM
- 67% of your Amazon orders
- 45% are "next-day regret" candidates

**Morning Habit:**
- 18 coffee purchases this month
- Average: $6.23 each
- Monthly total: $112

**Tip:** Your late-night shopping is costing ~$200/month. Try adding items to cart and waiting 24 hours before buying!`,
			},
		],
	});

	return examples;
}

/**
 * Generate casual/informal language examples
 */
function generateCasualLanguageExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	examples.push({
		id: "casual_001",
		category: "account_balance",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "whats my blance",
			},
			{
				role: "assistant",
				content: `Your checking balance is **$3,245.67** (Chase Checking).

Quick overview:
- Checking: $3,245.67
- Savings: $17,500.00
- Credit cards: -$1,691.34

Need more details on any account?`,
			},
		],
	});

	examples.push({
		id: "casual_002",
		category: "account_balance",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "How broke am I?",
			},
			{
				role: "assistant",
				content: `Not broke at all! Here's the real picture:

**The Good News:**
- Net worth: $77,079 💪
- Emergency fund: 3.5 months covered
- Credit utilization: Only 6.7%

**Cash on Hand:**
- Checking: $3,245
- Savings: $17,500
- Total liquid: $20,745

**Monthly Surplus:** +$3,350

**Broke-ness Score: 2/10** (Very not broke)

You've got more than most people your age! The "broke" feeling might be from:
- Just paid rent? (That hits everyone)
- Comparing to social media? (Don't)
- Lifestyle inflation? (We can work on that)

What's making you feel squeezed?`,
			},
		],
	});

	examples.push({
		id: "casual_003",
		category: "spending_analysis",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "grocery $?",
			},
			{
				role: "assistant",
				content: `**Groceries this month: $456**

- Budget: $600
- Remaining: $144
- Status: ✅ On track

Top stores:
1. Whole Foods: $234
2. Trader Joe's: $134
3. Costco: $88

Anything else?`,
			},
		],
	});

	examples.push({
		id: "casual_004",
		category: "general_chat",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "ugh i spent too much this weekend",
			},
			{
				role: "assistant",
				content: `I hear you. Let's see the damage:

**This Weekend's Spending: $287.45**

| Where | Amount | Ouch Level |
|-------|--------|------------|
| Brunch | $67.89 | 😅 |
| Target run | $89.99 | 😬 |
| Drinks + Uber | $54.67 | 🍻 |
| DoorDash | $34.90 | 🍕 |
| Amazon impulse | $40.00 | 📦 |

**Compared to typical weekend:** +$164 (134% higher)

**Silver lining:**
- You're still within monthly budget overall
- It happens! One weekend won't ruin you
- No credit card debt added

**Quick recovery plan:**
- Low-key this week? Stay under $50/day
- Cook meals from what's in the fridge
- Return the Amazon thing if you don't need it?

Don't beat yourself up. We all have those weekends. 🤷`,
			},
		],
	});

	examples.push({
		id: "casual_005",
		category: "transaction_search",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "where'd my money go lol",
			},
			{
				role: "assistant",
				content: `Haha, let me trace the money trail 🔍

**This Month So Far: $2,456 spent**

**Top Money Drains:**
1. 🏠 Rent: $1,500 (the big one)
2. 🛒 Groceries: $456
3. 🍽️ Dining/Delivery: $234
4. 🛍️ Shopping: $156
5. ⛽ Gas: $89

**Surprise Expenses:**
- Target: $89.99 (what'd you buy?? 🎯)
- Amazon: 3 orders = $112 (Prime addiction?)
- That fancy dinner: $67.89

**Mystery Solved:**
Most of it's normal bills. The "leaks" are:
- Dining out: +$45 over budget
- Random Target trips: $90/month avg
- Late-night Amazon: $40

**The real question:** Any regrets in that list? We can set up some guardrails if you want!`,
			},
		],
	});

	examples.push({
		id: "casual_006",
		category: "financial_advice",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "can i afford this $200 jacket",
			},
			{
				role: "assistant",
				content: `Let's check:

**Quick Answer: Yes, but...** 🧥

**Your Situation:**
- Checking: $3,245 ✅
- Shopping budget left: $156 ❌ ($44 over if you buy)
- Bills coming up: ~$300 this week

**The Math:**
- After jacket: $3,045 checking
- After bills: $2,745
- Before next paycheck: Still comfortable

**But Consider:**
- You'd be $44 over shopping budget
- Is it a need or a want?
- Will you wear it 50+ times? (= $4/wear, not bad)
- Can you wait for a sale?

**My Take:**
You *can* afford it financially. The question is whether it aligns with your goals. You're trying to save $500/month - this would cut into that.

**Options:**
1. Buy it, adjust somewhere else
2. Wait 24 hours (impulse test)
3. Look for it on sale
4. Save toward it next month

What's your gut saying?`,
			},
		],
	});

	return examples;
}

/**
 * Generate project and event tracking examples
 */
function generateProjectExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	examples.push({
		id: "project_001",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "Track my moving expenses",
			},
			{
				role: "assistant",
				content: `I'll help track your move! Let me find related expenses:

**Moving Expenses Found:**

| Date | Expense | Amount | Category |
|------|---------|--------|----------|
| ${randomDate(30)} | U-Haul rental | $189.00 | Moving |
| ${randomDate(28)} | Boxes/supplies (Home Depot) | $67.45 | Moving |
| ${randomDate(25)} | Security deposit | $1,500.00 | Moving |
| ${randomDate(25)} | First month rent | $1,500.00 | Moving |
| ${randomDate(20)} | Cleaning supplies | $45.67 | Moving |
| ${randomDate(18)} | Pizza for helpers | $34.56 | Moving |
| ${randomDate(15)} | New shower curtain, etc | $89.99 | Moving |
| ${randomDate(10)} | Address change/mail forward | $1.10 | Moving |

**Total Moving Costs: $3,427.77**

**Breakdown:**
- One-time deposits: $1,500 (getting back eventually)
- Actual moving: $256.45
- New place setup: $135.66
- First month rent: $1,500

**Budget Created:** "Moving Expenses"
- I'll auto-tag future Home Depot, furniture store, and similar purchases
- Set a limit? Average move costs $3,000-5,000

Any expenses I missed?`,
			},
		],
	});

	examples.push({
		id: "project_002",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "What did I spend on my vacation?",
			},
			{
				role: "assistant",
				content: `Found your recent trip! Here's the breakdown:

**Vacation: July 15-22 (7 days)**

**Total Trip Cost: $2,456.78**

| Category | Amount | Per Day |
|----------|--------|---------|
| Flights | $456.00 | - |
| Hotel (6 nights) | $890.00 | $148.33 |
| Food & Dining | $534.67 | $76.38 |
| Activities/Tours | $234.56 | $33.51 |
| Transportation | $156.78 | $22.40 |
| Shopping/Souvenirs | $145.67 | $20.81 |
| Miscellaneous | $39.10 | $5.59 |

**Cost Per Day: $350.97**

**Spending Pattern:**
- Most expensive day: Day 3 ($456 - that boat tour!)
- Cheapest day: Day 7 ($89 - travel day)
- Food was 22% of trip (typical is 25-30%)

**Compared to last vacation:**
- This trip: $2,457 (7 days)
- Previous: $1,890 (5 days)
- Per day: Similar (~$350-380)

**Tip for next time:**
Book activities in advance - you paid $45 more for last-minute tour booking.

Want me to create a "Vacation Fund" for your next trip?`,
			},
		],
	});

	examples.push({
		id: "project_003",
		category: "spending_analysis",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "How much have I spent on home improvement this year?",
			},
			{
				role: "assistant",
				content: `**Home Improvement Spending YTD:**

**Total: $2,345.67**

**By Store:**
- Home Depot: $1,234.56 (15 visits)
- Lowe's: $456.78 (6 visits)
- Amazon (home items): $345.67 (12 orders)
- IKEA: $234.56 (2 visits)
- Other: $74.10

**By Project (estimated based on timing):**

| Project | Cost | When |
|---------|------|------|
| Bathroom update | $567 | February |
| Garden/patio | $456 | May |
| Kitchen organization | $234 | July |
| Painting supplies | $189 | August |
| Random fixes | $456 | Throughout |
| Furniture | $443 | Various |

**Monthly Average: $195/month**

**Pattern:**
- Spring spike (March-May): $789 - outdoor projects
- Fall spike (Sept-Oct): $456 - weatherproofing

**Tax Note:**
If you rent, these aren't deductible. If you own, some improvements can add to your cost basis. Keep receipts!

Want me to create a "Home Projects" budget?`,
			},
		],
	});

	examples.push({
		id: "project_004",
		category: "spending_analysis",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "Birthday spending this year",
			},
			{
				role: "assistant",
				content: `**Birthday-Related Spending This Year:**

**Your Birthday (April):**
- Birthday dinner out: $89.45 (treated yourself!)
- New outfit: $156.78
- Total: $246.23

**Gifts for Others:**

| Person | Date | Gift | Amount |
|--------|------|------|--------|
| Mom | Feb | Flowers + dinner | $134.56 |
| Partner | Mar | Watch + dinner | $289.00 |
| Best friend | May | Concert tickets | $156.00 |
| Dad | Jun | Golf stuff | $89.99 |
| Sister | Aug | Spa gift card | $100.00 |
| Niece | Sep | Toys | $45.67 |
| Coworker | Nov | Group gift | $25.00 |

**Total Gifts Given: $840.22**
**Total Birthday Spending: $1,086.45**

**Monthly Average:** ~$90/month for gifts

**Upcoming Birthdays (if you've told me):**
- None saved yet!

**Tip:** Want me to remind you a week before each birthday? I can also suggest budget-friendly gift ideas!`,
			},
		],
	});

	return examples;
}

/**
 * Generate follow-up and contextual examples
 */
function generateFollowUpExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	examples.push({
		id: "followup_001",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "What about last month?",
			},
			{
				role: "assistant",
				content: `**Last Month's Summary:**

| Category | Last Month | This Month | Change |
|----------|------------|------------|--------|
| Total Spending | $3,289 | $2,456 | -25% 📉 |
| Groceries | $523 | $456 | -13% |
| Dining | $298 | $234 | -21% |
| Shopping | $189 | $156 | -17% |
| Entertainment | $167 | $89 | -47% |

**Last Month Highlights:**
- Biggest expense: Rent ($1,500)
- Largest single purchase: Best Buy ($234)
- Most transactions: Amazon (12)

**Why the difference?**
- No major purchases this month (yet)
- You ate out less
- Entertainment was lower

**Last month you asked about:** Dining spending
- You spent $298 last month
- This month: $234 (on track!)

Want me to dive deeper into any category?`,
			},
		],
	});

	examples.push({
		id: "followup_002",
		category: "spending_analysis",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "Break that down more",
			},
			{
				role: "assistant",
				content: `**Detailed Breakdown:**

**Groceries ($456):**
- Whole Foods: $234 (8 trips, avg $29)
- Trader Joe's: $134 (5 trips, avg $27)
- Costco: $88 (1 trip)

**By Week:**
- Week 1: $123 (big Costco run)
- Week 2: $98
- Week 3: $134 (Whole Foods splurge)
- Week 4: $101

**What you bought most:**
- Produce: ~30%
- Meat/protein: ~25%
- Dairy: ~15%
- Snacks: ~12%
- Beverages: ~10%
- Other: ~8%

**Price per meal (estimated):**
- Groceries support ~60 meals
- Cost per meal: ~$7.60
- Compare to dining out: $19/meal

**Interesting finds:**
- You buy almond milk every week ($6.99)
- Whole Foods organic premium adds ~$40/month vs regular

Want even more detail on a specific store or category?`,
			},
		],
	});

	examples.push({
		id: "followup_003",
		category: "transaction_search",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "Explain the biggest one",
			},
			{
				role: "assistant",
				content: `**Your Largest Transaction:**

**Costco - $234.56** (${randomDate(8)})

**Details:**
- Store: Costco Wholesale #1234
- Account: Amex Platinum
- Category: Groceries
- Time: 11:34 AM (Saturday morning run)

**Why it's high:**
This is your typical Costco trip pattern:
- You visit 2-3x per month
- Average: $180-200
- This one was slightly higher

**Based on timing, likely purchases:**
- Bulk proteins/meat
- Paper goods
- Snacks/beverages
- Maybe seasonal items

**Comparison:**
- This trip: $234.56
- Your Costco average: $192.46
- This trip: +22% above average

**Cost-effectiveness:**
Even at $234, Costco trips save you ~15-20% vs buying same items at regular stores.

**Is this concerning?**
Not really - it's within your grocery budget and you shop there monthly. Just a slightly bigger haul.

Want me to track Costco spending separately?`,
			},
		],
	});

	examples.push({
		id: "followup_004",
		category: "general_chat",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "Yes please",
			},
			{
				role: "assistant",
				content: `Done! I've set that up for you.

**What I created:**
- Tracking tag: "Costco Runs"
- Auto-tagged: 8 past Costco transactions
- Alerts: I'll notify you if a trip exceeds $250

**Your Costco Stats (now tracked):**
- This month: $234.56 (1 trip)
- Last month: $189.45 (1 trip)
- Monthly average: $192.46
- Annual total: $2,309.52

**Coming up:**
Based on your pattern, your next Costco run is likely in ~2 weeks.

**Also added:**
- Costco membership renewal reminder (renews in March)
- Membership: $60/year Executive
- You earn ~2% back = ~$46/year in rewards

Anything else you'd like me to track this way?`,
			},
		],
	});

	examples.push({
		id: "followup_005",
		category: "spending_analysis",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "And the year before?",
			},
			{
				role: "assistant",
				content: `**Two Years Ago Comparison:**

| Metric | 2 Years Ago | Last Year | This Year |
|--------|-------------|-----------|-----------|
| Total Spending | $38,456 | $41,234 | $43,567* |
| Monthly Avg | $3,205 | $3,436 | $3,630 |
| Savings Rate | 12% | 15% | 17% |
| Net Worth | $45,234 | $61,456 | $77,079 |

*projected based on current pace

**Year-over-Year Growth:**
- Spending: +6.1% per year (mostly inflation)
- Income: +8% per year (raises! 🎉)
- Savings: +40% per year (great improvement!)

**Category Changes:**

| Category | 2 Yrs Ago | Now | Change |
|----------|-----------|-----|--------|
| Housing | $1,400 | $1,500 | +7% |
| Groceries | $450 | $567 | +26% |
| Dining | $180 | $345 | +92% 😬 |
| Subscriptions | $65 | $125 | +92% |

**Big Picture:**
Your income grew faster than expenses, so despite spending more, you're saving more. That's the right direction!

The dining increase is notable though - that's doubled in 2 years.`,
			},
		],
	});

	return examples;
}

/**
 * Generate correction and feedback examples
 */
function generateCorrectionExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	examples.push({
		id: "correction_001",
		category: "category_suggestion",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "That Target transaction was actually groceries, not shopping",
			},
			{
				role: "assistant",
				content: `Got it! I've updated the transaction:

**Updated:**
- Transaction: Target - $89.99
- Date: ${randomDate(5)}
- Old category: Shopping
- New category: **Groceries**

**Impact:**
- Shopping budget: $345 → $255 (back under budget! ✅)
- Groceries budget: $456 → $546 (still under $600 ✅)

**Learning for future:**
I'll remember that your Target purchases are often groceries. Want me to:

1. **Ask each time** - I'll prompt you when Target appears
2. **Default to Groceries** - Assume groceries unless you correct
3. **Split automatically** - Assume 60% groceries, 40% shopping

Which would you prefer for Target purchases?`,
			},
		],
	});

	examples.push({
		id: "correction_002",
		category: "transaction_search",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "I returned that Amazon item",
			},
			{
				role: "assistant",
				content: `I'll help you track that return:

**Original Purchase Found:**
- Amazon - $67.89
- Date: ${randomDate(10)}
- Category: Shopping

**Return Options:**

1. **Already refunded?**
   - I'll look for a matching credit
   - Found: Amazon refund +$67.89 on ${randomDate(3)}?
   - If yes, I'll link them

2. **Pending return?**
   - I'll watch for the refund
   - Alert you when it posts

3. **Exclude from spending?**
   - I can mark original as "Returned"
   - Won't count toward monthly spending

**Did the refund already hit your account?**

If you see the refund:
- Your shopping spending drops: $156 → $88
- Better reflects actual spending

Let me know which applies!`,
			},
		],
	});

	examples.push({
		id: "correction_003",
		category: "transaction_search",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "That's a duplicate, please remove it",
			},
			{
				role: "assistant",
				content: `I'll help remove the duplicate.

**Which transaction is the duplicate?**

I found these similar recent transactions:

1. **Netflix - $15.99** (${randomDate(3)})
   - Account: Chase Checking

2. **Netflix - $15.99** (${randomDate(3)})
   - Account: Amex Platinum

If these are the same charge appearing twice:

**To remove:**
- Tell me which one to keep (1 or 2)
- I'll mark the other as duplicate
- It won't count in spending totals

**Note:** If this is two different accounts being charged, that might be a billing error with Netflix - not a duplicate in the app.

**Which one should I remove?**

(Or describe a different transaction if I found the wrong ones)`,
			},
		],
	});

	examples.push({
		id: "correction_004",
		category: "category_suggestion",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "That wasn't dining, it was a birthday gift",
			},
			{
				role: "assistant",
				content: `Updated! Here's what I changed:

**Transaction Updated:**
- Restaurant name - $67.89
- Old category: Dining Out
- New category: **Gifts**
- Note: Added "Birthday gift"

**Budget Impact:**
- Dining budget: $234 → $166 (more room!)
- Gifts category: $45 → $113

**Smart Move!**
Treating someone to dinner as a gift is thoughtful. For tracking purposes, categorizing as "Gifts" is better because:
- It's not your personal dining expense
- Helps you track gift-giving budget
- More accurate spending picture

**Optional:**
Want me to add who this gift was for? I can help you track birthday spending per person.

**Future:** When I see restaurant charges on/near a contact's birthday (if you add them), I can ask if it's a gift!`,
			},
		],
	});

	examples.push({
		id: "correction_005",
		category: "account_balance",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "The balance is wrong, my bank shows $3,500",
			},
			{
				role: "assistant",
				content: `Let me help figure out the discrepancy:

**What I show:** $3,245.67
**Your bank shows:** $3,500.00
**Difference:** $254.33

**Possible Reasons:**

1. **Pending transactions** (most common)
   - I show cleared transactions
   - Bank might include pending
   - Check for holds that haven't posted

2. **Recent deposit not synced**
   - When did you last sync? ${randomDate(1)}
   - Any deposits since then?

3. **Missing transaction**
   - A refund or credit I don't have
   - Manual adjustment needed

**To reconcile:**

| Checking | Amount |
|----------|--------|
| Bank balance | $3,500.00 |
| Pending debits | -$? |
| = Should match | $3,245.67 |

**Can you check:**
1. Any pending transactions at the bank?
2. Recent deposits in the last day or two?

If you want, I can manually adjust the balance to match and we can reconcile the difference when transactions clear.`,
			},
		],
	});

	return examples;
}

/**
 * Generate report generation examples
 */
function generateReportExamples(): TrainingExample[] {
	const examples: TrainingExample[] = [];

	examples.push({
		id: "report_001",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "Create a spending report for my taxes",
			},
			{
				role: "assistant",
				content: `**Tax-Related Expenses Report - 2024**

**Potentially Deductible Expenses:**

**1. Charitable Donations: $567.00**
| Date | Organization | Amount | Receipt? |
|------|--------------|--------|----------|
| Mar 15 | Red Cross | $100 | ✅ |
| Jun 22 | Local Food Bank | $150 | ✅ |
| Sep 10 | Goodwill (items) | $200* | Photo |
| Dec 5 | Salvation Army | $117 | ✅ |

*Estimated value - keep itemized list

**2. Medical Expenses: $1,234.56**
(Deductible if >7.5% of income)
| Type | Amount |
|------|--------|
| Doctor visits | $456.78 |
| Prescriptions | $234.56 |
| Dental | $345.67 |
| Vision | $197.55 |

**3. Work-Related (if applicable):**
- Home office supplies: $189.00
- Professional subscriptions: $149.00

**Summary:**
- Total charitable: $567
- Total medical: $1,235
- Total work-related: $338
- **Potential deductions: $2,140**

**Note:** Standard deduction is $14,600. You'd need significant additional deductions to itemize.

*Export this as PDF?*`,
			},
		],
	});

	examples.push({
		id: "report_002",
		category: "general_chat",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "Summarize my finances for my partner",
			},
			{
				role: "assistant",
				content: `**Financial Summary - Shareable Version**

---

**Our Financial Snapshot**

💰 **Net Worth: $77,079**
- Cash/Savings: $20,746
- Investments: $58,025
- Debt: -$1,692 (credit cards, paid monthly)

📊 **Monthly Cash Flow**
- Income: $7,000
- Expenses: ~$3,500
- Savings: ~$1,200 (17%)
- Surplus: ~$2,300

📈 **We're on track for:**
- Emergency fund (3.5 months saved, goal: 6 months)
- Retirement (17% savings rate)
- No high-interest debt

⚠️ **Areas to discuss:**
- Dining out is over budget ($345 vs $250)
- Subscriptions crept up to $125/month
- Should we increase savings goal?

📅 **Upcoming:**
- Credit card due: 15th ($1,234)
- Car insurance: Next month ($189)
- Holiday budget to set

---

**Questions we should discuss:**
1. Holiday gift budget - what's comfortable?
2. Vacation planning for next year?
3. Any big purchases coming up?

*Want me to adjust what's included?*`,
			},
		],
	});

	examples.push({
		id: "report_003",
		category: "spending_analysis",
		source: "synthetic",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "Monthly report",
			},
			{
				role: "assistant",
				content: `**Monthly Financial Report - ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}**

---

**INCOME**
| Source | Amount |
|--------|--------|
| Salary | $7,000 |
| **Total** | **$7,000** |

---

**SPENDING: $3,456.78**

| Category | Amount | Budget | Status |
|----------|--------|--------|--------|
| Housing | $1,500 | $1,500 | ✅ |
| Groceries | $567 | $600 | ✅ |
| Dining | $345 | $250 | ⚠️ +38% |
| Transportation | $289 | $250 | ⚠️ +16% |
| Utilities | $199 | $200 | ✅ |
| Shopping | $234 | $300 | ✅ |
| Entertainment | $178 | $150 | ⚠️ +19% |
| Subscriptions | $125 | $100 | ⚠️ +25% |
| Other | $20 | - | - |

---

**SAVINGS**
| Type | Amount |
|------|--------|
| To Savings | $500 |
| 401k | $700 |
| **Total** | **$1,200** (17%) |

---

**NET RESULT**
- Income: $7,000
- Spending: $3,457
- Savings: $1,200
- **Surplus: $2,343**

---

**HIGHLIGHTS**
✅ Net worth grew $2,345 (+3.1%)
⚠️ Dining over budget 3 months in a row
💡 Could save $200 more with subscription audit

*Export as PDF?*`,
			},
		],
	});

	examples.push({
		id: "report_004",
		category: "spending_analysis",
		source: "synthetic",
		quality: 4,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{
				role: "user",
				content: "Create a report of my business expenses",
			},
			{
				role: "assistant",
				content: `**Business Expense Report**

**Period:** This Year to Date

⚠️ **Note:** I'm pulling transactions that appear business-related. Please verify each item for tax purposes.

**Category: Office Supplies**
| Date | Vendor | Amount | Description |
|------|--------|--------|-------------|
| Jan 15 | Amazon | $45.67 | Office supplies |
| Mar 22 | Staples | $34.56 | Printer ink |
| Jun 10 | Amazon | $89.99 | Monitor stand |
| **Total** | | **$170.22** | |

**Category: Software/Subscriptions**
| Date | Vendor | Amount | Description |
|------|--------|--------|-------------|
| Monthly | Adobe | $54.99/mo | Creative Cloud |
| Monthly | Zoom | $14.99/mo | Video calls |
| Monthly | Slack | $12.50/mo | Team chat |
| **Annual** | | **$989.76** | |

**Category: Professional Development**
| Date | Vendor | Amount | Description |
|------|--------|--------|-------------|
| Feb 5 | Udemy | $89.99 | Course |
| May 15 | Conference | $299.00 | Registration |
| **Total** | | **$388.99** | |

**Category: Meals & Entertainment**
| Date | Vendor | Amount | Description |
|------|--------|--------|-------------|
| Various | Restaurants | $234.56 | Client meals |
| **Total** | | **$234.56** | |

---

**BUSINESS EXPENSE SUMMARY**
| Category | Total |
|----------|-------|
| Office Supplies | $170.22 |
| Software | $989.76 |
| Prof. Development | $388.99 |
| Meals (50% deductible) | $117.28 |
| **Grand Total** | **$1,666.25** |

*Consult your accountant for actual deductibility.*`,
			},
		],
	});

	return examples;
}

/**
 * Generate a complete training dataset
 */
export function generateTrainingDataset(options: {
	includeToolCalls?: boolean;
	minQuality?: number;
}): TrainingDataset {
	const { includeToolCalls = true, minQuality = 3 } = options;

	let allExamples: TrainingExample[] = [
		// Core categories
		...generateAccountBalanceExamples(),
		...generateSpendingAnalysisExamples(),
		...generateBudgetManagementExamples(),
		...generateTransactionSearchExamples(),
		...generatePayeeManagementExamples(),
		...generateCategorySuggestionExamples(),
		...generateFinancialAdviceExamples(),
		...generateForecastingExamples(),
		// Extended categories
		...generateRecurringTransactionExamples(),
		...generateSavingsGoalExamples(),
		...generateTransferExamples(),
		...generateEdgeCaseExamples(),
		...generateGeneralChatExamples(),
		// Advanced use cases
		...generateCalculationExamples(),
		...generateRewardsExamples(),
		...generateSeasonalExamples(),
		...generateGoalTrackingExamples(),
		...generatePatternExamples(),
		// Natural language variations
		...generateCasualLanguageExamples(),
		...generateProjectExamples(),
		...generateFollowUpExamples(),
		...generateCorrectionExamples(),
		...generateReportExamples(),
	];

	// Filter by quality
	allExamples = allExamples.filter((e) => (e.quality || 3) >= minQuality);

	// Optionally remove tool calls
	if (!includeToolCalls) {
		allExamples = allExamples.map((e) => ({
			...e,
			toolCalls: undefined,
			toolResults: undefined,
		}));
	}

	// Calculate category distribution
	const categories = allExamples.reduce(
		(acc, e) => {
			acc[e.category] = (acc[e.category] || 0) + 1;
			return acc;
		},
		{} as Record<TrainingCategory, number>
	);

	return {
		version: "1.0.0",
		createdAt: nowISOString(),
		count: allExamples.length,
		categories,
		baseModel: "qwen2.5:7b",
		examples: allExamples,
	};
}

/**
 * Export dataset to JSONL format (one JSON object per line)
 */
export function exportToJSONL(dataset: TrainingDataset): string {
	return dataset.examples
		.map((example) => {
			return JSON.stringify({
				messages: example.messages.map((m) => ({
					role: m.role,
					content: m.content,
				})),
			});
		})
		.join("\n");
}

/**
 * Export dataset to Alpaca format
 */
export function exportToAlpaca(dataset: TrainingDataset): string {
	const alpacaExamples = dataset.examples.map((example) => {
		const systemMsg = example.messages.find((m) => m.role === "system");
		const userMsg = example.messages.find((m) => m.role === "user");
		const assistantMsg = example.messages.find((m) => m.role === "assistant");

		return {
			instruction: systemMsg?.content || BUDGET_ASSISTANT_SYSTEM_PROMPT,
			input: userMsg?.content || "",
			output: assistantMsg?.content || "",
		};
	});

	return JSON.stringify(alpacaExamples, null, 2);
}

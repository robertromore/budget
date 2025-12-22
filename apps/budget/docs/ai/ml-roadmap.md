# ML Features Roadmap

## Current State

The ML system currently includes:
- **Forecasting** - Time series predictions using exponential smoothing, Holt-Winters, and ensemble methods
- **Anomaly Detection** - Transaction scoring for unusual patterns
- **Similarity Matching** - Payee matching and canonicalization
- **User Behavior Tracking** - Learning from user corrections

## Planned Features

### High-Impact Quick Wins

#### 1. Recurring Transaction Detection
**Status:** Implemented
**Effort:** Medium | **Impact:** High

Automatically identify subscriptions, bills, and paychecks by detecting temporal patterns.

Examples:
- Netflix every month on the 15th
- Rent on the 1st
- Paycheck every other Friday

Use cases:
- Auto-create scheduled transactions
- Alert when expected recurring transaction is missing
- Identify subscription creep

**Implementation:**

- Service: `src/lib/server/domains/ml/recurring-detection/service.ts`
- Routes: `src/lib/server/domains/ml/recurring-detection/routes.ts`
- API endpoints:
  - `recurringDetectionRoutes.detectPatterns` - Detect all recurring patterns
  - `recurringDetectionRoutes.detectForPayee` - Detect patterns for specific payee
  - `recurringDetectionRoutes.analyzePattern` - Detailed pattern analysis
  - `recurringDetectionRoutes.suggestSchedule` - Get schedule suggestion for pattern
  - `recurringDetectionRoutes.getSummary` - Summary of all patterns
  - `recurringDetectionRoutes.checkMissing` - Find expected but missing transactions

#### 2. Merchant Name Normalization
**Status:** Implemented
**Effort:** Low | **Impact:** Medium

Clean up messy transaction descriptions using the existing similarity/canonicalizer.

Examples:
- `AMZN MKTP US*2X9ABC` → `Amazon`
- `SQ *COFFEE SHOP NYC` → `Coffee Shop`
- `PAYPAL *SPOTIFY` → `Spotify`

**Implementation:**

- Enhanced: `src/lib/server/domains/ml/similarity/text-similarity.ts`
  - Added 150+ merchant abbreviations and mappings
  - Added 20+ payment processor prefix patterns (PayPal, Venmo, Square, etc.)
  - Added city/state/location pattern removal
  - New `normalizeMerchantName()` function with proper title casing
- Routes: `src/lib/server/domains/ml/similarity/routes.ts`
  - `similarityRoutes.normalizeMerchant` - Normalize single merchant name
  - `similarityRoutes.batchNormalizeMerchants` - Batch normalization (up to 500)
  - `similarityRoutes.previewNormalization` - Preview what would change

#### 3. Smart Category Suggestions
**Status:** Implemented
**Effort:** Low | **Impact:** Medium

Enhance category suggestions based on:
- Payee history (already done)
- Amount patterns (large deposits → Income, small recurring → Subscriptions)
- Time of day/week patterns
- Historical transaction patterns

**Implementation:**

- Service: `src/lib/server/domains/ml/smart-categories/service.ts`
- Routes: `src/lib/server/domains/ml/smart-categories/routes.ts`
- API endpoints:
  - `smartCategoryRoutes.suggest` - Get smart category suggestions for a transaction
  - `smartCategoryRoutes.suggestTop` - Get the top category suggestion
  - `smartCategoryRoutes.analyzeType` - Analyze transaction type (income/expense/transfer)
  - `smartCategoryRoutes.detectSubscription` - Detect if transaction is a subscription
  - `smartCategoryRoutes.getTimeHints` - Get time-based category hints
  - `smartCategoryRoutes.batchSuggest` - Batch suggest categories (up to 100)
  - `smartCategoryRoutes.recordSelection` - Record user selection for learning

Features:

- **Amount-based patterns**: Large deposits → Income categories, small recurring → Subscriptions
- **Time-based patterns**: Weekend spending patterns, beginning/mid/end of month patterns
- **Historical patterns**: Similar amount transactions grouped by category
- **Payee matching**: Integration with existing similarity service
- **Confidence scoring**: Weighted combination of all factors with explanation

### Medium-Effort Features

#### 4. Budget Overspend Prediction
**Status:** Implemented
**Effort:** Low | **Impact:** High

Use forecasting to predict budget overruns before month-end.

Example alert:
> "At current pace, you'll exceed your Dining budget by ~$120 by month end"

**Implementation:**

- Service: `src/lib/server/domains/ml/budget-prediction/service.ts`
- Routes: `src/lib/server/domains/ml/budget-prediction/routes.ts`
- API endpoints:
  - `budgetPredictionRoutes.predict` - Predict overspend for a specific budget
  - `budgetPredictionRoutes.predictAll` - Get predictions for all budgets in workspace
  - `budgetPredictionRoutes.atRisk` - Get budgets at risk (filterable by min risk level)
  - `budgetPredictionRoutes.dailyLimit` - Get daily spending limit recommendation
  - `budgetPredictionRoutes.categoryBreakdown` - Per-category overspend predictions
  - `budgetPredictionRoutes.healthSummary` - Dashboard-ready budget health summary

Features:

- **Current spending rate analysis**: Calculates daily spending velocity and projects to period end
- **Upcoming recurring transactions**: Estimates expected recurring expenses based on historical patterns
- **Historical pattern analysis**: Uses past period data to inform predictions
- **End-of-month spending patterns**: Accounts for typical end-of-month spending increases
- **Risk level classification**: none, low, medium, high, critical based on configurable thresholds
- **Recommendation generation**: Actionable advice based on prediction (e.g., "Reduce daily spending by 15%")
- **Weighted ensemble prediction**: Combines current rate, recurring, and historical factors
- **Category-level breakdown**: Per-category analysis within a budget

#### 5. Income vs Expense Breakdown
**Status:** Implemented
**Effort:** Low | **Impact:** Medium

The forecast already calculates `incomePredictions` and `expensePredictions` separately. This module enhances them with:
- Separate forecast cards for income and expenses
- Visual comparison chart data
- Trend indicators for each

**Implementation:**

- Service: `src/lib/server/domains/ml/income-expense/service.ts`
- Routes: `src/lib/server/domains/ml/income-expense/routes.ts`
- API endpoints:
  - `incomeExpenseRoutes.breakdown` - Comprehensive income/expense breakdown with history, trends, forecasts
  - `incomeExpenseRoutes.incomeTrend` - Income trend indicator (increasing/decreasing/stable)
  - `incomeExpenseRoutes.expenseTrend` - Expense trend indicator
  - `incomeExpenseRoutes.compare` - Period-over-period comparison (month/quarter/year)
  - `incomeExpenseRoutes.history` - Historical income/expense data
  - `incomeExpenseRoutes.summary` - Quick dashboard summary
  - `incomeExpenseRoutes.trends` - Combined trend indicators

Features:

- **Trend indicators**: Linear regression-based trend detection with confidence scoring
- **Period comparisons**: Month-over-month, quarter-over-quarter, year-over-year
- **Net savings tracking**: Current, projected, and forecasted savings with savings rate
- **Seasonality detection**: Identifies high-income and high-expense months
- **Income-to-expense ratio**: Track and forecast financial health
- **Current month projection**: Projects full month based on days elapsed

#### 6. Savings Opportunities Detection
**Status:** Implemented
**Effort:** Medium | **Impact:** High

Identify potential savings:
- Subscriptions with no related transactions (unused services)
- Price increases on recurring bills
- Duplicate subscriptions (multiple streaming services, etc.)
- Merchants where spending increased significantly

**Implementation:**

- Service: `src/lib/server/domains/ml/savings-opportunities/service.ts`
- Routes: `src/lib/server/domains/ml/savings-opportunities/routes.ts`
- API endpoints:
  - `savingsOpportunityRoutes.getAll` - Get all savings opportunities
  - `savingsOpportunityRoutes.byType` - Filter by opportunity type
  - `savingsOpportunityRoutes.unusedSubscriptions` - Detect unused subscriptions
  - `savingsOpportunityRoutes.priceIncreases` - Detect price increases on bills
  - `savingsOpportunityRoutes.duplicates` - Detect duplicate services
  - `savingsOpportunityRoutes.spendingIncreases` - Detect spending increases
  - `savingsOpportunityRoutes.summary` - Dashboard summary
  - `savingsOpportunityRoutes.highPriority` - High-priority opportunities only

Features:

- **Unused subscription detection**: Flags subscriptions with no recent activity (configurable threshold)
- **Price increase detection**: Detects bills that increased beyond threshold (default 10%)
- **Duplicate service detection**: Identifies multiple streaming, storage, or fitness services
- **Spending increase detection**: Finds merchants where spending increased significantly
- **Priority scoring**: Low/medium/high based on potential monthly savings
- **Actionable suggestions**: Specific actions for each opportunity type
- **Monthly/annual savings estimates**: Calculates potential savings for each opportunity
- **Known service matching**: Pre-defined lists for streaming, cloud storage, fitness services

### Larger Features

#### 7. Natural Language Transaction Search
**Status:** Implemented
**Effort:** Medium | **Impact:** High

Search transactions using natural language queries:
- "Show me all Amazon purchases over $50"
- "What did I spend on coffee last month?"
- "Grocery expenses in December"
- "Large transactions over $500 this year"

**Implementation:**

- Service: `src/lib/server/domains/ml/nl-search/service.ts`
- Routes: `src/lib/server/domains/ml/nl-search/routes.ts`
- API endpoints:
  - `nlSearchRoutes.search` - Search transactions using natural language
  - `nlSearchRoutes.parse` - Parse a query without executing it (for preview)
  - `nlSearchRoutes.suggestions` - Get search suggestions based on partial query
  - `nlSearchRoutes.examples` - Get example queries to help users

Features:

- **Date parsing**: Relative dates ("last month", "this year"), specific months ("in December"), past N days/weeks/months
- **Amount filtering**: Over/under/between amounts, size descriptors ("large", "small")
- **Transaction type**: Income vs expense detection based on keywords
- **Payee/Category matching**: Searches payee and category names with fuzzy matching
- **Free text search**: Remaining terms searched in transaction notes
- **Sorting**: Largest/smallest, most recent/oldest
- **Limit**: Top N results

Frontend Component:

- `NLSearchCard` component with search input, examples, and results display
- Integrated into the Intelligence dashboard

#### 8. Smart Savings Recommendations
Based on spending patterns, suggest:
- Optimal savings amount per month
- Categories where spending could be reduced
- Best day to pay bills based on cash flow

#### 9. Bill Negotiation Suggestions
Identify bills that:
- Have increased in price
- Are higher than typical rates
- Could potentially be negotiated or switched

## Implementation Priority

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 1 | Recurring Transaction Detection | Medium | High |
| 2 | Budget Overspend Prediction | Low | High |
| 3 | Savings Opportunities | Medium | High |
| 4 | Merchant Name Normalization | Low | Medium |
| 5 | Income/Expense Breakdown | Low | Medium |
| 6 | Smart Category Suggestions | Low | Medium |

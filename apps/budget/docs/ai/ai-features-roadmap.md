# AI Features Roadmap for Budget App

## Current State

Your application already has sophisticated ML/intelligence systems:

- **PayeeIntelligenceService** - Spending pattern analysis, anomaly detection, predictions
- **CategoryLearningService** - Learns from user corrections, category drift detection
- **MLCoordinator** - Orchestrates multiple ML systems, generates insights
- **Import Matchers** - Fuzzy payee matching, keyword-based category detection

**What LLM adds:** Natural language understanding, explanations, and semantic reasoning that complements your existing statistical analysis.

---

## Feature Priority Matrix

| Priority | Feature | Value | Effort | ROI |
|----------|---------|-------|--------|-----|
| P0 | Transaction Description Parsing | High | Medium | Very High |
| P0 | Payee Name Normalization | High | Low | Very High |
| P1 | Smart Category Suggestions | High | Medium | High |
| P1 | Anomaly Explanations | Medium | Low | High |
| P2 | Budget Recommendations | Medium | Medium | Medium |
| P2 | Financial Narrative Generation | Medium | Medium | Medium |
| P3 | Receipt/Statement Parsing | Medium | High | Medium |
| P3 | Smart Schedule Detection | Low | Medium | Low |

---

## P0 Features (Immediate Value)

### 1. Transaction Description Parsing

**Problem:** Bank transaction descriptions are cryptic and inconsistent.
```
"SQ *COFFEE ROASTER CH" → ???
"AMZN MKTP US*2K8X7Y9Z0" → ???
"GOOGLE *YOUTUBE TV" → ???
```

**LLM Solution:**
```typescript
interface ParsedTransaction {
  merchantName: string        // "Coffee Roaster"
  merchantCategory: string    // "coffee_shop"
  transactionType: string     // "purchase" | "refund" | "subscription"
  isRecurring: boolean        // true for subscriptions
  confidence: number          // 0.0-1.0
}

// Example transformation
{
  raw: "SQ *COFFEE ROASTER CH",
  parsed: {
    merchantName: "Coffee Roaster",
    merchantCategory: "dining",
    transactionType: "purchase",
    isRecurring: false,
    confidence: 0.92
  }
}
```

**Integration Point:** `src/lib/server/import/matchers/payee-matcher.ts`

**Implementation:**
```typescript
// New file: src/lib/server/ai/transaction-parser.ts
import { generateObject } from 'ai';
import { openai } from './provider';
import { z } from 'zod';

const ParsedTransactionSchema = z.object({
  merchantName: z.string(),
  merchantCategory: z.string(),
  transactionType: z.enum(['purchase', 'refund', 'subscription']),
  isRecurring: z.boolean(),
  confidence: z.number().min(0).max(1)
});

export async function parseDescription(description: string): Promise<ParsedTransaction> {
  const { object } = await generateObject({
    model: openai('gpt-3.5-turbo'),
    schema: ParsedTransactionSchema,
    system: TRANSACTION_PARSER_PROMPT,
    prompt: description
  });
  return object;
}

export async function batchParse(descriptions: string[]): Promise<ParsedTransaction[]> {
  // Batch for efficiency during imports
  return Promise.all(descriptions.map(parseDescription));
}
```

---

### 2. Payee Name Normalization

**Problem:** Same merchant appears with different names across transactions.

**Current Data:**
```
"WALMART SUPERCENTER #1234"
"WAL-MART.COM"
"WALMART GROCERY"
"WM SUPERCENTER"
```

**LLM Solution:**
```typescript
interface NormalizedPayee {
  canonicalName: string       // "Walmart"
  displayName: string         // "Walmart Supercenter"
  merchantType: PayeeType     // "merchant"
  suggestedCategory: string   // "shopping"
  aliases: string[]           // ["WAL-MART", "WM SUPERCENTER"]
  metadata: {
    isChain: boolean
    storeNumber?: string
    location?: string
  }
}
```

**Integration Point:** `src/lib/server/domains/payees/services.ts`

**Use Cases:**
- During import: Normalize incoming transaction payee names
- Payee merge suggestions: "These 3 payees appear to be the same merchant"
- Auto-linking: Connect new variations to existing payees

---

## P1 Features (High Value)

### 3. Smart Category Suggestions

**Current:** Keyword matching with 60+ hardcoded patterns
**Enhanced:** Semantic understanding of transaction context

**Examples Where LLM Helps:**
```
"SHELL OIL 57442"
  → Current: "Transportation" (keyword: "SHELL")
  → LLM: "Gas Station" (understands it's fuel, not oil change)

"APPLE.COM/BILL"
  → Current: "Shopping" (keyword: "APPLE")
  → LLM: "Subscriptions" (recognizes recurring Apple service)

"WHOLEFDS MKT #123"
  → Current: No match
  → LLM: "Groceries" (understands "Whole Foods Market")
```

**Integration Point:** `src/lib/server/import/matchers/category-matcher.ts`

**Architecture:**
```typescript
export class SmartCategoryService {
  constructor(
    private llm: LLMService,
    private categoryLearning: CategoryLearningService,
    private existingMatcher: CategoryMatcher
  ) {}

  async suggestCategory(transaction: Transaction): Promise<CategorySuggestion> {
    // 1. Try existing rule-based matcher first (fast, free)
    const ruleMatch = this.existingMatcher.match(transaction)
    if (ruleMatch.confidence > 0.9) return ruleMatch

    // 2. Check user's historical patterns
    const userPattern = await this.categoryLearning.getSuggestion(transaction)
    if (userPattern.confidence > 0.85) return userPattern

    // 3. Fall back to LLM for uncertain cases
    return this.llm.suggestCategory(transaction)
  }
}
```

---

### 4. Anomaly Explanations

**Current:** Statistical detection only (outliers, unusual amounts)
**Enhanced:** Natural language explanations

**Example:**
```typescript
interface AnomalyExplanation {
  anomaly: DetectedAnomaly        // From existing PayeeIntelligenceService
  explanation: string             // LLM-generated
  possibleReasons: string[]       // ["Holiday shopping", "Bulk purchase", "Price increase"]
  suggestedAction: string         // "Review this transaction" | "Update budget" | "Ignore"
  confidence: number
}

// Example output
{
  anomaly: { type: "high_amount", amount: 450, average: 85 },
  explanation: "This Amazon purchase of $450 is 5x your typical Amazon spending. This could be a large household purchase or gift.",
  possibleReasons: [
    "Holiday/birthday gift purchase",
    "Bulk household items",
    "Electronics or appliance"
  ],
  suggestedAction: "Consider splitting into a separate category if this is a one-time purchase"
}
```

**Integration Point:** `src/lib/server/domains/payees/intelligence.ts`

---

## P2 Features (Medium Value)

### 5. Budget Recommendations with Narratives

**Current:** Pattern-based allocation suggestions
**Enhanced:** Personalized recommendations with explanations

**Example Output:**
```typescript
interface BudgetRecommendation {
  category: string
  currentBudget: number
  recommendedBudget: number
  narrative: string
  reasoning: string[]
  seasonalNote?: string
}

// Example
{
  category: "Dining Out",
  currentBudget: 300,
  recommendedBudget: 250,
  narrative: "Your dining spending has decreased 20% over the past 3 months. Consider reducing your budget to match your actual spending patterns.",
  reasoning: [
    "Average spending last 3 months: $235",
    "No upcoming events detected",
    "Similar pattern last year during this season"
  ],
  seasonalNote: "Holiday season typically increases dining by 15% - budget may need adjustment in December"
}
```

---

### 6. Financial Narrative Generation

**Use Cases:**
- Monthly spending summaries
- Year-in-review reports
- Trend explanations
- Goal progress updates

**Example:**
```typescript
interface MonthlyNarrative {
  summary: string
  highlights: string[]
  concerns: string[]
  achievements: string[]
  suggestions: string[]
}

// Example output
{
  summary: "November was a mixed month financially. While you stayed under budget overall, entertainment spending spiked due to holiday activities.",
  highlights: [
    "Grocery spending down 12% from October",
    "Successfully avoided impulse purchases on Black Friday",
    "Emergency fund contribution maintained"
  ],
  concerns: [
    "Entertainment budget exceeded by $85 (28%)",
    "Two subscription services show price increases"
  ],
  achievements: [
    "3-month streak of staying under total budget"
  ],
  suggestions: [
    "Review streaming subscriptions - you may have overlapping services",
    "Consider meal prepping to maintain grocery savings"
  ]
}
```

---

## P3 Features (Future Value)

### 7. Receipt/Statement Parsing

**Input:** Uploaded receipt images or PDFs
**Output:** Structured transaction data

```typescript
interface ParsedReceipt {
  merchant: string
  date: Date
  total: number
  tax: number
  lineItems: Array<{
    description: string
    quantity: number
    price: number
    category?: string
  }>
  paymentMethod?: string
}
```

**Use Cases:**
- Itemized expense tracking
- Tax deduction identification
- Split transaction support

---

### 8. Smart Schedule Detection

**Current:** Frequency-based detection (weekly, monthly patterns)
**Enhanced:** Semantic subscription detection

```typescript
// LLM can identify subscriptions from transaction descriptions
"NETFLIX.COM" → { isSubscription: true, frequency: "monthly", category: "streaming" }
"SPOTIFY USA" → { isSubscription: true, frequency: "monthly", category: "streaming" }
"APPLE.COM/BILL" → { isSubscription: true, frequency: "monthly", category: "services" }

// And detect canceled subscriptions
"No NETFLIX transactions in 45 days - subscription may be canceled"
```

---

## Implementation Architecture

### Service Layer Structure

```
src/lib/server/ai/
├── provider.ts                 # Vercel AI SDK provider setup
├── prompts/
│   ├── transaction-parser.ts   # System prompts
│   ├── category-suggester.ts
│   ├── anomaly-explainer.ts
│   └── narrative-generator.ts
├── transaction-parser.ts       # Transaction parsing service
├── category-suggester.ts       # Smart category suggestions
├── anomaly-explainer.ts        # Anomaly explanations
└── narrative-generator.ts      # Financial narratives
```

### Integration with Existing Services

```typescript
// MLCoordinator already orchestrates multiple services
// Add LLM as another input source

export class MLCoordinator {
  constructor(
    private intelligence: PayeeIntelligenceService,
    private learning: CategoryLearningService,
    private llm: LLMService  // NEW
  ) {}

  async getRecommendations(payee: Payee): Promise<UnifiedRecommendation> {
    const [
      statisticalInsights,
      learningInsights,
      llmInsights  // NEW
    ] = await Promise.all([
      this.intelligence.analyze(payee),
      this.learning.getSuggestions(payee),
      this.llm.getInsights(payee)  // NEW
    ])

    return this.mergeRecommendations(statisticalInsights, learningInsights, llmInsights)
  }
}
```

---

## Cost Optimization Strategies

### 1. Tiered Processing
```typescript
// Only use LLM when rule-based methods are uncertain
if (ruleBasedConfidence < 0.8) {
  return llm.process(input)
}
```

### 2. Batch Processing
```typescript
// During import, batch transactions for efficiency
const results = await llm.batchProcess(transactions, { maxBatchSize: 20 })
```

### 3. Caching
```typescript
// Cache LLM responses for common patterns
const cached = await cache.get(`payee:${normalizedName}`)
if (cached) return cached
```

### 4. Model Selection
```typescript
// Use cheaper models for simple tasks
const simpleTask = { model: "gpt-3.5-turbo" }  // ~$0.002/1K tokens
const complexTask = { model: "gpt-4" }          // ~$0.03/1K tokens
```

---

## Success Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| Transaction Parsing | Accuracy vs manual | >90% |
| Payee Normalization | Duplicate reduction | >50% |
| Category Suggestions | User acceptance rate | >80% |
| Anomaly Explanations | User satisfaction | >4/5 stars |
| Budget Recommendations | Budget adherence | +10% |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| API costs escalate | Implement usage limits, caching, tiered processing |
| LLM downtime | Graceful fallback to rule-based systems |
| Incorrect suggestions | Always show confidence, allow user override |
| Privacy concerns | Minimize data sent, offer local-only mode |
| Response latency | Background processing, optimistic UI |

---

## Recommended Implementation Order

### Sprint 1: Foundation
- [ ] Set up Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/svelte`)
- [ ] Create AI service layer structure (`src/lib/server/ai/`)
- [ ] Implement transaction description parser
- [ ] Add to import pipeline (behind feature flag)

### Sprint 2: Core Features
- [ ] Payee name normalization
- [ ] Enhanced category suggestions
- [ ] Integration with MLCoordinator

### Sprint 3: Explanations
- [ ] Anomaly explanation generation
- [ ] Budget recommendation narratives
- [ ] User feedback collection

### Sprint 4: Polish
- [ ] Monthly narrative generation
- [ ] Caching and optimization
- [ ] Cost monitoring dashboard

# Payee Enhancement Plan: Budgeting Integration

## Overview

This document outlines the enhancement of the payee entity to provide deeper integration with the budgeting and transaction systems. The goal is to create a more intelligent and automated budgeting experience by leveraging payee-specific patterns and preferences.

## Current System Analysis

### Existing Architecture

**Transaction System (✅ Fully Implemented)**
- Multi-budget transaction allocation via `budget_transactions` junction table
- Foreign key relationships: `transactions.payeeId` → `payees.id`
- Sophisticated validation with allocation amount matching transaction totals
- 30-day scheduled transaction forecasting with visual indicators

**Budget System (🔄 Partially Implemented)**
- Comprehensive database schema with envelope budgeting support
- Service layer with allocation validation and period management
- Template-based period system (weekly, monthly, quarterly, yearly, custom)
- Missing: UI components, tRPC routes, query layer integration

**Payee System (⚠️ Basic Implementation)**
- Simple entity: `id`, `name`, `notes`, timestamps, soft delete
- One-to-many relationship with transactions
- Minimal validation and business logic

### Integration Opportunities

**Current Data Flow**:
```
Transaction Creation → Manual payee selection → Manual category/budget assignment
```

**Enhanced Data Flow**:
```
Transaction Creation → Payee selection → Auto-populate category/budget → User review/override
```

## Enhancement Phases

### Phase 1: Core Budgeting Fields (High Priority)

#### 1.1 Database Schema Extensions

**New Payee Fields**:

```typescript
// src/lib/schema/payees.ts additions
export const payees = sqliteTable('payee', {
  // Existing fields...

  // Budgeting Integration
  defaultCategoryId: integer('default_category_id').references(() => categories.id),
  defaultBudgetId: integer('default_budget_id').references(() => budgets.id),
  payeeType: text('payee_type', {
    enum: ['merchant', 'utility', 'employer', 'financial_institution', 'government', 'individual']
  }),

  // Transaction Automation
  avgAmount: real('avg_amount'), // Calculated field, updated via triggers
  paymentFrequency: text('payment_frequency', {
    enum: ['weekly', 'bi_weekly', 'monthly', 'quarterly', 'annual', 'irregular']
  }),
  lastTransactionDate: text('last_transaction_date'), // ISO date string

  // Analytics Support
  taxRelevant: integer('tax_relevant', { mode: 'boolean' }).default(false),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
});
```

**Index Strategy**:
```sql
-- Performance indexes for common queries
CREATE INDEX idx_payees_default_category ON payee(default_category_id);
CREATE INDEX idx_payees_default_budget ON payee(default_budget_id);
CREATE INDEX idx_payees_type ON payee(payee_type);
CREATE INDEX idx_payees_active ON payee(is_active);
CREATE INDEX idx_payees_last_transaction ON payee(last_transaction_date);
```

#### 1.2 Service Layer Enhancements

**PayeeService Updates** (`src/lib/server/domains/payees/services.ts`):

```typescript
export interface CreatePayeeData {
  name: string;
  notes?: string;
  defaultCategoryId?: number;
  defaultBudgetId?: number;
  payeeType?: PayeeType;
  paymentFrequency?: PaymentFrequency;
  taxRelevant?: boolean;
}

export class PayeeService {
  // Auto-suggest payee defaults based on transaction history
  async suggestPayeeDefaults(payeeId: number): Promise<PayeeSuggestions> {
    const recentTransactions = await this.getRecentTransactions(payeeId, 10);

    return {
      suggestedCategory: this.getMostFrequentCategory(recentTransactions),
      suggestedBudget: this.getMostFrequentBudget(recentTransactions),
      avgAmount: this.calculateAverageAmount(recentTransactions),
      detectedFrequency: this.detectPaymentFrequency(recentTransactions),
    };
  }

  // Update calculated fields when transactions change
  async updateCalculatedFields(payeeId: number): Promise<void> {
    const stats = await this.repository.calculatePayeeStats(payeeId);
    await this.repository.updateCalculatedFields(payeeId, stats);
  }
}
```

#### 1.3 Transaction Integration

**Enhanced Transaction Creation** (`src/lib/server/domains/transactions/services.ts`):

```typescript
export interface CreateTransactionData {
  // Existing fields...
  payeeId?: number;

  // Auto-population flags
  usePayeeDefaults?: boolean; // Auto-fill from payee settings
  overrideCategory?: number;  // User override of payee default
  overrideBudget?: number;    // User override of payee default
}

export class TransactionService {
  async createTransaction(data: CreateTransactionData): Promise<Transaction> {
    let categoryId = data.categoryId;
    let budgetId = data.budgetId;

    // Auto-populate from payee defaults if requested
    if (data.usePayeeDefaults && data.payeeId) {
      const payee = await this.payeeService.findById(data.payeeId);
      if (payee) {
        categoryId = data.overrideCategory ?? payee.defaultCategoryId ?? categoryId;
        budgetId = data.overrideBudget ?? payee.defaultBudgetId ?? budgetId;
      }
    }

    const transaction = await this.repository.create({
      ...data,
      categoryId,
      budgetId,
    });

    // Update payee calculated fields asynchronously
    if (data.payeeId) {
      this.payeeService.updateCalculatedFields(data.payeeId).catch(console.error);
    }

    return transaction;
  }
}
```

### Phase 2: Advanced Automation (Medium Priority)

#### 2.1 Smart Defaults and Suggestions

**Payee Intelligence Service** (`src/lib/server/domains/payees/intelligence.ts`):

```typescript
export class PayeeIntelligenceService {
  // Analyze spending patterns for budget allocation suggestions
  async analyzeSpendingPatterns(payeeId: number): Promise<SpendingAnalysis> {
    const transactions = await this.getTransactionHistory(payeeId, 365); // Last year

    return {
      averageAmount: this.calculateAverage(transactions),
      seasonalPatterns: this.detectSeasonality(transactions),
      budgetUtilization: this.analyzeBudgetImpact(transactions),
      categoryDistribution: this.getCategoryBreakdown(transactions),
      frequencyPattern: this.detectFrequency(transactions),
    };
  }

  // Auto-suggest budget allocations based on historical data
  async suggestBudgetAllocation(
    payeeId: number,
    transactionAmount: number
  ): Promise<BudgetAllocationSuggestion[]> {
    const payee = await this.payeeService.findById(payeeId);
    const patterns = await this.analyzeSpendingPatterns(payeeId);

    if (payee.defaultBudgetId) {
      return [{
        budgetId: payee.defaultBudgetId,
        allocatedAmount: transactionAmount,
        confidence: patterns.budgetConsistency,
        reason: 'Payee default budget',
      }];
    }

    return this.generateSmartSuggestions(patterns, transactionAmount);
  }
}
```

#### 2.2 Automated Categorization

**Category Learning Engine**:

```typescript
export class CategoryLearningService {
  // Learn from user corrections to improve auto-categorization
  async learnFromCorrection(
    payeeId: number,
    originalCategory: number,
    correctedCategory: number,
    transactionAmount: number
  ): Promise<void> {
    await this.repository.recordCategoryCorrection({
      payeeId,
      originalCategory,
      correctedCategory,
      amount: transactionAmount,
      correctedAt: new Date(),
    });

    // Update payee defaults if correction pattern is strong
    const correctionRate = await this.getCorrectionRate(payeeId, correctedCategory);
    if (correctionRate > 0.8) { // 80% of corrections go to this category
      await this.payeeService.updateDefaultCategory(payeeId, correctedCategory);
    }
  }
}
```

### Phase 3: Contact and Organization (Low Priority)

#### 3.1 Extended Contact Information

**Additional Payee Fields**:

```typescript
// Extended payee schema
export const payees = sqliteTable('payee', {
  // Phase 1 fields...

  // Contact Information
  website: text('website'),
  phone: text('phone'),
  email: text('email'),

  // Organization
  address: text('address'), // JSON object for structured address
  accountNumber: text('account_number'), // Encrypted reference numbers

  // Advanced Features
  alertThreshold: real('alert_threshold'), // Monthly spending limit warning
  isSeasonal: integer('is_seasonal', { mode: 'boolean' }).default(false),
  subscriptionInfo: text('subscription_info'), // JSON: {cost, renewalDate, etc}
  tags: text('tags'), // JSON array of custom tags

  // Payment Processing
  preferredPaymentMethods: text('preferred_payment_methods'), // JSON array of account IDs
  merchantCategoryCode: text('mcc'), // Standard MCC classification
});
```

#### 3.2 Subscription Management

**Subscription Tracking**:

```typescript
export interface SubscriptionInfo {
  monthlyCost: number;
  renewalDate: string; // ISO date
  cancellationInfo?: {
    url?: string;
    phone?: string;
    method: 'online' | 'phone' | 'email';
  };
  isActive: boolean;
}

export class SubscriptionService {
  async trackSubscriptionSpending(accountId: number): Promise<SubscriptionAnalysis> {
    const subscriptionPayees = await this.payeeRepository.findSubscriptions(accountId);

    return {
      totalMonthlyCost: subscriptionPayees.reduce((sum, p) => sum + p.subscriptionInfo.monthlyCost, 0),
      upcomingRenewals: this.getUpcomingRenewals(subscriptionPayees, 30),
      unusedSubscriptions: this.detectUnusedSubscriptions(subscriptionPayees),
      savingsOpportunities: this.calculatePotentialSavings(subscriptionPayees),
    };
  }
}
```

### Phase 4: UI Integration

#### 4.1 Enhanced Payee Management

**Payee Form Components**:

```typescript
// src/lib/components/forms/manage-payee-form.svelte
interface PayeeFormData {
  name: string;
  notes?: string;

  // Budgeting Integration
  defaultCategoryId?: number;
  defaultBudgetId?: number;
  payeeType?: PayeeType;
  paymentFrequency?: PaymentFrequency;
  taxRelevant: boolean;

  // Contact Information
  website?: string;
  phone?: string;
  email?: string;

  // Advanced Settings
  alertThreshold?: number;
  isSeasonal: boolean;
  tags: string[];
}
```

**Smart Transaction Form**:

```typescript
// Enhanced transaction creation with payee intelligence
interface SmartTransactionForm {
  // When payee is selected, auto-populate:
  suggestedCategory?: number;     // From payee.defaultCategoryId
  suggestedBudget?: number;       // From payee.defaultBudgetId
  suggestedAmount?: number;       // From payee.avgAmount
  confidence: number;             // Algorithm confidence (0-1)

  // User can override suggestions
  allowOverride: boolean;
  showSuggestionReason: boolean;
}
```

#### 4.2 Analytics and Insights

**Payee Analytics Dashboard**:

```typescript
// Payee spending insights
interface PayeeAnalytics {
  topPayees: Array<{payee: Payee, totalSpent: number, transactionCount: number}>;
  categoryDistribution: Array<{category: string, amount: number, payeeCount: number}>;
  subscriptionCosts: SubscriptionAnalysis;
  seasonalSpending: Array<{month: string, amount: number}>;
  budgetImpact: Array<{budget: string, utilization: number}>;
}
```

## Implementation Strategy

### Database Migration Plan

**Migration 001: Core Fields**
```sql
-- Add core budgeting fields
ALTER TABLE payee ADD COLUMN default_category_id INTEGER REFERENCES category(id);
ALTER TABLE payee ADD COLUMN default_budget_id INTEGER REFERENCES budget(id);
ALTER TABLE payee ADD COLUMN payee_type TEXT CHECK(payee_type IN ('merchant', 'utility', 'employer', 'financial_institution', 'government', 'individual'));
ALTER TABLE payee ADD COLUMN avg_amount REAL;
ALTER TABLE payee ADD COLUMN payment_frequency TEXT;
ALTER TABLE payee ADD COLUMN last_transaction_date TEXT;
ALTER TABLE payee ADD COLUMN tax_relevant INTEGER DEFAULT 0;
ALTER TABLE payee ADD COLUMN is_active INTEGER DEFAULT 1;
```

**Migration 002: Contact Fields**
```sql
-- Add contact and organization fields
ALTER TABLE payee ADD COLUMN website TEXT;
ALTER TABLE payee ADD COLUMN phone TEXT;
ALTER TABLE payee ADD COLUMN email TEXT;
ALTER TABLE payee ADD COLUMN address TEXT; -- JSON
ALTER TABLE payee ADD COLUMN account_number TEXT;
```

**Migration 003: Advanced Features**
```sql
-- Add advanced budgeting features
ALTER TABLE payee ADD COLUMN alert_threshold REAL;
ALTER TABLE payee ADD COLUMN is_seasonal INTEGER DEFAULT 0;
ALTER TABLE payee ADD COLUMN subscription_info TEXT; -- JSON
ALTER TABLE payee ADD COLUMN tags TEXT; -- JSON array
ALTER TABLE payee ADD COLUMN preferred_payment_methods TEXT; -- JSON array
ALTER TABLE payee ADD COLUMN merchant_category_code TEXT;
```

### Service Layer Updates

1. **PayeeService**: Enhance with calculation methods and intelligent defaults
2. **TransactionService**: Integrate payee-based auto-population
3. **BudgetService**: Add payee-specific budget allocation logic
4. **AnalyticsService**: Implement payee spending pattern analysis

### Frontend Integration

1. **Enhanced Forms**: Update payee management with new fields
2. **Smart Suggestions**: Show payee-based suggestions in transaction forms
3. **Analytics Views**: Add payee insights to dashboard
4. **Subscription Management**: Dedicated subscription tracking interface

## Benefits

### User Experience
- **Reduced Manual Entry**: Auto-populated categories and budgets based on payee
- **Intelligent Suggestions**: Smart defaults based on spending history
- **Better Organization**: Enhanced payee categorization and tagging
- **Subscription Awareness**: Track recurring costs and identify savings opportunities

### Data Quality
- **Consistent Categorization**: Reduce manual categorization errors
- **Rich Analytics**: More detailed spending pattern analysis
- **Audit Trail**: Track categorization changes and improvements
- **Historical Intelligence**: Learn from user behavior to improve suggestions

### Budget Management
- **Accurate Forecasting**: Better prediction based on payee patterns
- **Automated Allocation**: Reduce manual budget assignment overhead
- **Spending Alerts**: Payee-specific budget threshold warnings
- **Category Optimization**: Data-driven category and budget structure suggestions

## Timeline

**Phase 1 (Core Fields)**: 2-3 weeks
- Database migrations and schema updates
- Service layer enhancements
- Basic UI integration

**Phase 2 (Smart Automation)**: 3-4 weeks
- Intelligence service implementation
- Learning algorithms
- Enhanced transaction workflow

**Phase 3 (Contact Management)**: 2-3 weeks
- Extended contact fields
- Subscription tracking
- Advanced organizational features

**Phase 4 (UI Polish)**: 2-3 weeks
- Analytics dashboard
- Advanced form components
- User experience optimization

**Total Estimated Timeline**: 9-13 weeks

## Success Metrics

- **Automation Rate**: Percentage of transactions with auto-populated categories/budgets
- **Accuracy Rate**: Percentage of auto-suggestions accepted by users
- **Data Quality**: Reduction in uncategorized transactions
- **User Engagement**: Increased usage of budgeting features
- **Time Savings**: Reduced time spent on manual transaction categorization

## Risk Mitigation

**Data Migration Risks**:
- Gradual rollout of new fields with fallback defaults
- Comprehensive testing with existing transaction data
- Rollback procedures for each migration step

**Performance Concerns**:
- Indexed queries for new relationship fields
- Asynchronous calculation of derived fields
- Efficient caching of payee intelligence data

**User Adoption**:
- Opt-in approach for auto-population features
- Clear explanation of suggestions and reasoning
- Easy override mechanisms for user control

This enhancement plan transforms payees from simple entities into intelligent components of the budgeting system, providing automated assistance while maintaining user control and data quality.
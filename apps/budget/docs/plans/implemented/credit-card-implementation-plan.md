# Debt Account (Credit Cards & Loans) Implementation Plan

## Overview

Implement debt account-specific behavior to properly handle liability accounts (credit cards and loans) with inverted balances, special transaction handling, and transfer support.

## Current State

- ✅ Account types already include `credit_card` and `loan` in the schema
- ✅ Balance calculation exists (sum of all transaction amounts)
- ❌ No special handling for debt account polarity (liability vs asset)
- ❌ No transfer transaction support
- ❌ Debt account transactions count against budgets (should only count purchases/disbursements, not payments)
- ❌ No credit limit or loan principal tracking

## Account Type Classification

### Liability Accounts (Debt - Inverted Balance)

- **`credit_card`**: Credit cards, charge cards
- **`loan`**: Mortgages, auto loans, personal loans, student loans, lines of credit

**Balance Polarity**: Negative = you owe money, Positive = overpaid/credit

### Asset Accounts (Normal Balance)

- **`checking`**: Standard checking accounts
- **`savings`**: Savings accounts
- **`cash`**: Physical cash on hand
- **`investment`**: Brokerage accounts, retirement accounts
- **`other`**: Catch-all for miscellaneous accounts

**Balance Polarity**: Positive = you have money, Negative = overdrawn

## Balance Storage Convention

### Raw Transaction Amounts (Database Storage)

Transaction amounts are ALWAYS stored from the account's perspective:

- **Asset Accounts** (checking, savings, cash, investment):
  - Positive amount = money in (deposits, income)
  - Negative amount = money out (expenses, withdrawals)
- **Debt Accounts** (credit cards, loans):
  - Positive amount = payment/reduction (paying down debt)
  - Negative amount = charge/increase (new purchases, loan disbursements)

### Calculated Balances

- **Asset Accounts**: `initialBalance + sum(all transaction amounts)`
- **Debt Accounts**: `initialBalance - sum(all transaction amounts)` (inverted)

### Initial Balance Storage

All initial balances stored as **positive** numbers representing the magnitude:

- **Asset Accounts**: `initialBalance: 1000` = $1,000 in the account
- **Debt Accounts**: `initialBalance: 500` = $500 of debt (displayed as -$500 after inversion)

This convention keeps database values intuitive while allowing the calculation
logic to handle the polarity inversion for debt accounts.

### Transfer Transaction Accounting

Transfers work correctly with inverted balances:

**Example 1**: Transfer $100 from Checking → Credit Card (payment)

- Checking: `-100` (money out)
- Credit Card: `+100` (payment in)
- After inversion: Credit Card debt decreases ✅

**Example 2**: Transfer $100 from Credit Card → Checking (cash advance)

- Credit Card: `-100` (cash advance out)
- Checking: `+100` (money in)
- After inversion: Credit Card debt increases ✅

## Implementation Phases

### Phase 1: Database Schema Enhancements

#### 1.1 Add Debt Account Fields to Accounts Table

**File**: `src/lib/schema/accounts.ts`

Add optional debt account-specific fields:

```typescript
// Add to accounts table
debtLimit: real("debt_limit"), // Credit limit (credit cards) or principal amount (loans)
minimumPayment: real("minimum_payment"), // Minimum monthly payment
paymentDueDay: integer("payment_due_day"), // Day of month payment is due (1-31)
interestRate: real("interest_rate"), // APR for credit cards or loan interest rate
```

Add helper function to classify accounts:

```typescript
export function isDebtAccount(accountType: AccountType): boolean {
  return accountType === 'credit_card' || accountType === 'loan';
}

export function getAccountNature(accountType: AccountType): 'asset' | 'liability' {
  return isDebtAccount(accountType) ? 'liability' : 'asset';
}
```

Update validation schemas to include these fields with appropriate constraints.

#### 1.2 Add Transfer Transaction Support

**File**: `src/lib/schema/transactions.ts`

Add fields to support transfer transactions:

```typescript
// Add to transactions table
transferId: text("transfer_id"), // Shared ID for both transactions in the pair (CUID)
transferAccountId: integer("transfer_account_id").references(() => accounts.id), // The OTHER account in the transfer
transferTransactionId: integer("transfer_transaction_id").references(() => transactions.id), // The linked transaction
isTransfer: integer("is_transfer", {mode: "boolean"}).default(false), // Quick check for transfers
```

**Relationship**: A transfer creates two linked transactions:

- **Transaction A** (source account):
  - `transferId`: shared CUID (e.g., "clxyz123...")
  - `amount`: negative (money out)
  - `transferAccountId`: destination account ID
  - `transferTransactionId`: Transaction B's ID
- **Transaction B** (destination account):
  - `transferId`: same shared CUID (e.g., "clxyz123...")
  - `amount`: positive (money in)
  - `transferAccountId`: source account ID
  - `transferTransactionId`: Transaction A's ID

**Why THREE fields are required**:

1. **`transferId`** (shared): Durable identifier for the transfer as a unit
   - Used by `updateTransfer(transferId, ...)` and `deleteTransfer(transferId)`
   - Both transactions share the same `transferId`
   - Enables querying: `WHERE transferId = 'clxyz123'` returns both paired transactions

2. **`transferTransactionId`**: Direct link to the paired transaction
   - Enables bi-directional navigation
   - Used for consistency checks

3. **`transferAccountId`**: The OTHER account involved
   - Used for UI display ("Transfer to Checking")
   - Query optimization

Using only `transferAccountId` would be ambiguous when multiple transfers exist
between the same two accounts:

```typescript
// Example: Two transfers between same accounts

// Transfer 1: $100 from Account A → Account B on Jan 1
Transaction 1: { transferId: "clxyz123", accountId: A, amount: -100, transferTransactionId: 2 }
Transaction 2: { transferId: "clxyz123", accountId: B, amount: +100, transferTransactionId: 1 }

// Transfer 2: $200 from Account A → Account B on Jan 2
Transaction 3: { transferId: "clxyz456", accountId: A, amount: -200, transferTransactionId: 4 }
Transaction 4: { transferId: "clxyz456", accountId: B, amount: +200, transferTransactionId: 3 }

// Service operations:
deleteTransfer("clxyz123")  // Deletes transactions 1 & 2
updateTransfer("clxyz456", { amount: 250 })  // Updates transactions 3 & 4
```

This design allows:

- Bi-directional navigation between linked transactions
- Unambiguous pairing even with multiple transfers between same accounts
- Atomic updates/deletes of transfer pairs
- Support for split transfers (future enhancement)

### Phase 2: Service Layer Updates

#### 2.1 Balance Calculation Logic

**File**: `src/lib/server/domains/accounts/repository.ts`

Update balance calculations to handle account type:

```typescript
import { isDebtAccount } from "$lib/schema/accounts";

// Current: sum all amounts
const totalBalance = accountTransactions.reduce((sum, t) => sum + t.amount, 0);

// New: Consider account type (liability vs asset)
// Start with initial balance (inverted for debt accounts)
const startingBalance = isDebtAccount(account.accountType)
  ? -(account.initialBalance || 0)  // Debt: negate to show as negative
  : (account.initialBalance || 0);   // Asset: use as-is

const totalBalance = accountTransactions.reduce((sum, t) => {
  const amount = Number(t.amount) || 0;
  // For debt accounts (credit cards & loans), invert transaction amounts
  return isDebtAccount(account.accountType)
    ? sum - amount  // Invert for debt accounts
    : sum + amount; // Normal for asset accounts
}, startingBalance);
```

**Rationale**:

- **Asset Accounts** (Checking/Savings):
  - Starting: `initialBalance: 1000` → `startingBalance: 1000`
  - Income +$100 = balance increases to $1,100
  - Expense -$50 = balance decreases to $1,050
- **Liability Accounts** (Credit Card/Loan):
  - Starting: `initialBalance: 500` → `startingBalance: -500` (negated)
  - Purchase -$100 = `sum - (-100) = -600` (debt increases)
  - Payment +$100 = `sum - 100 = -400` (debt decreases toward $0)

**Example Calculation** (Credit Card):

```typescript
// Database: initialBalance = 500 (meaning $500 of starting debt)
// Transactions: [-100 (purchase), +200 (payment), -50 (purchase)]

startingBalance = -500  // Negated initial debt

// Apply transactions with inversion:
// -500 - (-100) = -400  (purchase increases debt)
// -400 - (+200) = -600  (payment decreases debt... wait, this is wrong!)
```

**CORRECTION**: The inversion formula `sum - amount` actually works as:

- Payment +$200: `-500 - 200 = -300` ✅ (debt decreases)
- Purchase -$100: `-300 - (-100) = -200` ✅ (debt increases)

Final: `-200` = $200 owed

#### 2.2 Transfer Transaction Service

**File**: `src/lib/server/domains/transactions/services.ts`

Create new methods for handling transfers:

```typescript
import { createId } from "@paralleldrive/cuid2";

async createTransfer(params: {
  fromAccountId: number;
  toAccountId: number;
  amount: number; // Always positive
  date: string;
  notes?: string;
  categoryId?: number | null;
  payeeId?: number | null;
}): Promise<{transferId: string; fromTransaction: Transaction; toTransaction: Transaction}> {
  const transferId = createId(); // Generate shared CUID for the pair

  // Create two linked transactions in a database transaction
  const fromTransaction = await createTransaction({
    accountId: params.fromAccountId,
    amount: -params.amount, // Negative (money out)
    date: params.date,
    notes: params.notes,
    categoryId: params.categoryId,
    payeeId: params.payeeId,
    transferId, // Shared ID
    transferAccountId: params.toAccountId,
    isTransfer: true,
  });

  const toTransaction = await createTransaction({
    accountId: params.toAccountId,
    amount: params.amount, // Positive (money in)
    date: params.date,
    notes: params.notes,
    categoryId: params.categoryId,
    payeeId: params.payeeId,
    transferId, // Same shared ID
    transferAccountId: params.fromAccountId,
    isTransfer: true,
  });

  // Link them together
  await updateTransaction(fromTransaction.id, { transferTransactionId: toTransaction.id });
  await updateTransaction(toTransaction.id, { transferTransactionId: fromTransaction.id });

  return { transferId, fromTransaction, toTransaction };
}

async updateTransfer(transferId: string, updates: Partial<TransferParams>): Promise<void> {
  // Query both transactions using shared transferId
  const transactions = await db
    .select()
    .from(transactions)
    .where(eq(transactions.transferId, transferId));

  if (transactions.length !== 2) {
    throw new Error("Invalid transfer: expected exactly 2 transactions");
  }

  // Update both transactions atomically with new values
  // (amount, date, notes, etc.)
}

async deleteTransfer(transferId: string): Promise<void> {
  // Delete both transactions using shared transferId
  await db
    .delete(transactions)
    .where(eq(transactions.transferId, transferId));
}
```

### Phase 3: Budget Integration

#### 3.1 Budget Impact Rules

**File**: `src/lib/server/domains/budgets/services.ts`

Update budget calculation logic:

```typescript
import { isDebtAccount } from "$lib/schema/accounts";

// When calculating budget impact:
// 1. Skip ALL transfer transactions (don't affect budgets)
// 2. For debt accounts: Count PURCHASES (negative) and REFUNDS (positive)
//    - Purchases increase budget spending
//    - Refunds decrease budget spending
//    - Payments (transfers from checking) are skipped via isTransfer check
// 3. For asset accounts: Count all non-transfer transactions

function shouldCountAgainstBudget(transaction: Transaction, account: Account): boolean {
  // Never count transfers (includes payments from checking to credit card)
  if (transaction.isTransfer) return false;

  // For debt accounts: count purchases AND refunds/credits
  // - Purchase of $50 stored as -50 → counts against budget (+50 spending)
  // - Refund of $20 stored as +20 → reduces budget spending (-20 spending)
  // - Payment from checking stored as +200 → skipped (isTransfer = true)
  if (isDebtAccount(account.accountType)) {
    return true; // Count all non-transfer transactions for budget impact
  }

  // For asset accounts, count all non-transfer transactions
  return true;
}

// When calculating budget spending from debt account transactions:
function calculateBudgetImpact(transaction: Transaction, account: Account): number {
  if (!shouldCountAgainstBudget(transaction, account)) return 0;

  if (isDebtAccount(account.accountType)) {
    // Invert the amount: negative purchase becomes positive spending
    // positive refund becomes negative spending (reduces budget)
    return -transaction.amount;
  }

  // Asset accounts: use amount as-is
  return Math.abs(transaction.amount); // Typically use absolute value for budget spending
}
```

### Phase 4: UI Updates

#### 4.1 Balance Display

**Files**:

- `src/lib/components/layout/app-sidebar.svelte`
- `src/routes/accounts/[slug]/+page.svelte`
- Dashboard widgets

Update balance display logic:

```typescript
import { isDebtAccount, type AccountType } from "$lib/schema/accounts";

// Helper function for displaying balance with correct polarity
function formatAccountBalance(account: Account): {
  amount: number;
  displayAmount: number;
  color: 'positive' | 'negative' | 'neutral';
  label: string;
} {
  const balance = account.balance || 0;

  if (isDebtAccount(account.accountType)) {
    // Debt accounts (credit cards & loans)
    return {
      amount: balance,
      displayAmount: balance, // Already inverted in calculation
      color: balance < 0 ? 'negative' : balance > 0 ? 'positive' : 'neutral',
      label: balance < 0 ? 'Owed' : balance > 0 ? 'Credit' : 'Paid Off'
    };
  }

  // Asset accounts
  return {
    amount: balance,
    displayAmount: balance,
    color: balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'neutral',
    label: 'Balance'
  };
}
```

#### 4.2 Debt Account Details Display

**File**: `src/routes/accounts/[slug]/+page.svelte`

Add debt account-specific information:

**For Credit Cards**:

- **Available credit**: `debtLimit - Math.abs(balance)`
  - Example: $5,000 limit with -$1,000 debt = $4,000 available
- **Credit utilization**: `(Math.abs(balance) / debtLimit) * 100`
  - Example: -$1,000 debt / $5,000 limit = 20% utilization
- Minimum payment due
- Payment due date
- Visual indicator for credit cards

**For Loans**:

- **Principal amount**: `debtLimit` (original loan amount)
- **Remaining balance**: `Math.abs(balance)`
  - Example: -$15,000 balance = $15,000 remaining
- Interest rate
- Minimum payment
- Payment due date
- **Loan payoff progress**: `((debtLimit - Math.abs(balance)) / debtLimit) * 100`
  - Example: ($20,000 - $15,000) / $20,000 = 25% paid off

#### 4.3 Transfer Transaction UI

**File**: `src/routes/accounts/[slug]/(forms)/manage-transaction-form.svelte`

Add transfer mode:

```svelte
{#if isTransferMode}
  <AccountPicker
    label="Transfer To"
    bind:value={transferAccount}
    exclude={[currentAccountId]} />

  <!-- Amount is always positive for transfers -->
  <NumericInput
    label="Amount"
    bind:value={amount}
    min={0.01} />
{:else}
  <!-- Regular transaction form -->
{/if}
```

#### 4.4 Transaction Table Updates

**File**: `src/routes/accounts/[slug]/(data)/columns.svelte.ts`

Updates:

- Add transfer indicator icon/badge
- Show linked account for transfers
- Different color scheme for transfers vs purchases vs payments

### Phase 5: Form Validation & User Experience

#### 5.1 Debt Account Creation

**File**: `src/routes/accounts/new/+page.svelte`

When user selects `credit_card` account type:

- Show credit limit field (optional)
- Show payment due day (optional)
- Show minimum payment field (optional)
- Show interest rate field (optional)
- Explain that balances will show debt as negative

When user selects `loan` account type:

- Show principal/loan amount field (optional, as debt limit)
- Show payment due day (optional)
- Show minimum payment field (optional)
- Show interest rate field (optional)
- Explain that balances will show debt as negative

#### 5.2 Transfer Validation

Validate transfers to prevent:

- Transferring to the same account
- Negative transfer amounts
- Transfers between incompatible account types (if needed)

#### 5.3 Visual Indicators

Add clear visual distinctions:

- Credit card icon (credit-card icon) for credit cards
- Appropriate loan icon for loan accounts
- Red/negative styling for debt
- Green/positive styling for credit (overpayment)
- Transfer arrows or icons for linked transactions

### Phase 6: Migration & Testing

#### 6.1 Database Migration

**File**: `src/lib/schema/migrations/XXXX_add_debt_account_fields.sql`

```sql
-- Add debt account fields to accounts
ALTER TABLE account ADD COLUMN debt_limit REAL;
ALTER TABLE account ADD COLUMN minimum_payment REAL;
ALTER TABLE account ADD COLUMN payment_due_day INTEGER;
ALTER TABLE account ADD COLUMN interest_rate REAL;

-- Add transfer fields to transactions
ALTER TABLE transaction ADD COLUMN transfer_id TEXT; -- Shared ID for transfer pair
ALTER TABLE transaction ADD COLUMN transfer_account_id INTEGER REFERENCES account(id);
ALTER TABLE transaction ADD COLUMN transfer_transaction_id INTEGER REFERENCES transaction(id);
ALTER TABLE transaction ADD COLUMN is_transfer INTEGER DEFAULT 0;
CREATE INDEX idx_transaction_transfer_id ON transaction(transfer_id); -- Query both paired transactions
CREATE INDEX idx_transaction_transfer_account ON transaction(transfer_account_id);
CREATE INDEX idx_transaction_transfer_transaction ON transaction(transfer_transaction_id);
CREATE INDEX idx_transaction_is_transfer ON transaction(is_transfer);
```

#### 6.2 Existing Data Handling

For existing debt accounts (credit cards and loans):

- **Balance re-calculation**: Update balance calculation logic to use inverted formula
- **Initial balance handling**: Ensure existing `initialBalance` values are positive
  - If any debt accounts have negative `initialBalance`, convert to positive
  - Migration script should run: `UPDATE account SET initial_balance = ABS(initial_balance) WHERE account_type IN ('credit_card', 'loan') AND initial_balance < 0`
- **No data migration needed** for new fields (all optional)
- **Transaction amounts**: No changes needed - already stored correctly from account perspective

#### 6.3 Test Coverage

Create tests for:

- Debt account balance calculations (credit cards and loans)
- Asset account balance calculations (checking, savings, etc.)
- Transfer transaction creation and deletion
- Budget impact calculations excluding transfers
- UI display of debt accounts vs asset accounts
- Validation of transfer forms

## Implementation Order

1. **Phase 1**: Database schema (required foundation)
2. **Phase 2**: Service layer (business logic)
3. **Phase 3**: Budget integration (ensure correct budget counting)
4. **Phase 4**: UI updates (user-facing changes)
5. **Phase 5**: Form validation and UX polish
6. **Phase 6**: Migration and comprehensive testing

## Key Benefits

- **Accurate debt tracking**: Debt accounts (credit cards & loans) show debt correctly as negative balances
- **No double-counting**: Transfers don't affect budgets
- **Realistic budgeting**: Only purchases/disbursements count against budgets, not payments
- **Better UX**: Clear visual indicators for account types and transfers
- **Credit monitoring**: Track credit utilization and payment due dates
- **Loan tracking**: Monitor loan balances, interest rates, and payment schedules

## Future Enhancements (Optional)

- Automatic payment scheduling for debt accounts
- Payment reminders based on due dates
- Interest calculation and tracking
- Amortization schedules for loans
- Credit card rewards tracking
- Statement reconciliation
- Debt payoff calculators and projections

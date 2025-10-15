# HSA Account Separation Analysis

## Current State

HSA accounts are stored in the `accounts` table with `accountType = "hsa"` and 5 HSA-specific fields. They share infrastructure with regular accounts but have a separate UI at `/hsa/[slug]`.

## Data Model Analysis

### Shared Fields (Used by ALL accounts)
- id, cuid, name, slug
- balance, closed, notes
- accountType, institution
- accountIcon, accountColor
- initialBalance, accountNumberLast4
- onBudget
- dateOpened, createdAt, updatedAt, deletedAt

### Type-Specific Fields

**HSA Only (5 fields):**
- hsaContributionLimit
- hsaType (individual/family)
- hsaCurrentTaxYear
- hsaAdministrator
- hsaHighDeductiblePlan

**Debt Only (4 fields - credit cards & loans):**
- debtLimit
- minimumPayment
- paymentDueDay
- interestRate

**Regular accounts:** Use none of the above

### HSA-Specific Domain Models
- `medicalExpenses` table (linked to HSA accounts)
- `hsaClaims` table (linked to medical expenses)
- `expenseReceipts` table (linked to medical expenses)

## Architecture Options

### Option 1: Full Separation ❌ NOT RECOMMENDED

Create `hsaAccounts` table separate from `accounts`.

**Pros:**
- Clean schemas with no optional fields
- Type safety at database level
- Easier to understand each type

**Cons:**
- **MAJOR:** HSA accounts have regular transactions too (contributions, withdrawals)
- **MAJOR:** Balance tracking needs to work across both medical expenses AND transactions
- Duplicate code for account management
- Can't easily list "all accounts" in sidebar
- Transfers between HSA and regular accounts become complex
- Account rollover history becomes disconnected
- More complex queries for "total net worth"

**Verdict:** ❌ Too much duplication, breaks existing transaction/balance logic

---

### Option 2: Keep Unified Table (Current) ✅ RECOMMENDED

Keep HSA accounts in `accounts` table with `accountType = "hsa"`.

**Pros:**
- ✅ HSA accounts have transactions (contributions, withdrawals) just like other accounts
- ✅ Balance tracking works uniformly
- ✅ Single source of truth for all accounts
- ✅ Sidebar naturally shows all accounts
- ✅ Transfers between accounts work seamlessly
- ✅ Account rollover history is unified
- ✅ "Total net worth" queries are simple
- ✅ Medical expenses are already in separate tables

**Cons:**
- Schema has 9 fields most accounts don't use
- Forms need conditional field rendering
- tRPC schemas include all fields

**Improvements to Make:**

1. **Better Type Safety in TypeScript:**
```typescript
type BaseAccount = {
  id: number;
  name: string;
  accountType: AccountType;
  // ... shared fields
}

type RegularAccount = BaseAccount & {
  accountType: 'checking' | 'savings' | 'investment' | 'cash' | 'other';
  // No special fields
}

type DebtAccount = BaseAccount & {
  accountType: 'credit_card' | 'loan';
  debtLimit: number | null;
  minimumPayment: number | null;
  paymentDueDay: number | null;
  interestRate: number | null;
}

type HsaAccount = BaseAccount & {
  accountType: 'hsa';
  hsaContributionLimit: number | null;
  hsaType: 'individual' | 'family' | null;
  hsaCurrentTaxYear: number | null;
  hsaAdministrator: string | null;
  hsaHighDeductiblePlan: string | null;
}

type Account = RegularAccount | DebtAccount | HsaAccount;
```

2. **Separate Service Methods:**
```typescript
// Keep AccountService for shared operations
class AccountService {
  create()
  update()
  delete()
  getBalance()
}

// Add HSA-specific service (already exists)
class HsaAccountService extends AccountService {
  validateContributionLimit()
  getCurrentTaxYear()
  getRolloverHistory()
}
```

3. **Keep Separate UI Routes:**
- `/accounts/[slug]` - Regular accounts (current)
- `/hsa/[slug]` - HSA accounts (current) ✅ Already done!

4. **Schema Improvements:**
```typescript
// Base schema
const baseAccountSchema = z.object({
  name: z.string(),
  // ... shared fields
});

// Type-specific schemas
const hsaAccountSchema = baseAccountSchema.extend({
  accountType: z.literal('hsa'),
  hsaContributionLimit: z.number().optional(),
  // ... HSA fields
});

const debtAccountSchema = baseAccountSchema.extend({
  accountType: z.enum(['credit_card', 'loan']),
  debtLimit: z.number().optional(),
  // ... debt fields
});

// Discriminated union
const accountSchema = z.discriminatedUnion('accountType', [
  regularAccountSchema,
  debtAccountSchema,
  hsaAccountSchema,
]);
```

---

### Option 3: Hybrid - Separate Table with Shared Link ⚠️ COMPLEX

Create `hsaAccounts` table but link to base `accounts` for shared fields.

**Structure:**
- `accounts` table: Core account data (balance, transactions)
- `hsaAccounts` table: HSA-specific fields (1-to-1 with accounts)

**Pros:**
- Clean separation of HSA data
- Still shares transaction/balance infrastructure

**Cons:**
- Requires JOINs for every HSA query
- More complex migrations
- Harder to maintain referential integrity
- Marginal benefit over Option 2

**Verdict:** ⚠️ Added complexity not worth the benefit

---

## Recommendation: Option 2 (Current Architecture) ✅

**Keep HSA accounts in the unified `accounts` table.**

### Why This Makes Sense:

1. **HSA accounts ARE financial accounts**
   - They have balances
   - They have transactions (contributions, withdrawals, transfers)
   - They need the same balance tracking logic
   - They appear in net worth calculations

2. **Medical expenses are already separate**
   - `medicalExpenses` table already separates HSA-specific concerns
   - This is where the real HSA-unique logic lives
   - Expenses are linked to accounts via `hsaAccountId`

3. **Type-specific fields are common in database design**
   - Credit cards have debt-specific fields
   - Investment accounts might have ticker symbols
   - This is normal and acceptable
   - NULL values for unused fields are fine

4. **Current UI separation is already good**
   - `/hsa/[slug]` routes provide specialized UI
   - Regular account pages don't show HSA stuff
   - Sidebar groups accounts appropriately

### Action Items to Improve Current Design:

- [x] Add missing fields to tRPC schema (just completed)
- [ ] Add TypeScript discriminated union types
- [ ] Add conditional field validation based on accountType
- [ ] Document which fields apply to which account types
- [ ] Add form field groups that show/hide based on account type

### What NOT to Do:

- ❌ Don't create separate `hsaAccounts` table
- ❌ Don't duplicate transaction/balance logic
- ❌ Don't break the unified account list

## Conclusion

The current architecture is **sound**. HSA accounts share enough core functionality with regular accounts (balance, transactions, transfers) that they belong in the same table. The UI separation you've already implemented provides the right level of distinction without the downsides of a fully separate model.

The bug you found (missing `onBudget` field in tRPC schema) was a schema maintenance issue, not an architectural flaw. The fix was to add the field, not to restructure the entire account system.

**Recommendation: Keep the current unified architecture.** ✅

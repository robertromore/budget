# Navigation Guide

## Quick File Finder

### 🏦 **Accounts**
- **List/Overview**: `/routes/accounts/+page.svelte`
- **Account Detail**: `/routes/accounts/[id]/+page.svelte`
- **Account Forms**: `/lib/components/business/accounts/manage-account-form.svelte`
- **Account State**: `/lib/states/accounts.svelte.ts`
- **API**: `/lib/orpc/routes/accounts.ts`

### 💰 **Transactions** 
- **Transaction Table**: `/lib/components/business/transactions/table/data-table.svelte`
- **Table Columns**: `/routes/accounts/[id]/(data)/columns.svelte.ts`
- **Transaction Forms**: `/lib/components/business/transactions/manage-transaction-form.svelte`
- **Table Components**: `/lib/components/business/transactions/table/`
- **API**: `/lib/orpc/routes/transactions.ts`

### 📅 **Schedules**
- **Schedule List**: `/routes/schedules/+page.svelte`
- **Schedule Forms**: `/lib/components/business/schedules/manage-schedule-form.svelte`
- **API**: `/lib/orpc/routes/schedules.ts`

### 🏷️ **Categories & Payees**
- **Category Forms**: `/lib/components/business/categories/manage-category-form.svelte`
- **Payee Forms**: `/lib/components/business/payees/manage-payee-form.svelte`
- **States**: `/lib/states/categories.svelte.ts`, `/lib/states/payees.svelte.ts`
- **API**: `/lib/orpc/routes/categories.ts`, `/lib/orpc/routes/payees.ts`

### 👁️ **Views & Filters**
- **View Management**: `/lib/components/business/views/manage-view-form.svelte`
- **Date Filters**: `/lib/components/input/advanced-date-input.svelte`
- **Filter State**: `/lib/states/date-filters.svelte.ts`

### 🛠️ **Core Utilities**
- **Database Schema**: `/lib/schema/`
- **Formatters**: `/lib/utils/formatters.ts`
- **Date Utilities**: `/lib/utils/dates.ts`
- **Types**: `/lib/types/`

## Common Tasks

### Adding a New Feature
1. **Schema**: Define in `/lib/schema/[entity].ts`
2. **API**: Create procedures in `/lib/orpc/routes/[entity].ts`
3. **State**: Create store in `/lib/states/[entity].svelte.ts`
4. **UI**: Add components in `/lib/components/business/[domain]/`
5. **Route**: Create page in `/routes/[entity]/`

### Debugging Data Issues
1. **Check API**: `/lib/orpc/routes/[entity].ts`
2. **Verify State**: `/lib/states/[entity].svelte.ts`
3. **Inspect Formatters**: `/lib/utils/formatters.ts`
4. **Check Types**: `/lib/types/[entity].ts`

### UI Problems
1. **Component Location**: `/lib/components/` (by domain)
2. **Styling**: Check Tailwind classes
3. **Forms**: `/lib/components/business/[domain]/`
4. **Tables**: `/lib/components/business/transactions/table/`
# Navigation Guide

## Quick File Finder

### 🏦 **Accounts**
- **List/Overview**: `/routes/accounts/+page.svelte`
- **Account Detail**: `/routes/accounts/[id]/+page.svelte`
- **Account Forms**: `/lib/components/forms/manage-account-form.svelte`
- **Account State**: `/lib/states/accounts.svelte.ts`
- **API**: `/lib/orpc/routes/accounts.ts`

### 💰 **Transactions** 
- **Transaction Table**: `/routes/accounts/[id]/(components)/data-table.svelte`
- **Table Columns**: `/routes/accounts/[id]/(data)/columns.svelte.ts`
- **Transaction Forms**: `/lib/components/forms/manage-transaction-form.svelte`
- **Editable Cells**: `/routes/accounts/[id]/(components)/(cells)/`
- **API**: `/lib/orpc/routes/transactions.ts`

### 📅 **Schedules**
- **Schedule List**: `/routes/schedules/+page.svelte`
- **Schedule Forms**: `/lib/components/forms/manage-schedule-form.svelte`
- **API**: `/lib/orpc/routes/schedules.ts`

### 🏷️ **Categories & Payees**
- **Category Forms**: `/lib/components/forms/manage-category-form.svelte`
- **Payee Forms**: `/lib/components/forms/manage-payee-form.svelte`
- **States**: `/lib/states/categories.svelte.ts`, `/lib/states/payees.svelte.ts`
- **API**: `/lib/orpc/routes/categories.ts`, `/lib/orpc/routes/payees.ts`

### 👁️ **Views & Filters**
- **View Management**: `/lib/components/forms/manage-view-form.svelte`
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
4. **UI**: Add components in `/lib/components/forms/`
5. **Route**: Create page in `/routes/[entity]/`

### Debugging Data Issues
1. **Check API**: `/lib/orpc/routes/[entity].ts`
2. **Verify State**: `/lib/states/[entity].svelte.ts`
3. **Inspect Formatters**: `/lib/utils/formatters.ts`
4. **Check Types**: `/lib/types/[entity].ts`

### UI Problems
1. **Component Location**: `/lib/components/` (by domain)
2. **Styling**: Check Tailwind classes
3. **Forms**: `/lib/components/forms/`
4. **Tables**: `/routes/accounts/[id]/(components)/`
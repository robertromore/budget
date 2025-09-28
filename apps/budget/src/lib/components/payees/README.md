# Payee Management UI Components

This directory contains comprehensive payee management UI components that integrate all Phase 2 and Phase 3 features including ML insights, contact validation, subscription detection, and advanced analytics.

## Components

### 1. ManagePayeeForm

A comprehensive form component with tabbed interface for managing all payee details.

**Features:**
- **Basic Info Tab**: Essential payee details and categorization
- **Contact Tab**: Contact information with validation and enrichment
- **Business Tab**: Business details and subscription detection
- **ML Insights Tab**: AI-powered recommendations and statistics
- **Automation Tab**: Quick actions and intelligent defaults

**Usage:**
```svelte
<script>
  import { ManagePayeeForm } from '$lib/components/payees';

  function handlePayeeSaved(payee) {
    console.log('Payee saved:', payee);
  }

  function handlePayeeDeleted(id) {
    console.log('Payee deleted:', id);
  }
</script>

<!-- Create new payee -->
<ManagePayeeForm
  onSave={handlePayeeSaved}
  formId="create-payee"
/>

<!-- Edit existing payee -->
<ManagePayeeForm
  id={123}
  onSave={handlePayeeSaved}
  onDelete={handlePayeeDeleted}
  formId="edit-payee"
/>
```

**Props:**
- `id?: number` - Payee ID for editing (omit for creation)
- `onSave?: (payee: Payee) => void` - Callback when payee is saved
- `onDelete?: (id: number) => void` - Callback when payee is deleted
- `formId?: string` - Form ID for multiple forms on same page

### 2. PayeeSelector

Enhanced payee selection component with search, ML suggestions, and inline details.

**Features:**
- Advanced search with tRPC backend integration
- ML-powered payee suggestions based on transaction context
- Recent activity display
- Inline payee details with statistics
- Contact information preview
- AI insights and recommendations
- Inline payee creation

**Usage:**
```svelte
<script>
  import { PayeeSelector } from '$lib/components/payees';

  let selectedPayeeId = $state(null);

  function handlePayeeChange(payeeId) {
    selectedPayeeId = payeeId;
    console.log('Selected payee:', payeeId);
  }
</script>

<!-- Basic usage -->
<PayeeSelector
  value={selectedPayeeId}
  onValueChange={handlePayeeChange}
  placeholder="Select a payee..."
/>

<!-- With ML suggestions and transaction context -->
<PayeeSelector
  value={selectedPayeeId}
  onValueChange={handlePayeeChange}
  showMLSuggestions={true}
  showRecentActivity={true}
  transactionContext={{
    amount: 29.99,
    date: '2024-01-15',
    description: 'Subscription payment'
  }}
/>

<!-- Read-only with details -->
<PayeeSelector
  value={selectedPayeeId}
  disabled={true}
  showDetails={true}
  allowCreate={false}
/>
```

**Props:**
- `value?: number | null` - Selected payee ID
- `onValueChange?: (payeeId: number | null) => void` - Selection callback
- `placeholder?: string` - Placeholder text
- `showDetails?: boolean` - Show detailed payee information (default: true)
- `showMLSuggestions?: boolean` - Show AI suggestions (default: true)
- `showRecentActivity?: boolean` - Show recent payees (default: true)
- `allowCreate?: boolean` - Allow creating new payees (default: true)
- `disabled?: boolean` - Disable the selector
- `transactionContext?` - Context for ML suggestions:
  - `amount?: number` - Transaction amount
  - `date?: string` - Transaction date
  - `description?: string` - Transaction description

### 3. PayeeAnalyticsDashboard

Comprehensive analytics dashboard with ML insights and performance metrics.

**Features:**
- Overview with key statistics
- ML insights and unified recommendations
- Cross-system learning analysis
- Behavior change detection
- Performance metrics and trends
- Actionable recommendations
- Budget optimization analysis

**Usage:**
```svelte
<script>
  import { PayeeAnalyticsDashboard } from '$lib/components/payees';
</script>

<!-- Individual payee analytics -->
<PayeeAnalyticsDashboard
  payeeId={123}
  timeframe="12"
/>

<!-- Overall analytics dashboard -->
<PayeeAnalyticsDashboard
  showOverallAnalytics={true}
  timeframe="6"
/>
```

**Props:**
- `payeeId?: number` - Specific payee ID for individual analytics
- `showOverallAnalytics?: boolean` - Show system-wide analytics (default: false)
- `timeframe?: string` - Time period ('3', '6', '12', '24', 'all') (default: '12')

## Integration with Query Layer

All components integrate seamlessly with the query layer for efficient data fetching and caching:

```typescript
import {
  listPayees,
  getPayeeIntelligence,
  getUnifiedMLRecommendations,
  applyIntelligentDefaults,
  validatePayeeContact,
  classifySubscription
} from '$lib/query/payees';

// Use in components
const payees = listPayees();
const intelligence = getPayeeIntelligence(payeeId);
const mlRecommendations = getUnifiedMLRecommendations(payeeId, context);
```

## ML Features Integration

### Category Learning
- Automatic category recommendations based on transaction history
- User correction recording and learning
- Confidence scoring and improvement over time
- Cross-payee pattern recognition

### Contact Validation
- Phone number standardization and validation
- Email domain verification
- Website accessibility checking
- Address enrichment with geocoding

### Subscription Detection
- Recurring pattern analysis
- Subscription classification and metadata
- Cost analysis and optimization suggestions
- Cancellation assistance

### Budget Optimization
- Spending pattern analysis
- Budget allocation recommendations
- Multi-payee optimization strategies
- Scenario analysis and forecasting

## Accessibility Features

All components follow WCAG 2.1 AA standards:
- Full keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus management in modals and dropdowns
- Semantic HTML structure
- ARIA labels and descriptions

## Responsive Design

Components are fully responsive and work across all device sizes:
- Mobile-first design approach
- Flexible grid layouts
- Touch-friendly interactions
- Adaptive tab layouts on smaller screens

## Error Handling

Comprehensive error handling with user-friendly messages:
- Network error recovery
- Validation error display
- Loading states and feedback
- Graceful degradation when ML features are unavailable

## Performance Considerations

- Lazy loading of ML insights and analytics
- Efficient search with debouncing
- Smart caching of payee statistics
- Progressive enhancement of features
- Optimistic updates for better UX
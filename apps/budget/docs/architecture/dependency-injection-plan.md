# Dependency Injection Refactoring Plan

**Date**: 2025-10-14
**Status**: Planning
**Priority**: High

## Problem Statement

Currently, services instantiate their dependencies directly in constructors, leading to:
- **Impossible to unit test** - Cannot mock dependencies
- **Tight coupling** - Services are coupled to concrete implementations
- **Memory inefficiency** - Creates multiple instances of the same service
- **Unclear dependency graph** - Hard to understand service relationships
- **Circular dependency risks** - Can cause initialization issues

### Current Pattern (Anti-pattern)
```typescript
class PayeeService {
  constructor(
    private repository: PayeeRepository = new PayeeRepository()
  ) {
    this.intelligenceService = new PayeeIntelligenceService(); // ❌
    this.learningService = new CategoryLearningService(); // ❌
    this.mlCoordinator = new PayeeMLCoordinator(); // ❌
    this.contactService = new ContactManagementService(); // ❌
    this.subscriptionService = new SubscriptionManagementService(); // ❌
  }
}
```

## Analysis Results

### Services with DI Problems (39 instances)

1. **PayeeService** (services.ts):
   - Creates 5 services in constructor
   - Creates BudgetAllocationService 9 times in methods

2. **PayeeMLCoordinator** (ml-coordinator.ts):
   - Creates 3 services in constructor

3. **BudgetAllocationService** (budget-allocation.ts):
   - Creates 2 services in constructor

4. **TransactionService** (services.ts):
   - Creates 4 services in constructor
   - Creates ScheduleService 2 times in methods

5. **ScheduleService** (services.ts):
   - Creates 3 services in constructor

6. **MedicalExpenseService** (services.ts):
   - Creates 2 services in constructor

## Proposed Solution

### Strategy: Constructor Injection with Service Container

We'll use a **service container pattern** that:
1. Manages singleton instances of services
2. Handles dependency injection automatically
3. Allows easy mocking for tests
4. Makes dependencies explicit

### Implementation Phases

## Phase 1: Create Service Container (Foundation)

Create `/src/lib/server/shared/container/service-container.ts`:

```typescript
/**
 * Service Container for Dependency Injection
 *
 * Manages singleton instances of services and handles dependency injection.
 * Services are lazily instantiated on first access.
 */
class ServiceContainer {
  private static instances = new Map<string, any>();

  // Repositories
  static getAccountRepository() {
    if (!this.instances.has('AccountRepository')) {
      const { AccountRepository } = require('$lib/server/domains/accounts/repository');
      this.instances.set('AccountRepository', new AccountRepository());
    }
    return this.instances.get('AccountRepository');
  }

  static getTransactionRepository() {
    if (!this.instances.has('TransactionRepository')) {
      const { TransactionRepository } = require('$lib/server/domains/transactions/repository');
      this.instances.set('TransactionRepository', new TransactionRepository());
    }
    return this.instances.get('TransactionRepository');
  }

  // Services with dependencies
  static getTransactionService() {
    if (!this.instances.has('TransactionService')) {
      const { TransactionService } = require('$lib/server/domains/transactions/services');
      this.instances.set('TransactionService', new TransactionService(
        this.getTransactionRepository(),
        this.getPayeeService(),
        this.getCategoryService(),
        this.getBudgetTransactionService(),
        this.getBudgetCalculationService()
      ));
    }
    return this.instances.get('TransactionService');
  }

  // Clear instances (useful for testing)
  static clearAll() {
    this.instances.clear();
  }

  // Override instance (useful for testing)
  static override(key: string, instance: any) {
    this.instances.set(key, instance);
  }
}

export default ServiceContainer;
```

## Phase 2: Refactor Service Constructors

### Step 1: Update Constructor Signatures

**Before**:
```typescript
class PayeeService {
  constructor(
    private repository: PayeeRepository = new PayeeRepository()
  ) {
    this.intelligenceService = new PayeeIntelligenceService();
  }
}
```

**After**:
```typescript
class PayeeService {
  constructor(
    private repository: PayeeRepository,
    private intelligenceService: PayeeIntelligenceService,
    private learningService: CategoryLearningService,
    private mlCoordinator: PayeeMLCoordinator,
    private contactService: ContactManagementService,
    private subscriptionService: SubscriptionManagementService,
    private categoryService?: CategoryService,
    private budgetService?: BudgetService
  ) {}
}
```

### Step 2: Remove Service Instantiation from Methods

**Before**:
```typescript
async optimizePayeeBudgetAllocations() {
  const budgetService = new BudgetAllocationService(); // ❌
  // ...
}
```

**After**:
```typescript
class PayeeService {
  constructor(
    // ... other dependencies
    private budgetAllocationService: BudgetAllocationService
  ) {}

  async optimizePayeeBudgetAllocations() {
    // Use this.budgetAllocationService
  }
}
```

## Phase 3: Update tRPC Routes

**Before** (routes/transactions.ts):
```typescript
const transactionService = new TransactionService();

export const transactionRoutes = t.router({
  forAccount: publicProcedure.query(async ({input}) => {
    return await transactionService.getAccountTransactions(input.accountId);
  }),
});
```

**After**:
```typescript
import ServiceContainer from '$lib/server/shared/container/service-container';

export const transactionRoutes = t.router({
  forAccount: publicProcedure.query(async ({input}) => {
    const transactionService = ServiceContainer.getTransactionService();
    return await transactionService.getAccountTransactions(input.accountId);
  }),
});
```

## Phase 4: Enable Testing

With DI in place, we can now write unit tests:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { PayeeService } from './services';

describe('PayeeService', () => {
  let mockRepository;
  let mockIntelligenceService;
  let service;

  beforeEach(() => {
    mockRepository = {
      findAll: vi.fn().mockResolvedValue([]),
      // ... other mocks
    };

    mockIntelligenceService = {
      analyzeSpendingPatterns: vi.fn(),
    };

    service = new PayeeService(
      mockRepository,
      mockIntelligenceService,
      // ... other mocks
    );
  });

  it('should fetch all payees', async () => {
    await service.getAllPayees();
    expect(mockRepository.findAll).toHaveBeenCalled();
  });
});
```

## Implementation Order

### Priority 1: Core Services (Independent)
1. ✅ Repository classes (no dependencies)
2. CategoryService (minimal dependencies)
3. BudgetCalculationService

### Priority 2: Business Logic Services
4. TransactionService
5. AccountService
6. BudgetService

### Priority 3: Complex Services
7. PayeeService (many dependencies)
8. ScheduleService
9. MedicalExpenseService

### Priority 4: ML/Intelligence Services
10. PayeeIntelligenceService
11. CategoryLearningService
12. BudgetAllocationService
13. PayeeMLCoordinator

## Migration Strategy

### Option A: Big Bang (Risky)
- Refactor all services at once
- ❌ High risk of breaking everything
- ❌ Hard to debug if issues arise

### Option B: Gradual Migration (Recommended)
1. Create service container with backward compatibility
2. Refactor one service at a time
3. Update its consumers
4. Test thoroughly before moving to next
5. Keep old instantiation working during migration

### Backward Compatibility Pattern
```typescript
class PayeeService {
  constructor(
    repository?: PayeeRepository,
    intelligenceService?: PayeeIntelligenceService,
    // ... other optional params
  ) {
    // New DI pattern
    this.repository = repository ?? new PayeeRepository();
    this.intelligenceService = intelligenceService ?? new PayeeIntelligenceService();
  }
}
```

## Testing Strategy

1. **Unit Tests**: Mock all dependencies
2. **Integration Tests**: Use real services but test container
3. **E2E Tests**: Ensure tRPC routes still work

## Benefits After Completion

1. ✅ **Testable**: Can mock any dependency
2. ✅ **Loosely Coupled**: Services depend on interfaces, not implementations
3. ✅ **Memory Efficient**: Singleton services shared across requests
4. ✅ **Clear Dependencies**: Constructor shows all dependencies
5. ✅ **No Circular Dependencies**: Container resolves order
6. ✅ **Easy Mocking**: Just override in service container for tests

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Breaking existing code | Gradual migration with backward compatibility |
| Circular dependencies | Careful dependency graph analysis |
| Performance impact | Lazy instantiation + singleton pattern |
| Complex container code | Keep it simple, use TypeScript for type safety |

## Success Criteria

- [ ] Zero `new Service()` calls in service constructors
- [ ] All services accept dependencies via constructor
- [ ] Service container manages all service instances
- [ ] Can write unit tests with mocked dependencies
- [ ] All tRPC routes use service container
- [ ] No breaking changes to existing functionality
- [ ] TypeScript compilation passes
- [ ] All existing tests still pass

## Timeline Estimate

- Phase 1 (Service Container): 2 hours
- Phase 2 (Refactor 13 services): 6 hours
- Phase 3 (Update tRPC routes): 2 hours
- Phase 4 (Testing): 2 hours
- **Total**: ~12 hours of focused work

## Next Steps

1. Get approval for this approach
2. Create service container skeleton
3. Start with simplest service (CategoryService)
4. Verify pattern works
5. Continue with remaining services

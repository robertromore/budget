# Service Unit Tests

This directory contains unit tests for domain services using dependency injection and mocking.

## Test Files

- `account-service.test.ts` - AccountService tests (13 test cases)
- `transaction-service.test.ts` - TransactionService tests (12 test cases)
- `budget-service.test.ts` - BudgetService tests (12 test cases)
- `payee-service.test.ts` - PayeeService tests (13 test cases)

## Running Tests

From the `apps/budget` directory:

```bash
# Run all tests
bunx vitest run

# Run specific test file
bunx vitest run tests/unit/services/account-service.test.ts

# Run tests in watch mode
bunx vitest

# Run with coverage
bunx vitest run --coverage
```

## Test Structure

Each test file follows this pattern:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceName } from '$lib/server/domains/.../services';
import type { Dependencies } from '$lib/server/domains/.../...';

describe('ServiceName', () => {
  let mockDependency: Partial<DependencyType>;
  let service: ServiceName;

  beforeEach(() => {
    // Setup mocks
    mockDependency = {
      method: vi.fn(),
    };

    // Inject mocks
    service = new ServiceName(
      mockDependency as DependencyType
    );
  });

  describe('methodName', () => {
    it('should do something', async () => {
      // Arrange
      vi.mocked(mockDependency.method!).mockResolvedValue(result);

      // Act
      const result = await service.methodName();

      // Assert
      expect(mockDependency.method).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });
});
```

## Testing Patterns

### Mocking Dependencies

All dependencies are mocked using Vitest's `vi.fn()`:

```typescript
mockRepository = {
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
```

### Injecting Mocks

Services receive mocked dependencies through constructor injection:

```typescript
service = new AccountService(
  mockAccountRepository as AccountRepository,
  mockTransactionService as TransactionService
);
```

### Testing Happy Paths

```typescript
it('should create account successfully', async () => {
  const createData = { name: 'Test Account' };
  vi.mocked(mockRepository.create!).mockResolvedValue(mockAccount);

  const result = await service.createAccount(createData);

  expect(result).toEqual(mockAccount);
});
```

### Testing Error Cases

```typescript
it('should throw NotFoundError when not found', async () => {
  vi.mocked(mockRepository.findById!).mockResolvedValue(null);

  await expect(service.getById(999))
    .rejects
    .toThrow(NotFoundError);
});
```

## Test Coverage Goals

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 70%
- **Statements**: 80%

## Adding New Tests

When adding tests for a new service:

1. Create a new test file: `service-name.test.ts`
2. Import the service and its dependencies using absolute `$lib/` paths
3. Mock all dependencies in `beforeEach()`
4. Test happy paths, error cases, and edge cases
5. Follow the AAA pattern: Arrange, Act, Assert

## Notes

- All imports use absolute paths (`$lib/...`) instead of relative paths
- Tests are isolated - each test resets mocks in `beforeEach()`
- Use descriptive test names that explain what is being tested
- Test both successful operations and error conditions

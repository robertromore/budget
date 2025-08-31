# Integration Tests for Accounts Functionality

This directory contains comprehensive integration tests for the accounts functionality in the budget application.

## Test Structure

### `/setup/`
- **test-db.ts**: Database setup and teardown utilities for integration tests
- **vitest-setup.ts**: Global test configuration and environment setup

### `/trpc/`
- **accounts.test.ts**: Complete integration tests for all accounts tRPC routes
  - Tests all CRUD operations at the API level
  - Validates tRPC endpoint behavior with real database operations
  - Includes error handling and edge case testing

### `/navigation/`
- **accounts.test.ts**: Playwright tests for accounts page navigation
  - Tests navigation to accounts pages
  - Validates page loading and content display
  - Tests responsive and accessibility features

### `/crud/`
- **accounts.test.ts**: End-to-end CRUD operation tests using Playwright
  - Tests complete UI workflows for account management
  - Validates form interactions and user feedback
  - Tests error handling in the UI

### `/security/`
- **rate-limiting.test.ts**: Rate limiting integration tests
  - Tests rate limiting behavior across different endpoints
  - Validates rate limit reset functionality
  - Tests concurrent operation handling

### `/validation/`
- **accounts.test.ts**: Comprehensive validation and error scenario tests
  - Tests input validation rules
  - Security testing (XSS, SQL injection prevention)
  - Edge case and error handling validation

## Running Tests

### All Integration Tests
```bash
npm run test:integration
```

### Specific Account Tests
```bash
npm run test:accounts
```

### Individual Test Suites
```bash
# tRPC API tests
npx vitest run tests/integration/trpc/accounts.test.ts

# Navigation tests (requires Playwright)
npx playwright test tests/integration/navigation/accounts.test.ts

# CRUD UI tests (requires Playwright)
npx playwright test tests/integration/crud/accounts.test.ts

# Rate limiting tests
npx vitest run tests/integration/security/rate-limiting.test.ts

# Validation tests
npx vitest run tests/integration/validation/accounts.test.ts
```

### Watch Mode
```bash
npm run test:integration:watch
```

## Test Database

The integration tests use an in-memory SQLite database that is:
- Created fresh for each test suite
- Migrated with the latest schema
- Seeded with test data as needed
- Cleaned up automatically after each test

This ensures test isolation and prevents test interference.

## Test Coverage

The test suite covers:

### ✅ Navigation Tests
- [ ] Navigating to accounts page from main navigation
- [ ] Navigating to individual account pages
- [ ] Handling empty states and loading states
- [ ] Mobile and tablet responsive navigation
- [ ] Keyboard navigation and accessibility

### ✅ CRUD Operations
- [ ] **Create**: Account creation with validation
- [ ] **Read**: Loading account lists and individual accounts
- [ ] **Update**: Editing account details
- [ ] **Delete**: Soft deletion of accounts

### ✅ tRPC Endpoint Testing
- [ ] `accountRoutes.all()` - List all accounts
- [ ] `accountRoutes.load()` - Load single account
- [ ] `accountRoutes.save()` - Create/update account
- [ ] `accountRoutes.remove()` - Delete account

### ✅ Validation & Security
- [ ] Input validation (name, slug, notes)
- [ ] Rate limiting enforcement
- [ ] XSS prevention
- [ ] SQL injection prevention
- [ ] Error handling and user feedback

### ✅ Advanced Scenarios
- [ ] Concurrent operations
- [ ] Rate limit boundary testing
- [ ] Complex workflows (full CRUD lifecycle)
- [ ] Data integrity preservation
- [ ] Transaction rollback scenarios

## Prerequisites

1. **Bun**: Test database setup uses Bun SQLite
2. **Playwright**: For UI integration tests
3. **Vitest**: For unit and API integration tests

## Configuration

Tests use the following configuration files:
- `vitest.config.ts`: Vitest configuration
- `playwright.config.ts`: Playwright configuration
- `tests/integration/setup/vitest-setup.ts`: Test environment setup

## Best Practices

1. **Test Isolation**: Each test starts with a fresh database state
2. **Realistic Data**: Use meaningful test data that reflects real usage
3. **Error Testing**: Always test both happy path and error scenarios
4. **Performance**: Tests include rate limiting and concurrent operation testing
5. **Security**: Validate input sanitization and injection prevention
6. **Accessibility**: UI tests include keyboard navigation and screen reader support

## Troubleshooting

### Common Issues

1. **Database Connection Errors**: Ensure migrations are run and schema is up-to-date
2. **Playwright Timeouts**: Check that UI elements have proper test IDs
3. **Rate Limiting**: Use `vi.useFakeTimers()` for time-dependent tests
4. **Async Issues**: Ensure proper `await` usage for database operations

### Debug Mode

Run tests with debug output:
```bash
DEBUG=1 npm run test:integration
```

### Test Data Inspection

To inspect test database state during debugging:
```typescript
// In test file
console.log("Current accounts:", await caller.accountRoutes.all());
```
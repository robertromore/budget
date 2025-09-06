# Test Architecture

Dual-runtime testing approach leveraging Bun's speed for unit/integration tests and Playwright's browser capabilities.

[TOC]

## Test Scripts Overview

The project uses a dual-runtime testing approach to leverage the best performance and compatibility for different types of tests.

### Primary Test Commands

```bash
# Run all tests (Bun + Playwright)
bun test

# Fast Bun-native tests (API, logic, integration)
bun run test:bun                    # 209 tests in ~500ms
bun run test:bun:watch             # Watch mode for development

# Browser end-to-end tests with Playwright
bun run test:playwright            # E2E browser testing
bun run test:playwright:ui         # Interactive UI mode
bun run test:playwright:debug      # Debug mode
```

### Specific Test Suites

```bash
bun run test:unit                  # Unit tests only
bun run test:integration           # All integration tests
bun run test:accounts             # Account-specific tests
```

## Architecture Design

### Bun-Native Tests (`test:bun`)

**Runtime**: Bun with `bun:sqlite`  
**Performance**: ~500ms for 209 tests  
**Database**: In-memory Bun SQLite for maximum speed

**Coverage**:

- Unit tests ([`tests/unit/`](../tests/unit/))
- API integration ([`tests/integration/crud/`](../tests/integration/crud/), [`trpc/`](../tests/integration/trpc/), [`validation/`](../tests/integration/validation/))
- Security tests ([`tests/integration/security/`](../tests/integration/security/))

**Setup File**: [`tests/integration/setup/test-db.ts`](./tests/integration/setup/test-db.ts)

### Playwright Tests (`test:playwright`)

**Runtime**: Node.js with `better-sqlite3`  
**Performance**: Optimized for browser testing  
**Database**: Node.js-compatible SQLite for Playwright compatibility

**Coverage**:

- Navigation tests ([`tests/integration/navigation/`](../tests/integration/navigation/))
- UI component tests ([`tests/integration/views/`](../tests/integration/views/))
- End-to-end workflows

**Setup File**: [`tests/integration/setup/test-db-node.ts`](./tests/integration/setup/test-db-node.ts)

## Performance Comparison

| Test Type  | Runtime | Test Count | Execution Time | Database         |
| ---------- | ------- | ---------- | -------------- | ---------------- |
| Bun Native | Bun     | 209 tests  | ~500ms         | `bun:sqlite`     |
| Playwright | Node.js | ~50 tests  | ~30-60s        | `better-sqlite3` |

## Why This Architecture?

### Bun Advantages

- **Lightning Fast**: 500ms vs 30+ seconds for similar test coverage
- **Native SQLite**: Direct `bun:sqlite` integration
- **Modern Runtime**: Built-in TypeScript, fast imports
- **Memory Efficient**: In-memory databases with instant setup/teardown

### Playwright Advantages

- **Browser Testing**: Real browser automation
- **Visual Testing**: Screenshots, videos, traces
- **Cross-browser**: Chrome, Firefox, Safari support
- **Mature Ecosystem**: Rich assertion library, debugging tools

### Compatibility Considerations

- **Bun + Playwright**: Limited compatibility in 2024 (hangs, config issues)
- **Node.js + Playwright**: Stable, mature integration
- **Database Compatibility**: `bun:sqlite` vs `better-sqlite3` for runtime compatibility

## Development Workflow

```bash
# Development (fast feedback loop)
bun run test:bun:watch

# Pre-commit (comprehensive)
bun test

# CI/CD (full suite)
bun run test:bun && bun run test:playwright

# Debugging browser issues
bun run test:playwright:debug

# Interactive test development
bun run test:playwright:ui
```

## Performance Optimizations

### Bun Tests

- **In-memory SQLite databases**: Zero I/O overhead with `:memory:` databases
- **Parallel test execution**: Leverages Bun's built-in parallelization
- **Fast TypeScript compilation**: Native TypeScript support without transpilation
- **Optimized imports**: Fast ES module loading
- **Direct SQLite binding**: `bun:sqlite` provides native performance

### Playwright Tests

- **Parallel test execution**: `fullyParallel: true` in configuration
- **Optimized timeouts**: 30s test, 15s action, 10s expect timeouts
- **Server reuse**: `reuseExistingServer` in development mode
- **Conditional media**: Screenshots/videos captured only on failures
- **Headless execution**: Faster browser execution without UI overhead
- **Worker limitations**: Limited to 2 workers in CI for stability

## Test Organization Strategy

### File Naming Conventions

- **Unit tests**: `*.test.ts` in [`tests/unit/`](../tests/unit/)
- **Integration tests**: `*.test.ts` in appropriate [`tests/integration/`](../tests/integration/) subdirectories
- **Test utilities**: Non-test files in [`tests/integration/setup/`](../tests/integration/setup/)

### Directory Structure

```text
tests/
├── unit/                    # Fast Bun-native unit tests
│   ├── balance-calculation.test.ts
│   ├── current-account-state.test.ts
│   ├── trpc/security/       # tRPC security tests
│   └── utils/               # Utility function tests
├── integration/             # Integration and E2E tests
│   ├── crud/                # Database CRUD operations
│   ├── navigation/          # Playwright navigation tests
│   ├── security/            # Security and rate limiting
│   ├── setup/               # Test configuration files
│   ├── trpc/                # tRPC API integration tests
│   ├── validation/          # Input validation tests
│   └── views/               # UI component tests
└── test.ts                  # Test entry point
```

## Best Practices

1. **Use Bun tests for business logic** - API routes, utilities, calculations, data validation
2. **Use Playwright for user interactions** - Navigation, forms, UI components, visual testing
3. **Keep Playwright tests focused** - Test user journeys, not implementation details
4. **Leverage parallel execution** - Both runtimes support parallel test execution
5. **Monitor test performance** - Aim for <1s Bun tests, <60s Playwright suites
6. **Use descriptive test names** - Clear, action-oriented descriptions for better debugging
7. **Mock external dependencies** - Keep tests isolated and deterministic

## Configuration Files

- **Bun Tests**: Uses [`tests/integration/setup/test-db.ts`](./tests/integration/setup/test-db.ts) (`bun:sqlite`)
- **Playwright Tests**: Uses [`tests/integration/setup/test-db-node.ts`](./tests/integration/setup/test-db-node.ts) (`better-sqlite3`)
- **Playwright Config**: [`playwright.config.ts`](./playwright.config.ts) with performance optimizations

## Debugging Test Failures

### Bun Test Debugging

```bash
# Run specific test file with verbose output
bun test --verbose tests/integration/crud/accounts.test.ts

# Run specific test pattern
bun test tests/integration/crud --verbose

# Debug with Node.js inspector (if needed)
bun test --inspect tests/integration/crud/accounts.test.ts
```

### Playwright Test Debugging

```bash
# Interactive debugging with browser
bun run test:playwright:debug

# UI mode for test development
bun run test:playwright:ui

# Run specific test file
bunx playwright test tests/integration/navigation/accounts.test.ts

# Run tests in headed mode (visible browser)
bunx playwright test --headed

# Generate and view test report
bunx playwright show-report
```

## Continuous Integration

### CI Test Execution

The test suite runs in CI with the following workflow:

```bash
# Full test suite (runs in parallel)
bun run test:bun && bun run test:playwright
```

**CI Optimizations:**

- Parallel execution with limited workers (2 for Playwright)
- Retry failed tests (2 retries for Playwright)
- Headless browser execution
- Artifact collection on failures only

### Environment Variables

```bash
# CI environment detection
CI=true                    # Enables CI-specific optimizations

# Database configuration
TEST_DB_PATH=":memory:"    # Force in-memory database for tests

# Playwright browser configuration
PLAYWRIGHT_BROWSERS_PATH=0 # Use system browsers in CI
```

## Test Categories

### Unit Tests ([`tests/unit/`](../tests/unit/))

- Balance calculation safety
- Current account state management
- Utility function validation
- tRPC security testing

### Integration Tests ([`tests/integration/`](../tests/integration/))

- **CRUD**: Database operations ([`crud/`](../tests/integration/crud/))
- **tRPC**: API endpoint testing ([`trpc/`](../tests/integration/trpc/))
- **Validation**: Input validation and security ([`validation/`](../tests/integration/validation/))
- **Security**: Rate limiting and authentication ([`security/`](../tests/integration/security/))

### End-to-End Tests (Playwright)

- **Navigation**: Page routing and links ([`navigation/`](../tests/integration/navigation/))
- **Views**: Component rendering and interactions ([`views/`](../tests/integration/views/))
- **Workflows**: Complete user journeys

This architecture provides the best of both worlds: lightning-fast development feedback with comprehensive end-to-end coverage.

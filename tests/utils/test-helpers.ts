import { expect } from "vitest";
import type { MockedFunction } from "vitest";

export interface TestUser {
  id: number;
  name: string;
  email: string;
}

export interface TestAccount {
  id: number;
  name: string;
  type: string;
  balance: number;
}

export interface TestTransaction {
  id: number;
  accountId: number;
  amount: number;
  description: string;
  date: string;
}

/**
 * Test data factory for creating consistent test objects
 */
export class TestDataFactory {
  static createUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      ...overrides,
    };
  }

  static createAccount(overrides: Partial<TestAccount> = {}): TestAccount {
    return {
      id: 1,
      name: "Test Account",
      type: "checking",
      balance: 1000,
      ...overrides,
    };
  }

  static createTransaction(overrides: Partial<TestTransaction> = {}): TestTransaction {
    return {
      id: 1,
      accountId: 1,
      amount: -50,
      description: "Test Transaction",
      date: new Date().toISOString(),
      ...overrides,
    };
  }

  static createMultipleAccounts(count: number): TestAccount[] {
    return Array.from({ length: count }, (_, index) =>
      this.createAccount({
        id: index + 1,
        name: `Test Account ${index + 1}`,
        balance: (index + 1) * 1000,
      })
    );
  }

  static createMultipleTransactions(accountId: number, count: number): TestTransaction[] {
    return Array.from({ length: count }, (_, index) =>
      this.createTransaction({
        id: index + 1,
        accountId,
        amount: (index + 1) * -10,
        description: `Transaction ${index + 1}`,
      })
    );
  }
}

/**
 * Assertion helpers for common test patterns
 */
export class TestAssertions {
  /**
   * Assert that an array has specific length and all items match predicate
   */
  static expectArrayLength<T>(array: T[], expectedLength: number): void {
    expect(array).toHaveLength(expectedLength);
  }

  /**
   * Assert that all array items match a predicate
   */
  static expectAllItemsMatch<T>(
    array: T[],
    predicate: (item: T) => boolean,
    message?: string
  ): void {
    const failingItems = array.filter(item => !predicate(item));
    expect(failingItems, message || "Not all items match predicate").toHaveLength(0);
  }

  /**
   * Assert that an object has required properties
   */
  static expectObjectShape<T>(obj: T, expectedKeys: (keyof T)[]): void {
    expectedKeys.forEach(key => {
      expect(obj).toHaveProperty(String(key));
      expect(obj[key]).toBeDefined();
    });
  }

  /**
   * Assert that a number is within a range
   */
  static expectInRange(value: number, min: number, max: number): void {
    expect(value).toBeGreaterThanOrEqual(min);
    expect(value).toBeLessThanOrEqual(max);
  }

  /**
   * Assert that a date string is valid and recent
   */
  static expectValidRecentDate(dateStr: string, withinMinutes = 5): void {
    const date = new Date(dateStr);
    expect(date.toString()).not.toBe("Invalid Date");
    
    const now = new Date();
    const diffMs = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = diffMs / (1000 * 60);
    
    expect(diffMinutes).toBeLessThanOrEqual(withinMinutes);
  }

  /**
   * Assert that two objects are deeply equal excluding specific keys
   */
  static expectEqualExcluding<T extends Record<string, any>>(
    actual: T,
    expected: T,
    excludeKeys: (keyof T)[]
  ): void {
    const actualFiltered = { ...actual };
    const expectedFiltered = { ...expected };
    
    excludeKeys.forEach(key => {
      delete actualFiltered[key];
      delete expectedFiltered[key];
    });
    
    expect(actualFiltered).toEqual(expectedFiltered);
  }
}

/**
 * Mock helpers for common patterns
 */
export class TestMocks {
  /**
   * Create a mock function with specific return values for sequential calls
   */
  static createSequentialMock<T extends (...args: any[]) => any>(
    returnValues: ReturnType<T>[]
  ): MockedFunction<T> {
    const mockFn = vi.fn() as MockedFunction<T>;
    returnValues.forEach(value => mockFn.mockReturnValueOnce(value));
    return mockFn;
  }

  /**
   * Create a mock function that throws on specific call numbers
   */
  static createFailingMock<T extends (...args: any[]) => any>(
    successValue: ReturnType<T>,
    failOnCalls: number[],
    error: Error = new Error("Mock failure")
  ): MockedFunction<T> {
    const mockFn = vi.fn() as MockedFunction<T>;
    let callCount = 0;
    
    mockFn.mockImplementation(() => {
      callCount++;
      if (failOnCalls.includes(callCount)) {
        throw error;
      }
      return successValue;
    });
    
    return mockFn;
  }

  /**
   * Create a mock with async delay simulation
   */
  static createDelayedMock<T extends (...args: any[]) => Promise<any>>(
    returnValue: Awaited<ReturnType<T>>,
    delayMs = 100
  ): MockedFunction<T> {
    const mockFn = vi.fn() as MockedFunction<T>;
    mockFn.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return returnValue;
    });
    return mockFn;
  }
}

/**
 * Test environment helpers
 */
export class TestEnvironment {
  /**
   * Wait for a condition to be true with timeout
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeoutMs = 5000,
    intervalMs = 100
  ): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeoutMs) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    throw new Error(`Condition not met within ${timeoutMs}ms`);
  }

  /**
   * Wrap a test function with performance timing
   */
  static withTiming<T extends (...args: any[]) => any>(
    fn: T,
    maxExecutionMs = 1000
  ): T {
    return ((...args: Parameters<T>) => {
      const start = Date.now();
      const result = fn(...args);
      const duration = Date.now() - start;
      
      expect(duration, `Execution took ${duration}ms, expected < ${maxExecutionMs}ms`)
        .toBeLessThan(maxExecutionMs);
      
      return result;
    }) as T;
  }

  /**
   * Create isolated test context with cleanup
   */
  static createTestContext<T>(
    setup: () => T | Promise<T>,
    cleanup?: (context: T) => void | Promise<void>
  ): {
    beforeEach: () => Promise<T>;
    afterEach: () => Promise<void>;
  } {
    let context: T;
    
    return {
      beforeEach: async () => {
        context = await setup();
        return context;
      },
      afterEach: async () => {
        if (cleanup) {
          await cleanup(context);
        }
      }
    };
  }
}

/**
 * Database test helpers
 */
export class DatabaseTestHelpers {
  /**
   * Assert that a database record exists with specific properties
   */
  static async expectRecordExists<T>(
    findFn: () => Promise<T | null>,
    expectedProps: Partial<T>
  ): Promise<void> {
    const record = await findFn();
    expect(record).toBeTruthy();
    
    if (record) {
      Object.entries(expectedProps).forEach(([key, value]) => {
        expect((record as any)[key]).toEqual(value);
      });
    }
  }

  /**
   * Assert that a database record does not exist
   */
  static async expectRecordNotExists<T>(
    findFn: () => Promise<T | null>
  ): Promise<void> {
    const record = await findFn();
    expect(record).toBeNull();
  }

  /**
   * Clean up test data with transaction rollback pattern
   */
  static createTransactionContext<T>(
    beginTransaction: () => Promise<T>,
    rollback: (transaction: T) => Promise<void>
  ) {
    let transaction: T;
    
    return {
      beforeEach: async () => {
        transaction = await beginTransaction();
        return transaction;
      },
      afterEach: async () => {
        if (transaction) {
          await rollback(transaction);
        }
      }
    };
  }
}

/**
 * API test helpers for tRPC and HTTP endpoints
 */
export class APITestHelpers {
  /**
   * Assert API response structure and status
   */
  static expectAPISuccess<T>(response: { success: boolean; data?: T; error?: any }): T {
    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.error).toBeUndefined();
    return response.data!;
  }

  /**
   * Assert API error response
   */
  static expectAPIError(
    response: { success: boolean; data?: any; error?: any },
    expectedError?: string | RegExp
  ): void {
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    
    if (expectedError) {
      if (typeof expectedError === "string") {
        expect(response.error.message || response.error).toContain(expectedError);
      } else {
        expect(response.error.message || response.error).toMatch(expectedError);
      }
    }
  }

  /**
   * Test rate limiting behavior
   */
  static async testRateLimit<T>(
    apiCall: () => Promise<T>,
    maxRequests: number,
    windowMs: number
  ): Promise<void> {
    const promises = Array.from({ length: maxRequests + 1 }, () => apiCall());
    const results = await Promise.allSettled(promises);
    
    // First maxRequests should succeed
    results.slice(0, maxRequests).forEach((result, index) => {
      expect(result.status, `Request ${index + 1} should succeed`).toBe("fulfilled");
    });
    
    // Additional request should fail due to rate limiting
    const lastResult = results[maxRequests];
    expect(lastResult.status, "Rate limit should block extra request").toBe("rejected");
  }
}
import { describe, it, beforeEach } from "vitest";
import {
  TestDataFactory,
  TestAssertions,
  TestMocks,
  TestEnvironment,
  APITestHelpers,
  ComponentTestHelpers,
  expect,
} from "../utils";

describe("Advanced Test Patterns Examples", () => {
  describe("TestDataFactory", () => {
    it("should create consistent test data", () => {
      const user = TestDataFactory.createUser();
      const account = TestDataFactory.createAccount();
      const transactions = TestDataFactory.createMultipleTransactions(account.id, 3);

      TestAssertions.expectObjectShape(user, ["id", "name", "email"]);
      TestAssertions.expectObjectShape(account, ["id", "name", "type", "balance"]);
      TestAssertions.expectArrayLength(transactions, 3);
      TestAssertions.expectAllItemsMatch(
        transactions,
        (t) => t.accountId === account.id,
        "All transactions should belong to the account"
      );
    });

    it("should allow property overrides", () => {
      const customUser = TestDataFactory.createUser({
        name: "Custom Name",
        email: "custom@example.com",
      });

      expect(customUser.name).toBe("Custom Name");
      expect(customUser.email).toBe("custom@example.com");
      expect(customUser.id).toBe(1); // Default value preserved
    });
  });

  describe("TestAssertions", () => {
    it("should validate ranges and dates", () => {
      const balance = 1500;
      const dateStr = new Date().toISOString();

      TestAssertions.expectInRange(balance, 1000, 2000);
      TestAssertions.expectValidRecentDate(dateStr);
    });

    it("should compare objects excluding specific keys", () => {
      const obj1 = { id: 1, name: "Test", createdAt: "2023-01-01" };
      const obj2 = { id: 2, name: "Test", createdAt: "2023-01-02" };

      TestAssertions.expectEqualExcluding(obj1, obj2, ["id", "createdAt"]);
    });
  });

  describe("TestMocks", () => {
    it("should create sequential mocks", async () => {
      const mockFn = TestMocks.createSequentialMock([
        { success: true, data: "first" },
        { success: true, data: "second" },
        { success: false, error: "third call fails" },
      ]);

      const result1 = mockFn();
      const result2 = mockFn();
      const result3 = mockFn();

      expect(result1.data).toBe("first");
      expect(result2.data).toBe("second");
      expect(result3.error).toBe("third call fails");
    });

    it("should create failing mocks", () => {
      const mockFn = TestMocks.createFailingMock(
        { success: true },
        [2, 4], // Fail on 2nd and 4th calls
        new Error("Simulated failure")
      );

      expect(() => mockFn()).not.toThrow(); // 1st call succeeds
      expect(() => mockFn()).toThrow("Simulated failure"); // 2nd call fails
      expect(() => mockFn()).not.toThrow(); // 3rd call succeeds
      expect(() => mockFn()).toThrow("Simulated failure"); // 4th call fails
    });

    it("should create delayed mocks", async () => {
      const mockFn = TestMocks.createDelayedMock("delayed result", 50);

      const start = Date.now();
      const result = await mockFn();
      const duration = Date.now() - start;

      expect(result).toBe("delayed result");
      expect(duration).toBeGreaterThanOrEqual(45); // Allow for timing variance
    });
  });

  describe("TestEnvironment", () => {
    it("should wait for conditions", async () => {
      let counter = 0;
      const condition = () => {
        counter++;
        return counter >= 3;
      };

      await TestEnvironment.waitFor(condition, 1000, 10);
      expect(counter).toBeGreaterThanOrEqual(3);
    });

    it("should measure execution time", async () => {
      const fastFunction = () => {
        return Array.from({ length: 100 }, (_, i) => i * 2);
      };

      const result = TestEnvironment.withTiming(fastFunction, 50)();
      expect(result).toHaveLength(100);
    });

    it("should create isolated test context", async () => {
      const context = TestEnvironment.createTestContext(
        () => ({ data: "test", connections: [] }),
        (ctx) => {
          ctx.connections.length = 0; // Cleanup
        }
      );

      const testData = await context.beforeEach();
      expect(testData.data).toBe("test");

      await context.afterEach();
      // Cleanup would have run
    });
  });

  describe("APITestHelpers", () => {
    it("should validate API success responses", () => {
      const successResponse = {
        success: true,
        data: { id: 1, name: "Test Account" },
      };

      const data = APITestHelpers.expectAPISuccess(successResponse);
      expect(data.id).toBe(1);
      expect(data.name).toBe("Test Account");
    });

    it("should validate API error responses", () => {
      const errorResponse = {
        success: false,
        error: { message: "Invalid input data" },
      };

      APITestHelpers.expectAPIError(errorResponse, "Invalid input");
    });

    it("should test rate limiting", async () => {
      let requestCount = 0;
      const mockAPICall = async () => {
        requestCount++;
        if (requestCount > 3) {
          throw new Error("Rate limit exceeded");
        }
        return { success: true };
      };

      await APITestHelpers.testRateLimit(mockAPICall, 3, 1000);
      expect(requestCount).toBe(4); // 3 successful + 1 rate limited
    });
  });

  describe("ComponentTestHelpers", () => {
    it("should create mock stores", async () => {
      const store = ComponentTestHelpers.createMockStore({ count: 0 });
      const values: number[] = [];

      const unsubscribe = store.subscribe((value) => {
        values.push(value.count);
      });

      store.update((current) => ({ count: current.count + 1 }));
      store.set({ count: 5 });

      expect(values).toEqual([0, 1, 5]); // Initial, update, set
      unsubscribe();
    });

    it("should create event capture helpers", () => {
      const eventCapture = ComponentTestHelpers.createEventCapture<string>();

      eventCapture.handler("first event");
      eventCapture.handler("second event");

      expect(eventCapture.getEvents()).toEqual(["first event", "second event"]);
      expect(eventCapture.getLastEvent()).toBe("second event");

      eventCapture.clear();
      expect(eventCapture.getEvents()).toHaveLength(0);
    });

    it("should test form validation", async () => {
      const validData = { name: "Test", email: "test@example.com" };
      const invalidCases = [
        { field: "name" as const, value: "", expectedError: "Name is required" },
        { field: "email" as const, value: "invalid", expectedError: "Invalid email" },
      ];

      const formHelper = ComponentTestHelpers.createFormTestHelper(
        validData,
        invalidCases
      );

      const mockSubmit = async (data: typeof validData) => {
        if (!data.name) return { success: false, error: { message: "Name is required" } };
        if (!data.email.includes("@")) return { success: false, error: { message: "Invalid email" } };
        return { success: true };
      };

      await formHelper.testValidSubmission(mockSubmit);
      await formHelper.testInvalidSubmissions(mockSubmit);
    });

    it("should mock intersection observer", () => {
      const { mockIntersect, restore } = ComponentTestHelpers.mockIntersectionObserver();

      const mockElement = document.createElement("div");
      const observer = new IntersectionObserver(() => {});

      expect(observer.observe).toBeDefined();
      
      // Simulate intersection
      mockIntersect([{ target: mockElement, isIntersecting: true }]);

      restore();
    });

    it("should test data table helpers", () => {
      const data = [
        { id: 1, name: "Alice", age: 30 },
        { id: 2, name: "Bob", age: 25 },
        { id: 3, name: "Charlie", age: 35 },
      ];

      const tableHelper = ComponentTestHelpers.createDataTableTestHelper<typeof data[0]>();

      // Test sorting
      const sortFn = (items: typeof data, column: keyof typeof data[0], direction: "asc" | "desc") => {
        return [...items].sort((a, b) => {
          const aVal = a[column];
          const bVal = b[column];
          const compare = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return direction === "asc" ? compare : -compare;
        });
      };

      tableHelper.testSorting(data, sortFn, "age");

      // Test filtering
      const filterFn = (items: typeof data, query: string) => {
        return items.filter(item => 
          item.name.toLowerCase().includes(query.toLowerCase())
        );
      };

      tableHelper.testFiltering(data, filterFn, "a", 2); // Alice and Charlie

      // Test pagination
      const paginateFn = (items: typeof data, page: number, pageSize: number) => {
        const start = (page - 1) * pageSize;
        return items.slice(start, start + pageSize);
      };

      tableHelper.testPagination(data, paginateFn, 1, 2);
    });

    it("should measure render performance", async () => {
      const simulatedRender = async () => {
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 10));
        return { rendered: true };
      };

      const result = await ComponentTestHelpers.measureRenderTime(simulatedRender, 50);
      expect(result.rendered).toBe(true);
    });
  });

  describe("Integration Example", () => {
    let testContext: {
      accounts: ReturnType<typeof TestDataFactory.createAccount>[];
      mockAPI: ReturnType<typeof TestMocks.createSequentialMock>;
    };

    beforeEach(() => {
      const accounts = TestDataFactory.createMultipleAccounts(3);
      const mockAPI = TestMocks.createSequentialMock([
        { success: true, data: accounts },
        { success: true, data: accounts[0] },
      ]);

      testContext = { accounts, mockAPI };
    });

    it("should demonstrate integrated testing pattern", async () => {
      const { accounts, mockAPI } = testContext;

      // Test data structure
      TestAssertions.expectArrayLength(accounts, 3);
      TestAssertions.expectAllItemsMatch(
        accounts,
        (account) => account.balance > 0,
        "All accounts should have positive balance"
      );

      // Test API interactions
      const listResponse = mockAPI();
      const accountData = APITestHelpers.expectAPISuccess(listResponse);
      expect(accountData).toEqual(accounts);

      const detailResponse = mockAPI();
      const singleAccount = APITestHelpers.expectAPISuccess(detailResponse);
      expect(singleAccount).toEqual(accounts[0]);

      // Test component state
      const store = ComponentTestHelpers.createMockStore({ selectedAccount: null });
      store.set({ selectedAccount: singleAccount });

      expect(store.get().selectedAccount).toEqual(accounts[0]);
    });
  });
});
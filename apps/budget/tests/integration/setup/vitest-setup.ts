import {beforeAll, afterAll} from "vitest";

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = ":memory:";
  process.env.DATABASE_LOG_QUERIES = "false";

  // Any global setup that needs to run before all tests
  console.log("🧪 Setting up test environment...");
});

afterAll(async () => {
  // Global cleanup
  console.log("🧹 Cleaning up test environment...");
});

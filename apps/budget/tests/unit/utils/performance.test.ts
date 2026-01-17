import {describe, test, expect, beforeEach, afterEach} from "vitest";
import {
  perfMonitor,
  measureRender,
  trackQuery,
  generatePerformanceReport,
  WebVitalsMonitor,
} from "../../../src/lib/utils/performance";

describe("Performance Monitoring Tests", () => {
  beforeEach(() => {
    perfMonitor.clear();
  });

  afterEach(() => {
    perfMonitor.clear();
  });

  describe("Performance Monitor Basic Operations", () => {
    test("should record metrics", () => {
      const metricName = "test-metric";
      const metricValue = 123.45;

      perfMonitor.recordMetric(metricName, metricValue);

      const metrics = perfMonitor.getMetrics(metricName);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe(metricName);
      expect(metrics[0].value).toBe(metricValue);
      expect(metrics[0].timestamp).toBeGreaterThan(0);
    });

    test("should handle timer operations", () => {
      const timerName = "test-timer";

      perfMonitor.startTimer(timerName);

      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Busy wait for ~10ms
      }

      const duration = perfMonitor.endTimer(timerName);

      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should be reasonable

      const metrics = perfMonitor.getMetrics(timerName);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(duration);
    });

    test("should handle timer without start", () => {
      // Console warning is expected, but shouldn't throw
      const duration = perfMonitor.endTimer("non-existent-timer");
      expect(duration).toBe(0);
    });

    test("should record metrics with tags", () => {
      const metricName = "tagged-metric";
      const tags = {component: "test", type: "render"};

      perfMonitor.recordMetric(metricName, 100, tags);

      const metrics = perfMonitor.getMetrics(metricName);
      expect(metrics[0].tags).toEqual(tags);
    });
  });

  describe("Performance Statistics", () => {
    test("should calculate statistics correctly", () => {
      const metricName = "stat-test";
      const values = [10, 20, 30, 40, 50];

      values.forEach((value) => {
        perfMonitor.recordMetric(metricName, value);
      });

      const stats = perfMonitor.getStats(metricName);

      expect(stats.count).toBe(5);
      expect(stats.avg).toBe(30);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
      expect(stats.p50).toBe(30);
    });

    test("should handle empty metrics for statistics", () => {
      const stats = perfMonitor.getStats("non-existent-metric");

      expect(stats.count).toBe(0);
      expect(stats.avg).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
    });

    test("should calculate percentiles correctly", () => {
      const metricName = "percentile-test";

      // Add 100 values (1-100) for predictable percentiles
      for (let i = 1; i <= 100; i++) {
        perfMonitor.recordMetric(metricName, i);
      }

      const stats = perfMonitor.getStats(metricName);

      // Allow for slight variation in percentile calculations due to array indexing
      expect(stats.p50).toBeGreaterThanOrEqual(49);
      expect(stats.p50).toBeLessThanOrEqual(51);
      expect(stats.p95).toBeGreaterThanOrEqual(94);
      expect(stats.p95).toBeLessThanOrEqual(96);
      expect(stats.p99).toBeGreaterThanOrEqual(98);
      expect(stats.p99).toBeLessThanOrEqual(100);
    });
  });

  describe("Query Performance Tracking", () => {
    test("should track successful queries", async () => {
      const queryName = "test-query";
      const expectedResult = {id: 1, name: "Test"};

      const mockQuery = async () => {
        // Simulate async work
        await new Promise((resolve) => setTimeout(resolve, 10));
        return expectedResult;
      };

      const result = await trackQuery(queryName, mockQuery);

      expect(result).toEqual(expectedResult);

      const metrics = perfMonitor.getMetrics(`db.query.${queryName}`);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBeGreaterThan(0);
      expect(metrics[0].tags?.type).toBe("database");
      expect(metrics[0].tags?.query).toBe(queryName);
    });

    test("should track failed queries", async () => {
      const queryName = "failing-query";
      const expectedError = new Error("Query failed");

      const mockQuery = async () => {
        // Simulate async work before failing
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw expectedError;
      };

      await expect(trackQuery(queryName, mockQuery)).rejects.toThrow("Query failed");

      const metrics = perfMonitor.getMetrics(`db.query.${queryName}.error`);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBeGreaterThan(0);
      expect(metrics[0].tags?.error).toBe("true");
    });
  });

  describe("Render Performance Measurement", () => {
    test("should measure render times", () => {
      const componentName = "TestComponent";
      let renderExecuted = false;

      const mockRender = () => {
        // Simulate render work
        const start = Date.now();
        while (Date.now() - start < 5) {
          // Busy wait for ~5ms
        }
        renderExecuted = true;
      };

      const duration = measureRender(componentName, mockRender);

      expect(renderExecuted).toBe(true);
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000);

      const metrics = perfMonitor.getMetrics(`render.${componentName}`);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].tags?.type).toBe("render");
      expect(metrics[0].tags?.component).toBe(componentName);
    });
  });

  describe("Performance Report Generation", () => {
    test("should generate comprehensive performance report", () => {
      // Add various types of metrics
      perfMonitor.recordMetric("db.query.users", 50);
      perfMonitor.recordMetric("db.query.accounts", 75);
      perfMonitor.recordMetric("render.UserList", 25);
      perfMonitor.recordMetric("render.AccountTable", 100);
      perfMonitor.recordMetric("web-vitals.lcp", 1500);
      perfMonitor.recordMetric("web-vitals.fid", 20);

      const report = generatePerformanceReport();

      expect(report.summary).toBeDefined();
      expect(report.queries).toBeDefined();
      expect(report.renders).toBeDefined();
      expect(report.webVitals).toBeDefined();

      expect(report.queries.slowest).toHaveLength(2);
      expect(report.renders.slowest).toHaveLength(2);

      // Slowest query should be accounts (75ms)
      expect(report.queries.slowest[0].value).toBe(75);
      // Slowest render should be AccountTable (100ms)
      expect(report.renders.slowest[0].value).toBe(100);
    });

    test("should handle empty report generation", () => {
      const report = generatePerformanceReport();

      expect(report.summary.count).toBe(0);
      expect(report.queries.slowest).toHaveLength(0);
      expect(report.renders.slowest).toHaveLength(0);
    });
  });

  describe("Web Vitals Monitor", () => {
    test("should initialize Web Vitals monitor", () => {
      const monitor = new WebVitalsMonitor();

      // Can't easily test PerformanceObserver in unit tests,
      // but we can verify the class initializes
      expect(monitor).toBeInstanceOf(WebVitalsMonitor);
      expect(typeof monitor.measure).toBe("function");
      expect(typeof monitor.getVitals).toBe("function");
    });

    test("should return empty vitals initially", () => {
      const monitor = new WebVitalsMonitor();
      const vitals = monitor.getVitals();

      expect(typeof vitals).toBe("object");
      expect(Object.keys(vitals)).toHaveLength(0);
    });
  });

  describe("Metric Limits and Cleanup", () => {
    test("should respect metric limits", () => {
      // This would require access to the internal maxMetrics limit
      // For now, just test that we can add many metrics without issues

      for (let i = 0; i < 100; i++) {
        perfMonitor.recordMetric(`metric-${i}`, i);
      }

      const allMetrics = perfMonitor.getMetrics();
      expect(allMetrics.length).toBe(100);
    });

    test("should clear all metrics and timers", () => {
      perfMonitor.recordMetric("test-metric", 123);
      perfMonitor.startTimer("test-timer");

      expect(perfMonitor.getMetrics()).toHaveLength(1);

      perfMonitor.clear();

      expect(perfMonitor.getMetrics()).toHaveLength(0);

      // Timer should be cleared too (won't throw warning)
      const duration = perfMonitor.endTimer("test-timer");
      expect(duration).toBe(0);
    });
  });

  describe("Metric Filtering and Querying", () => {
    test("should filter metrics by name", () => {
      perfMonitor.recordMetric("metric.a", 10);
      perfMonitor.recordMetric("metric.b", 20);
      perfMonitor.recordMetric("metric.a", 30);

      const allMetrics = perfMonitor.getMetrics();
      const filteredMetrics = perfMonitor.getMetrics("metric.a");

      expect(allMetrics).toHaveLength(3);
      expect(filteredMetrics).toHaveLength(2);
      expect(filteredMetrics.every((m) => m.name === "metric.a")).toBe(true);
    });

    test("should respect limit parameter", () => {
      for (let i = 0; i < 50; i++) {
        perfMonitor.recordMetric("limited-metric", i);
      }

      const limitedMetrics = perfMonitor.getMetrics("limited-metric", 10);
      expect(limitedMetrics).toHaveLength(10);

      // Should get the most recent 10 metrics
      expect(limitedMetrics[0].value).toBe(40); // Most recent
      expect(limitedMetrics[9].value).toBe(49); // Oldest of the 10
    });
  });
});

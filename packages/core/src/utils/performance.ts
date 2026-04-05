// Performance monitoring and optimization utilities
// Server-safe subset — browser-only features (WebVitalsMonitor, measureRender)
// remain in apps/budget/src/lib/utils/performance.ts

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string> | undefined;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 1000;
  private timers = new Map<string, number>();

  // Start timing an operation
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  // End timing and record the metric
  endTimer(name: string, tags?: Record<string, string>): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer '${name}' was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    this.recordMetric(name, duration, tags);
    return duration;
  }

  // Record a custom metric
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    // Remove oldest metrics if we're at capacity
    if (this.metrics.length >= this.maxMetrics) {
      this.metrics.shift();
    }

    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      tags,
    });
  }

  // Get recent metrics
  getMetrics(name?: string, limit: number = 100): PerformanceMetric[] {
    let filteredMetrics = this.metrics;

    if (name) {
      filteredMetrics = this.metrics.filter((m) => m.name === name);
    }

    return filteredMetrics.slice(-limit);
  }

  // Get performance statistics
  getStats(name?: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const metrics = name ? this.metrics.filter((m) => m.name === name) : this.metrics;

    if (metrics.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    }

    const values = metrics.map((m) => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count,
      avg: sum / count,
      min: values[0] ?? 0,
      max: values[count - 1] ?? 0,
      p50: values[Math.floor(count * 0.5)] ?? 0,
      p95: values[Math.floor(count * 0.95)] ?? 0,
      p99: values[Math.floor(count * 0.99)] ?? 0,
    };
  }

  // Clear all metrics
  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }
}

// Global performance monitor instance
export const perfMonitor = new PerformanceMonitor();

// Decorator for timing functions
export function timed(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const timerName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      perfMonitor.startTimer(timerName);
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } finally {
        perfMonitor.endTimer(timerName);
      }
    };

    return descriptor;
  };
}

// Database query performance tracking
export function trackQuery<T>(queryName: string, queryFn: () => Promise<T>): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = performance.now();

    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;

      perfMonitor.recordMetric(`db.query.${queryName}`, duration, {
        type: "database",
        query: queryName,
      });

      resolve(result);
    } catch (error) {
      const duration = performance.now() - startTime;

      perfMonitor.recordMetric(`db.query.${queryName}.error`, duration, {
        type: "database",
        query: queryName,
        error: "true",
      });

      reject(error);
    }
  });
}

// Performance report generator
export function generatePerformanceReport(): {
  summary: any;
  queries: any;
  renders: any;
  webVitals: any;
} {
  const allMetrics = perfMonitor.getMetrics();

  return {
    summary: perfMonitor.getStats(),
    queries: {
      stats: perfMonitor.getStats("db.query"),
      slowest: perfMonitor
        .getMetrics()
        .filter((m) => m.name.startsWith("db.query"))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
    },
    renders: {
      stats: perfMonitor.getStats("render"),
      slowest: perfMonitor
        .getMetrics()
        .filter((m) => m.name.startsWith("render"))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
    },
    webVitals: perfMonitor
      .getMetrics()
      .filter((m) => m.name.startsWith("web-vitals"))
      .reduce(
        (acc, metric) => {
          acc[metric.name] = metric.value;
          return acc;
        },
        {} as Record<string, number>
      ),
  };
}

import { describe, it, expect } from "bun:test";
import { CalendarDate } from "@internationalized/date";
import { nextMonthly } from "./date-frequency";

describe("nextMonthly", () => {
  describe("Specific day of month pattern", () => {
    it("should generate monthly dates on the 15th", () => {
      const start = new CalendarDate(2024, 1, 1);
      const end = new CalendarDate(2024, 6, 30);
      const result = nextMonthly(start, end, 1, [15], [], [], 5);

      expect(result).toHaveLength(5);
      expect(result[0].toString()).toBe("2024-01-15");
      expect(result[1].toString()).toBe("2024-02-15");
      expect(result[2].toString()).toBe("2024-03-15");
      expect(result[3].toString()).toBe("2024-04-15");
      expect(result[4].toString()).toBe("2024-05-15");
    });

    it("should handle multiple days of month", () => {
      const start = new CalendarDate(2024, 1, 1);
      const end = new CalendarDate(2024, 3, 31);
      const result = nextMonthly(start, end, 1, [1, 15], [], [], 6);

      expect(result).toHaveLength(6);
      expect(result[0].toString()).toBe("2024-01-01");
      expect(result[1].toString()).toBe("2024-01-15");
      expect(result[2].toString()).toBe("2024-02-01");
      expect(result[3].toString()).toBe("2024-02-15");
      expect(result[4].toString()).toBe("2024-03-01");
      expect(result[5].toString()).toBe("2024-03-15");
    });

    it("should handle every 2 months interval", () => {
      const start = new CalendarDate(2024, 1, 1);
      const end = new CalendarDate(2024, 12, 31);
      const result = nextMonthly(start, end, 2, [10], [], [], 6);

      expect(result).toHaveLength(6);
      expect(result[0].toString()).toBe("2024-01-10");
      expect(result[1].toString()).toBe("2024-03-10");
      expect(result[2].toString()).toBe("2024-05-10");
      expect(result[3].toString()).toBe("2024-07-10");
      expect(result[4].toString()).toBe("2024-09-10");
      expect(result[5].toString()).toBe("2024-11-10");
    });

    it("should handle invalid days gracefully (Feb 30th)", () => {
      const start = new CalendarDate(2024, 1, 1);
      const end = new CalendarDate(2024, 4, 30);
      const result = nextMonthly(start, end, 1, [30], [], [], 4);

      // Should get Jan 30, Feb 29 (adjusted), Mar 30, Apr 30
      expect(result).toHaveLength(4);
      expect(result[0].toString()).toBe("2024-01-30");
      expect(result[1].toString()).toBe("2024-02-29");
      expect(result[2].toString()).toBe("2024-03-30");
      expect(result[3].toString()).toBe("2024-04-30");
    });

    it("should handle leap year February", () => {
      const start = new CalendarDate(2024, 1, 1); // 2024 is leap year
      const end = new CalendarDate(2024, 4, 30);
      const result = nextMonthly(start, end, 1, [29], [], [], 4);

      expect(result).toHaveLength(4);
      expect(result[0].toString()).toBe("2024-01-29");
      expect(result[1].toString()).toBe("2024-02-29"); // Leap year allows Feb 29
      expect(result[2].toString()).toBe("2024-03-29");
      expect(result[3].toString()).toBe("2024-04-29");
    });
  });

  describe("Nth weekday pattern", () => {
    it("should find first Monday of each month", () => {
      const start = new CalendarDate(2024, 1, 1);
      const end = new CalendarDate(2024, 4, 30);
      const result = nextMonthly(start, end, 1, null, [1], [1], 4); // 1st week, Monday

      expect(result).toHaveLength(4);
      expect(result[0].toString()).toBe("2024-01-01"); // Jan 1 is Monday
      expect(result[1].toString()).toBe("2024-02-05"); // First Monday of Feb
      expect(result[2].toString()).toBe("2024-03-04"); // First Monday of Mar
      expect(result[3].toString()).toBe("2024-04-01"); // First Monday of Apr
    });

    it("should find second Tuesday of each month", () => {
      const start = new CalendarDate(2024, 1, 1);
      const end = new CalendarDate(2024, 4, 30);
      const result = nextMonthly(start, end, 1, null, [2], [2], 4); // 2nd week, Tuesday

      expect(result).toHaveLength(4);
      expect(result[0].toString()).toBe("2024-01-09");
      expect(result[1].toString()).toBe("2024-02-13");
      expect(result[2].toString()).toBe("2024-03-12");
      expect(result[3].toString()).toBe("2024-04-09");
    });

    it("should find last Friday of each month", () => {
      const start = new CalendarDate(2024, 1, 1);
      const end = new CalendarDate(2024, 4, 30);
      const result = nextMonthly(start, end, 1, null, [5], [5], 4); // Last week, Friday

      expect(result).toHaveLength(4);
      expect(result[0].toString()).toBe("2024-01-26");
      expect(result[1].toString()).toBe("2024-02-23");
      expect(result[2].toString()).toBe("2024-03-29");
      expect(result[3].toString()).toBe("2024-04-26");
    });

    it("should handle multiple weeks and weekdays", () => {
      const start = new CalendarDate(2024, 1, 1);
      const end = new CalendarDate(2024, 2, 29);
      // First and third Monday and Wednesday
      const result = nextMonthly(start, end, 1, null, [1, 3], [1, 3], 8);

      expect(result).toHaveLength(8);
      // January: 1st Mon (1st), 1st Wed (3rd), 3rd Mon (15th), 3rd Wed (17th)
      expect(result[0].toString()).toBe("2024-01-01");
      expect(result[1].toString()).toBe("2024-01-03");
      expect(result[2].toString()).toBe("2024-01-15");
      expect(result[3].toString()).toBe("2024-01-17");
      // February: 1st Mon (5th), 1st Wed (7th), 3rd Mon (19th), 3rd Wed (21st)
      expect(result[4].toString()).toBe("2024-02-05");
      expect(result[5].toString()).toBe("2024-02-07");
      expect(result[6].toString()).toBe("2024-02-19");
      expect(result[7].toString()).toBe("2024-02-21");
    });

    it("should handle every 3 months with nth weekday", () => {
      const start = new CalendarDate(2024, 1, 1);
      const end = new CalendarDate(2024, 12, 31);
      const result = nextMonthly(start, end, 3, null, [2], [4], 4); // Every 3 months, 2nd Thursday

      expect(result).toHaveLength(4);
      expect(result[0].toString()).toBe("2024-01-11"); // 2nd Thursday of Jan
      expect(result[1].toString()).toBe("2024-04-11"); // 2nd Thursday of Apr
      expect(result[2].toString()).toBe("2024-07-11"); // 2nd Thursday of Jul
      expect(result[3].toString()).toBe("2024-10-10"); // 2nd Thursday of Oct
    });

    it("should handle 4th occurrence that might not exist", () => {
      const start = new CalendarDate(2024, 2, 1);
      const end = new CalendarDate(2024, 2, 29);
      // Try to find 4th Saturday of February 2024
      const result = nextMonthly(start, end, 1, null, [4], [6], 1);

      // February 2024 has 4 Saturdays: 3rd, 10th, 17th, 24th
      expect(result).toHaveLength(1);
      expect(result[0].toString()).toBe("2024-02-24");
    });

    it("should handle 5th occurrence that doesn't exist", () => {
      const start = new CalendarDate(2024, 2, 1);
      const end = new CalendarDate(2024, 2, 29);
      // Try to find 5th Monday of February 2024 (doesn't exist)
      const result = nextMonthly(start, end, 1, null, [5], [1], 1);

      // Should be last Monday since week 5 means "last"
      expect(result).toHaveLength(1);
      expect(result[0].toString()).toBe("2024-02-26"); // Last Monday of Feb 2024
    });
  });

  describe("Fallback pattern (same day as start)", () => {
    it("should use start day when no specific pattern given", () => {
      const start = new CalendarDate(2024, 1, 15);
      const end = new CalendarDate(2024, 4, 30);
      const result = nextMonthly(start, end, 1, null, [], [], 4);

      expect(result).toHaveLength(4);
      expect(result[0].toString()).toBe("2024-01-15");
      expect(result[1].toString()).toBe("2024-02-15");
      expect(result[2].toString()).toBe("2024-03-15");
      expect(result[3].toString()).toBe("2024-04-15");
    });

    it("should handle fallback with invalid start day", () => {
      const start = new CalendarDate(2024, 1, 31);
      const end = new CalendarDate(2024, 4, 30);
      const result = nextMonthly(start, end, 1, null, [], [], 4);

      // Should get Jan 31, Feb 29 (adjusted), Mar 31, Apr 30 (adjusted)
      expect(result).toHaveLength(4);
      expect(result[0].toString()).toBe("2024-01-31");
      expect(result[1].toString()).toBe("2024-02-29");
      expect(result[2].toString()).toBe("2024-03-31");
      expect(result[3].toString()).toBe("2024-04-30");
    });
  });

  describe("Date range filtering", () => {
    it("should only return dates within the specified range", () => {
      const start = new CalendarDate(2024, 1, 15);
      const end = new CalendarDate(2024, 2, 20);
      const result = nextMonthly(start, end, 1, [15], [], [], 5);

      // Should only get Jan 15 and Feb 15 (within range)
      expect(result).toHaveLength(2);
      expect(result[0].toString()).toBe("2024-01-15");
      expect(result[1].toString()).toBe("2024-02-15");
    });

    it("should respect start date when it's later than first occurrence", () => {
      const start = new CalendarDate(2024, 1, 20);
      const end = new CalendarDate(2024, 4, 30);
      const result = nextMonthly(start, end, 1, [15], [], [], 5);

      // Should skip Jan 15 (before start date)
      expect(result).toHaveLength(3);
      expect(result[0].toString()).toBe("2024-02-15");
      expect(result[1].toString()).toBe("2024-03-15");
      expect(result[2].toString()).toBe("2024-04-15");
    });
  });

  describe("Limit handling", () => {
    it("should respect the limit parameter", () => {
      const start = new CalendarDate(2024, 1, 1);
      const end = new CalendarDate(2024, 12, 31);
      const result = nextMonthly(start, end, 1, [15], [], [], 3);

      expect(result).toHaveLength(3);
      expect(result[0].toString()).toBe("2024-01-15");
      expect(result[1].toString()).toBe("2024-02-15");
      expect(result[2].toString()).toBe("2024-03-15");
    });

    it("should handle limit of 0", () => {
      const start = new CalendarDate(2024, 1, 1);
      const end = new CalendarDate(2024, 12, 31);
      const result = nextMonthly(start, end, 1, [15], [], [], 0);

      expect(result).toHaveLength(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle start date after end date", () => {
      const start = new CalendarDate(2024, 6, 1);
      const end = new CalendarDate(2024, 1, 31);
      const result = nextMonthly(start, end, 1, [15], [], [], 5);

      expect(result).toHaveLength(0);
    });

    it("should handle same start and end month", () => {
      const start = new CalendarDate(2024, 1, 1);
      const end = new CalendarDate(2024, 1, 31);
      const result = nextMonthly(start, end, 1, [15, 25], [], [], 5);

      expect(result).toHaveLength(2);
      expect(result[0].toString()).toBe("2024-01-15");
      expect(result[1].toString()).toBe("2024-01-25");
    });

    it("should handle year boundary crossing", () => {
      const start = new CalendarDate(2024, 11, 1);
      const end = new CalendarDate(2025, 2, 28);
      const result = nextMonthly(start, end, 1, [15], [], [], 4);

      expect(result).toHaveLength(4);
      expect(result[0].toString()).toBe("2024-11-15");
      expect(result[1].toString()).toBe("2024-12-15");
      expect(result[2].toString()).toBe("2025-01-15");
      expect(result[3].toString()).toBe("2025-02-15");
    });

    it("should sort results chronologically", () => {
      const start = new CalendarDate(2024, 1, 1);
      const end = new CalendarDate(2024, 2, 29);
      // Multiple days in reverse order
      const result = nextMonthly(start, end, 1, [25, 5, 15], [], [], 6);

      expect(result).toHaveLength(6);
      expect(result[0].toString()).toBe("2024-01-05");
      expect(result[1].toString()).toBe("2024-01-15");
      expect(result[2].toString()).toBe("2024-01-25");
      expect(result[3].toString()).toBe("2024-02-05");
      expect(result[4].toString()).toBe("2024-02-15");
      expect(result[5].toString()).toBe("2024-02-25");
    });
  });
});

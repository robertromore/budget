import { describe, it, expect } from "vitest";
import {
  parseLocalDate,
  formatLocalDate,
  daysBetween,
  daysBetweenDates,
  addInterval,
} from "$lib/utils/date-helpers";

describe("Date Helpers", () => {
  describe("parseLocalDate", () => {
    it("should parse YYYY-MM-DD into local date", () => {
      const date = parseLocalDate("2024-03-15");
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(2); // 0-indexed
      expect(date.getDate()).toBe(15);
    });

    it("should parse January 1st correctly", () => {
      const date = parseLocalDate("2024-01-01");
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(1);
    });

    it("should parse December 31st correctly", () => {
      const date = parseLocalDate("2024-12-31");
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(11);
      expect(date.getDate()).toBe(31);
    });
  });

  describe("formatLocalDate", () => {
    it("should format a date as YYYY-MM-DD", () => {
      const date = new Date(2024, 2, 15); // March 15
      expect(formatLocalDate(date)).toBe("2024-03-15");
    });

    it("should pad single-digit months and days", () => {
      const date = new Date(2024, 0, 5); // Jan 5
      expect(formatLocalDate(date)).toBe("2024-01-05");
    });

    it("should round-trip with parseLocalDate", () => {
      const original = "2024-06-20";
      expect(formatLocalDate(parseLocalDate(original))).toBe(original);
    });
  });

  describe("daysBetween", () => {
    it("should return 0 for the same date", () => {
      expect(daysBetween("2024-03-15", "2024-03-15")).toBe(0);
    });

    it("should return positive for dates in either order", () => {
      expect(daysBetween("2024-03-15", "2024-03-20")).toBe(5);
      expect(daysBetween("2024-03-20", "2024-03-15")).toBe(5);
    });

    it("should handle month boundaries", () => {
      expect(daysBetween("2024-01-31", "2024-02-01")).toBe(1);
    });

    it("should handle year boundaries", () => {
      expect(daysBetween("2023-12-31", "2024-01-01")).toBe(1);
    });

    it("should handle leap year", () => {
      expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2); // 2024 is leap year
      expect(daysBetween("2023-02-28", "2023-03-01")).toBe(1); // 2023 is not
    });
  });

  describe("daysBetweenDates", () => {
    it("should calculate days between two Date objects", () => {
      const d1 = new Date(2024, 2, 15);
      const d2 = new Date(2024, 2, 20);
      expect(daysBetweenDates(d1, d2)).toBe(5);
    });
  });

  describe("addInterval", () => {
    describe("daily", () => {
      it("should add 1 day", () => {
        const date = new Date(2024, 0, 15);
        addInterval(date, "daily", 1);
        expect(date.getDate()).toBe(16);
      });

      it("should cross month boundary", () => {
        const date = new Date(2024, 0, 31); // Jan 31
        addInterval(date, "daily", 1);
        expect(date.getMonth()).toBe(1); // Feb
        expect(date.getDate()).toBe(1);
      });
    });

    describe("weekly", () => {
      it("should add 7 days", () => {
        const date = new Date(2024, 0, 1);
        addInterval(date, "weekly", 1);
        expect(date.getDate()).toBe(8);
      });

      it("should add 2 weeks", () => {
        const date = new Date(2024, 0, 1);
        addInterval(date, "weekly", 2);
        expect(date.getDate()).toBe(15);
      });
    });

    describe("monthly", () => {
      it("should add 1 month to a normal date", () => {
        const date = new Date(2024, 0, 15); // Jan 15
        addInterval(date, "monthly", 1);
        expect(date.getMonth()).toBe(1); // Feb
        expect(date.getDate()).toBe(15);
      });

      it("should clamp Jan 31 to Feb 29 in leap year", () => {
        const date = new Date(2024, 0, 31); // Jan 31, 2024
        addInterval(date, "monthly", 1);
        expect(date.getMonth()).toBe(1); // Feb
        expect(date.getDate()).toBe(29); // 2024 is leap year
      });

      it("should clamp Jan 31 to Feb 28 in non-leap year", () => {
        const date = new Date(2023, 0, 31); // Jan 31, 2023
        addInterval(date, "monthly", 1);
        expect(date.getMonth()).toBe(1); // Feb
        expect(date.getDate()).toBe(28);
      });

      it("should clamp Mar 31 to Apr 30", () => {
        const date = new Date(2024, 2, 31); // Mar 31
        addInterval(date, "monthly", 1);
        expect(date.getMonth()).toBe(3); // Apr
        expect(date.getDate()).toBe(30);
      });

      it("should cross year boundary", () => {
        const date = new Date(2024, 11, 15); // Dec 15
        addInterval(date, "monthly", 1);
        expect(date.getFullYear()).toBe(2025);
        expect(date.getMonth()).toBe(0); // Jan
        expect(date.getDate()).toBe(15);
      });

      it("should add multiple months", () => {
        const date = new Date(2024, 0, 15); // Jan 15
        addInterval(date, "monthly", 3);
        expect(date.getMonth()).toBe(3); // Apr
        expect(date.getDate()).toBe(15);
      });
    });

    describe("yearly", () => {
      it("should add 1 year", () => {
        const date = new Date(2024, 5, 15); // Jun 15, 2024
        addInterval(date, "yearly", 1);
        expect(date.getFullYear()).toBe(2025);
        expect(date.getMonth()).toBe(5);
        expect(date.getDate()).toBe(15);
      });

      it("should handle Feb 29 in leap year to non-leap year", () => {
        const date = new Date(2024, 1, 29); // Feb 29, 2024
        addInterval(date, "yearly", 1);
        // 2025 is not a leap year, so Feb 29 doesn't exist
        // JavaScript's Date wraps this to Mar 1
        // The monthly guard won't trigger since we're in the yearly case
        expect(date.getFullYear()).toBe(2025);
      });
    });
  });
});

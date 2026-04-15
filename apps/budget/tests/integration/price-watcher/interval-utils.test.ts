import { describe, test, expect } from "vitest";
import {
  hoursToUnit,
  unitToHours,
} from "$core/../../../apps/budget/src/routes/(price-watcher)/price-watcher/(data)/interval-utils";

describe("Interval Utils", () => {
  describe("hoursToUnit", () => {
    test("converts hours to hours", () => {
      expect(hoursToUnit(6)).toEqual({ value: "6", unit: "hours" });
    });

    test("converts 24 hours to 1 day", () => {
      expect(hoursToUnit(24)).toEqual({ value: "1", unit: "days" });
    });

    test("converts 48 hours to 2 days", () => {
      expect(hoursToUnit(48)).toEqual({ value: "2", unit: "days" });
    });

    test("converts 168 hours to 1 week", () => {
      expect(hoursToUnit(168)).toEqual({ value: "1", unit: "weeks" });
    });

    test("converts 336 hours to 2 weeks", () => {
      expect(hoursToUnit(336)).toEqual({ value: "2", unit: "weeks" });
    });

    test("keeps non-divisible hours as hours", () => {
      expect(hoursToUnit(36)).toEqual({ value: "36", unit: "hours" });
    });

    test("converts fractional hours to minutes", () => {
      expect(hoursToUnit(0.5)).toEqual({ value: "30", unit: "minutes" });
    });

    test("converts small fractions to minutes", () => {
      expect(hoursToUnit(0.25)).toEqual({ value: "15", unit: "minutes" });
    });

    test("handles 1 hour", () => {
      expect(hoursToUnit(1)).toEqual({ value: "1", unit: "hours" });
    });
  });

  describe("unitToHours", () => {
    test("converts hours to hours", () => {
      expect(unitToHours("6", "hours")).toBe(6);
    });

    test("converts days to hours", () => {
      expect(unitToHours("2", "days")).toBe(48);
    });

    test("converts weeks to hours", () => {
      expect(unitToHours("1", "weeks")).toBe(168);
    });

    test("converts minutes to hours (rounds up, minimum 1)", () => {
      expect(unitToHours("30", "minutes")).toBe(1);
    });

    test("converts 120 minutes to 2 hours", () => {
      expect(unitToHours("120", "minutes")).toBe(2);
    });

    test("handles empty string as 1", () => {
      expect(unitToHours("", "hours")).toBe(1);
    });

    test("handles invalid string as 1", () => {
      expect(unitToHours("abc", "hours")).toBe(1);
    });

    test("round-trips: hours → unit → hours", () => {
      for (const hours of [1, 6, 12, 24, 48, 168, 336]) {
        const { value, unit } = hoursToUnit(hours);
        expect(unitToHours(value, unit)).toBe(hours);
      }
    });
  });
});

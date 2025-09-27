// $lib/types/repeating.ts
import type {monthOptions} from "$lib/utils/date-options";
import type {DateValue} from "@internationalized/date";

export type Month = (typeof monthOptions)[number];

export enum MoveToWeekday {
  None = "none",
  NextWeekday = "next_weekday",
  PreviousWeekday = "previous_weekday",
}

/**
 * The user‑defined recurrence configuration.
 */
export type RepeatingDate = {
  start: DateValue;
  end?: DateValue;
  end_type: "limit" | "until" | null;

  frequency?: "daily" | "weekly" | "monthly" | "yearly";
  interval?: number; // e.g. every 2 weeks

  // ────────────────────── Weekly ──────────────────────
  week_days?: number[]; // 1‑7 (Sun‑Sat) – only for weekly

  // ────────────────────── Monthly ─────────────────────
  days?: number[] | null; // 1‑31 – "the 15th" - can be multiple days like [10, 25]
  weeks?: number[]; // 1‑5 – “first week”
  weeks_days?: number[]; // 1‑7
  on: boolean; // is the “on” state enabled?
  on_type: "day" | "the"; // “day” = specific day, “the” = nth weekday

  // ────────────────────── Yearly ─────────────────────
  months?: string[]; // 1‑12
  yearly_on?: "the" | "last" | "specific";
  yearly_on_the_day?: string[]; // 1‑31
  yearly_on_the_month?: string[]; // 1‑12

  // ────────────────────── Extras ─────────────────────
  limit?: number; // maximum number of occurrences
  until?: DateValue | null; // end date
  move_weekends?: MoveToWeekday;
  move_holidays?: MoveToWeekday;
  specific_dates?: DateValue[]; // manual exceptions
  formatted?: string; // human‑readable representation
  placeholder?: DateValue; // placeholder text for input fields

  // ────────────────────── Computed ─────────────────────
  upcoming?: DateValue[]; // next dates, computed by the UI
};

export type SpecialDateValue = ["day" | "month" | "quarter" | "year" | "half-year", string];

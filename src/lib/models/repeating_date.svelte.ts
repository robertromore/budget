// $lib/RepeatingDateInput.ts
import { MoveToWeekday, type RepeatingDate } from "$lib/types";
import {
  dayOptions,
  lastDayOption,
  weekdayOptions,
  weekOptions,
  monthOptions,
} from "$lib/utils/date-options";
import { formatDayOfMonth, formatDate } from "$lib/utils/date-formatters";
import { nextDaily, nextWeekly, nextMonthly, nextYearly } from "$lib/utils/date-frequency";
import { endOfWeek, startOfWeek, type DateValue } from "@internationalized/date";
import { currentDate, timezone, getFirstDayInCalendarMonth, sameMonthAndYear } from "$lib/utils";

/**
 * Configuration for date generation
 */
interface DateGenerationConfig {
  calendarStart: DateValue;
  calendarEnd: DateValue | null;
  effectiveLimit: number;
}

/**
 * Default state for repeating dates
 */
const DEFAULT_STATE: RepeatingDate = {
  start: currentDate,
  end: undefined,
  end_type: null,
  frequency: "daily",
  interval: 1,
  days: null,
  weeks: [],
  weeks_days: [],
  months: [],
  limit: 0,
  move_weekends: MoveToWeekday.None,
  move_holidays: MoveToWeekday.None,
  specific_dates: [],
  on: false,
  on_type: "day",
};

/**
 * Publicly exported option lists – used by the UI.
 */
export const options = {
  days: [...dayOptions, lastDayOption],
  weekdays: weekdayOptions,
  weeks: weekOptions,
  months: monthOptions,
} as const;

/**
 * Main class for handling repeating date logic
 */
export default class RepeatingDateInput {
  /** The raw data model – `$state` makes it reactive */
  value: RepeatingDate = $state(DEFAULT_STATE);

  /** The "placeholder" – the date currently displayed in the picker */
  placeholder: DateValue = $state(currentDate);

  /* ------------------------------------------------------------------ */
  /* 1️⃣  Computed properties for better organization                     */
  /* ------------------------------------------------------------------ */

  /**
   * Determine which constraint to use based on end_type
   */
  private dateConstraints = $derived.by(() => {
    if (this.value.end_type === "until" && this.value.end) {
      return {
        end: this.value.end,
        limit: 1000, // Large number, won't be used
        hasEndDate: true,
      };
    }

    return {
      end: null,
      limit: this.value.limit || 50,
      hasEndDate: false,
    };
  });

  /**
   * Calculate calendar boundaries for date generation
   * Expands to include full calendar grid (previous and next month dates)
   */
  private calendarBounds = $derived.by(() => {
    const start = this.value.start;
    if (!start) return null;

    // Check if start date is in future relative to placeholder
    if (this.start.month > this.placeholder.month && this.start.year === this.placeholder.year) {
      return null;
    }

    let calendarStart = sameMonthAndYear(this.start, this.placeholder)
      ? this.start
      : this.placeholder;

    // Expand calendar start to include previous month dates visible in calendar
    const firstOfMonth = this.placeholder.set({ day: 1 });
    const firstWeekStart = startOfWeek(firstOfMonth, "en-us", "sun");

    // Expand calendar end to include next month dates visible in calendar
    const lastOfMonth = this.placeholder.set({ day: 0 }).add({ months: 1 });
    const lastWeekEnd = endOfWeek(lastOfMonth, "en-us", "sun");

    // Only expand backwards if the start date is before the first week start
    // This ensures we don't generate unnecessary dates before the start date
    const shouldExpandBackwards = this.start.compare(firstWeekStart) < 0;
    const expandedStart =
      shouldExpandBackwards && calendarStart.compare(firstWeekStart) > 0
        ? firstWeekStart
        : calendarStart;

    const bounds = {
      start: expandedStart,
      end: lastWeekEnd,
      originalStart: start,
    };

    return bounds;
  });

  /* ------------------------------------------------------------------ */
  /* 2️⃣  Upcoming dates – derived from `value`                          */
  /* ------------------------------------------------------------------ */
  upcoming: DateValue[] = $derived.by(() => {
    const bounds = this.calendarBounds;
    if (!bounds) return [];

    const constraints = this.dateConstraints;
    const frequency = this.value.frequency || "daily";
    const interval = this.value.interval || 1;

    try {
      const upcomingDates = this.generateDatesForFrequency(
        frequency,
        bounds,
        constraints,
        interval
      );

      // Add specific dates
      const specificDates = this.value.specific_dates || [];
      upcomingDates.push(...specificDates);

      return upcomingDates;
    } catch (error) {
      console.warn("Error generating upcoming dates:", error);
      return [];
    }
  });

  /* ------------------------------------------------------------------ */
  /* 3️⃣  Human‑readable string – derived from `value`                  */
  /* ------------------------------------------------------------------ */
  formatted: string = $derived.by(() => {
    return this.generateFormattedString();
  });

  /* ------------------------------------------------------------------ */
  /* 4️⃣  Private methods for better organization                        */
  /* ------------------------------------------------------------------ */

  /**
   * Generate dates based on frequency type
   */
  private generateDatesForFrequency(
    frequency: string,
    bounds: { start: DateValue; end: DateValue; originalStart: DateValue },
    constraints: { end: DateValue | null; limit: number; hasEndDate: boolean },
    interval: number
  ): DateValue[] {
    const config: DateGenerationConfig = {
      calendarStart: bounds.start,
      calendarEnd: constraints.end,
      effectiveLimit: constraints.limit,
    };

    switch (frequency) {
      case "daily":
        return this.generateDailyDates(config, interval, bounds);
      case "weekly":
        return this.generateWeeklyDates(config, interval, bounds);
      case "monthly":
        return this.generateMonthlyDates(config, interval, bounds);
      case "yearly":
        return this.generateYearlyDates(config, interval, bounds);
      default:
        return [];
    }
  }

  /**
   * Generate daily recurring dates
   */
  private generateDailyDates(
    config: DateGenerationConfig,
    interval: number,
    bounds: { start: DateValue; end: DateValue; originalStart: DateValue }
  ): DateValue[] {
    // Use the expanded calendar bounds which already include previous/next month dates
    const calendarStart = bounds.start;
    const calendarEnd = config.calendarEnd || bounds.end;

    return nextDaily(calendarStart, calendarEnd, interval, config.effectiveLimit);
  }

  /**
   * Generate weekly recurring dates
   */
  private generateWeeklyDates(
    config: DateGenerationConfig,
    interval: number,
    bounds: { start: DateValue; end: DateValue; originalStart: DateValue }
  ): DateValue[] {
    const weekDays = this.value.week_days ?? [];

    // Use the expanded calendar bounds which already include full weeks
    let calendarStart = bounds.start;
    const calendarEnd = config.calendarEnd || bounds.end;

    // For weekly patterns, ensure we start from a reasonable point for the pattern
    // If we have specific weekdays, start from the beginning of the range
    if (weekDays.length > 0) {
      // Find the earliest occurrence that makes sense for the pattern
      calendarStart = calendarStart < bounds.originalStart ? bounds.originalStart : calendarStart;
    }

    return nextWeekly(calendarStart, calendarEnd, interval, weekDays, config.effectiveLimit);
  }

  /**
   * Generate monthly recurring dates
   */
  private generateMonthlyDates(
    config: DateGenerationConfig,
    interval: number,
    bounds: { start: DateValue; end: DateValue; originalStart: DateValue }
  ): DateValue[] {
    // Use expanded bounds to catch monthly patterns that span across visible months
    const calendarStart = bounds.originalStart < bounds.start ? bounds.originalStart : bounds.start;
    const calendarEnd = config.calendarEnd || bounds.end;

    const onDay =
      this.value.on && this.value.on_type === "day" && this.value.days && this.value.days > 0;
    const onThe =
      this.value.on &&
      this.value.on_type === "the" &&
      this.value.weeks?.length &&
      this.value.weeks_days?.length;

    if (onDay) {
      return nextMonthly(
        calendarStart,
        calendarEnd,
        interval,
        this.value.days ?? null,
        [],
        [],
        config.effectiveLimit
      );
    }

    if (onThe) {
      return nextMonthly(
        calendarStart,
        calendarEnd,
        interval,
        null,
        this.value.weeks || [],
        this.value.weeks_days || [],
        config.effectiveLimit
      );
    }

    // Fallback: same day as start date
    return nextMonthly(
      calendarStart,
      calendarEnd,
      interval,
      bounds.originalStart.day,
      [],
      [],
      config.effectiveLimit
    );
  }

  /**
   * Generate yearly recurring dates
   */
  private generateYearlyDates(
    config: DateGenerationConfig,
    interval: number,
    bounds: { start: DateValue; end: DateValue; originalStart: DateValue }
  ): DateValue[] {
    // For yearly patterns, use the expanded bounds to catch dates in adjacent months
    const calendarStart = bounds.start;
    const calendarEnd = config.calendarEnd || bounds.end;

    return nextYearly(
      bounds.originalStart,
      calendarStart,
      calendarEnd,
      interval,
      config.effectiveLimit
    );
  }

  /**
   * Sort dates and remove duplicates
   */
  private sortAndDeduplicateDates(dates: DateValue[]): DateValue[] {
    // Create a map using string representation as key to remove duplicates
    const uniqueDatesMap = new Map<string, DateValue>();

    for (const date of dates) {
      const key = date.toString();
      if (!uniqueDatesMap.has(key)) {
        uniqueDatesMap.set(key, date);
      }
    }

    // Sort chronologically
    return Array.from(uniqueDatesMap.values()).sort((a, b) => a.compare(b));
  }

  /**
   * Generate human-readable formatted string
   */
  private generateFormattedString(): string {
    const {
      frequency,
      interval = 1,
      start = currentDate,
      week_days,
      weeks,
      weeks_days,
      days,
    } = this.value;

    if (!start) return "";

    const listFmt = new Intl.ListFormat("en-US", {
      style: "long",
      type: "conjunction",
    });

    const suffix = this.generateSuffix();
    const startFormatted = formatDate(start.toDate(timezone));

    switch (frequency) {
      case "daily":
        return this.formatDailyString(interval, startFormatted, suffix);
      case "weekly":
        return this.formatWeeklyString(interval, week_days, listFmt, startFormatted, suffix);
      case "monthly":
        return this.formatMonthlyString(
          interval,
          days ?? null,
          weeks,
          weeks_days,
          listFmt,
          start,
          startFormatted,
          suffix
        );
      case "yearly":
        return this.formatYearlyString(interval, startFormatted, suffix);
      default:
        return "";
    }
  }

  /**
   * Generate suffix for formatted string (until date or limit)
   */
  private generateSuffix(): string {
    if (this.value.end_type === "limit") {
      return `for ${this.value.limit} times`;
    }

    if (this.value.end_type === "until" && this.value.end) {
      return `until ${formatDate(this.value.end.toDate(timezone))}`;
    }

    return "";
  }

  /**
   * Format daily recurrence string
   */
  private formatDailyString(interval: number, startFormatted: string, suffix: string): string {
    const prefix =
      interval === 1 ? "Repeats daily" : `Repeats every ${interval} day${interval > 1 ? "s" : ""}`;

    return `${prefix} starting from ${startFormatted} ${suffix}`.trim();
  }

  /**
   * Format weekly recurrence string
   */
  private formatWeeklyString(
    interval: number,
    weekDays: number[] | undefined,
    listFmt: Intl.ListFormat,
    startFormatted: string,
    suffix: string
  ): string {
    const prefix =
      interval === 1
        ? "Repeats weekly"
        : `Repeats every ${interval} week${interval > 1 ? "s" : ""}`;

    const dayList = weekDays?.length
      ? ` on ${listFmt.format(weekDays.map((d) => weekdayOptions[d]?.label ?? ""))}`
      : "";

    return `${prefix}${dayList} starting from ${startFormatted} ${suffix}`.trim();
  }

  /**
   * Format monthly recurrence string
   */
  private formatMonthlyString(
    interval: number,
    days: number | null,
    weeks: number[] | undefined,
    weeksDays: number[] | undefined,
    listFmt: Intl.ListFormat,
    start: DateValue,
    startFormatted: string,
    suffix: string
  ): string {
    const prefix =
      interval === 1
        ? "Repeats monthly"
        : `Repeats every ${interval} month${interval > 1 ? "s" : ""}`;

    // "on the Xth day of the month"
    if (this.value.on && this.value.on_type === "day" && days) {
      return `${prefix} on the ${dayOptions[days - 1]?.label ?? ""} day starting from ${startFormatted} ${suffix}`.trim();
    }

    // "on the nth weekday"
    if (this.value.on && this.value.on_type === "the" && weeks?.length && weeksDays?.length) {
      const weekPart =
        weeks.length === 1
          ? (weekOptions[weeks[0] - 1]?.label ?? "")
          : listFmt.format(weeks.map((w) => weekOptions[w - 1]?.label ?? ""));

      const dayPart = listFmt.format((weeksDays || []).map((d) => weekdayOptions[d]?.label ?? ""));

      return `${prefix} on the ${weekPart} ${dayPart} starting from ${startFormatted} ${suffix}`.trim();
    }

    // fallback – the day the start date falls on
    return `${prefix} on the ${formatDayOfMonth(start)} starting from ${startFormatted} ${suffix}`.trim();
  }

  /**
   * Format yearly recurrence string
   */
  private formatYearlyString(interval: number, startFormatted: string, suffix: string): string {
    const prefix =
      interval === 1
        ? "Repeats yearly"
        : `Repeats every ${interval} year${interval > 1 ? "s" : ""}`;

    return `${prefix} starting from ${startFormatted} ${suffix}`.trim();
  }

  /* ------------------------------------------------------------------ */
  /* 5️⃣  Public API methods                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Reset to default state
   */
  reset(): void {
    this.value = structuredClone(DEFAULT_STATE);
    this.placeholder = currentDate;
  }

  /**
   * Validate current configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.value.start) {
      errors.push("Start date is required");
    }

    if (!this.value.interval || this.value.interval <= 0) {
      errors.push("Interval must be greater than 0");
    }

    if (this.value.end_type === "until" && !this.value.end) {
      errors.push("End date is required when using 'until' option");
    }

    if (
      this.value.end_type === "limit" &&
      (this.value.limit === undefined || this.value.limit === null || this.value.limit <= 0)
    ) {
      errors.push("Limit must be greater than 0 when using limit option");
    }

    if (this.value.end && this.value.start && this.value.end.compare(this.value.start) <= 0) {
      errors.push("End date must be after start date");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /* ------------------------------------------------------------------ */
  /* 6️⃣  Setters / getters – wrapping the `$state` object              */
  /* ------------------------------------------------------------------ */

  /* -----------  Setters (mutate the raw object)  ----------- */
  set on(value: boolean) {
    this.value.on = value;
  }
  set on_type(value: "day" | "the") {
    this.value.on_type = value;
  }
  set week_days(value: number[]) {
    this.value.week_days = value;
  }
  set weeks(value: number[]) {
    this.value.weeks = value;
  }
  set weeks_days(value: number[]) {
    this.value.weeks_days = value;
  }
  set days(value: number | null) {
    this.value.days = value;
  }
  set interval(value: number) {
    this.value.interval = Math.max(1, value); // Ensure positive interval
  }
  set frequency(value: "daily" | "weekly" | "monthly" | "yearly") {
    this.value.frequency = value;
  }
  set start(value: DateValue) {
    this.value.start = value;
  }
  set end(value: DateValue | null | undefined) {
    this.value.end = value === null ? undefined : value;
  }
  set end_type(value: "limit" | "until" | null) {
    this.value.end_type = value;
  }
  set limit(value: number) {
    this.value.limit = Math.max(0, value); // Ensure non-negative limit
  }
  set specific_dates(value: DateValue[]) {
    this.value.specific_dates = value;
  }
  set months(value: string[]) {
    this.value.months = value;
  }
  set moveWeekends(value: MoveToWeekday) {
    this.value.move_weekends = value;
  }
  set moveHolidays(value: MoveToWeekday) {
    this.value.move_holidays = value;
  }

  /* -----------  Getters (just expose the underlying property)  ----------- */
  get start() {
    return this.value.start;
  }
  get end(): DateValue | undefined {
    return this.value.end ?? undefined;
  }
  get end_type() {
    return this.value.end_type;
  }
  get frequency() {
    return this.value.frequency ?? "daily";
  }
  get interval() {
    return this.value.interval ?? 1;
  }
  get week_days() {
    return this.value.week_days ?? [];
  }
  get weeks() {
    return this.value.weeks ?? [];
  }
  get weeks_days() {
    return this.value.weeks_days ?? [];
  }
  get days() {
    return this.value.days ?? null;
  }
  get months() {
    return this.value.months ?? [];
  }
  get limit() {
    return this.value.limit ?? 0;
  }
  get moveWeekends() {
    return this.value.move_weekends ?? MoveToWeekday.None;
  }
  get moveHolidays() {
    return this.value.move_holidays ?? MoveToWeekday.None;
  }
  get specific_dates() {
    return this.value.specific_dates ?? [];
  }
  get on() {
    return this.value.on ?? false;
  }
  get on_type() {
    return this.value.on_type ?? "day";
  }
}

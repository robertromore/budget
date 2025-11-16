// $lib/RepeatingDateInput.ts
import {MoveToWeekday, type RepeatingDate} from "$lib/types";
import {currentDate, sameMonthAndYear, timezone} from "$lib/utils";
import {formatDate, formatDayOfMonth} from "$lib/utils/date-formatters";
import {nextDaily, nextMonthly, nextWeekly, nextYearly} from "$lib/utils/date-frequency";
import {
  dayOptions,
  lastDayOption,
  monthOptions,
  weekdayOptions,
  weekOptions,
} from "$lib/utils/date-options";
import {isHoliday} from "$lib/utils/holidays";
import {endOfWeek, startOfWeek, type DateValue} from "@internationalized/date";

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
  end_type: null,
  frequency: "daily",
  interval: 1,
  days: [],
  weeks: [],
  weeks_days: [],
  months: [],
  limit: 0,
  move_weekends: MoveToWeekday.None,
  move_holidays: MoveToWeekday.None,
  specific_dates: [],
  on: false,
  on_type: "day",
} as RepeatingDate;

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

  /**
   * Determine which constraint to use by inferring from the data
   * Since end_type is not persisted, we infer it from end and limit values
   */
  private dateConstraints = $derived.by(() => {
    // If end date is set, use it as the constraint (takes precedence)
    if (this.value.end) {
      return {
        end: this.value.end,
        limit: 1000, // Safety limit, actual end date takes precedence
        hasEndDate: true,
      };
    }

    // If limit is set and > 0, use it as the constraint
    if (this.value.limit && this.value.limit > 0) {
      return {
        end: null,
        limit: this.value.limit,
        hasEndDate: true,
      };
    }

    // No end condition - generate dates for visible calendar range
    return {
      end: null,
      limit: 0, // Will be calculated dynamically based on visible calendar range
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

    // Expand calendar to include all visible dates in the calendar grid
    const firstOfMonth = this.placeholder.set({day: 1});
    const firstWeekStart = startOfWeek(firstOfMonth, "en-us", "sun");

    // Expand calendar end to include next month dates visible in calendar
    const lastOfMonth = this.placeholder.set({day: 0}).add({months: 1});
    const lastWeekEnd = endOfWeek(lastOfMonth, "en-us", "sun");

    // Use the earlier of: start date or first week of calendar view
    // This ensures we show all recurring dates in the visible calendar
    const expandedStart = this.start.compare(firstWeekStart) < 0 ? this.start : firstWeekStart;

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

      // Apply adjustments based on settings
      let adjustedDates = upcomingDates;

      // Apply weekend adjustments if enabled
      if (this.value.move_weekends !== MoveToWeekday.None) {
        adjustedDates = this.applyWeekendAdjustments(adjustedDates);
      }

      // Apply holiday adjustments if enabled (only applied to dates that haven't been weekend-adjusted)
      if (this.value.move_holidays !== MoveToWeekday.None) {
        adjustedDates = this.applyHolidayAdjustments(adjustedDates);
      }

      // Sort and deduplicate after adjustments
      return this.sortAndDeduplicateDates(adjustedDates);
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
    bounds: {start: DateValue; end: DateValue; originalStart: DateValue},
    constraints: {end: DateValue | null; limit: number; hasEndDate: boolean},
    interval: number
  ): DateValue[] {
    const config: DateGenerationConfig = {
      calendarStart: bounds.start,
      // Use user-specified end date if available, otherwise use visible calendar end
      calendarEnd: constraints.end || bounds.end,
      // Use user-specified limit if available, otherwise calculate based on range
      effectiveLimit: constraints.hasEndDate
        ? constraints.limit
        : this.calculateDynamicLimit(frequency, interval, bounds),
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
   * Calculate a dynamic limit based on the frequency and visible date range
   */
  private calculateDynamicLimit(
    frequency: string,
    interval: number,
    bounds: {start: DateValue; end: DateValue; originalStart: DateValue}
  ): number {
    // Calculate the approximate number of days in the range
    const startDate = bounds.start.toDate("UTC");
    const endDate = bounds.end.toDate("UTC");
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate a reasonable limit based on frequency and interval
    let limit: number;
    switch (frequency) {
      case "daily":
        limit = Math.ceil(daysDiff / interval) + 10; // +10 for buffer
        break;
      case "weekly":
        limit = Math.ceil(daysDiff / 7 / interval) * 7 + 10; // 7 days per week max
        break;
      case "monthly":
        limit = Math.ceil(daysDiff / 30 / interval) * 31 + 10; // 31 days per month max
        break;
      case "yearly":
        limit = Math.ceil(daysDiff / 365 / interval) * 366 + 10; // 366 days per year max (leap year)
        break;
      default:
        limit = 1000;
    }

    // Minimum limit of 100 to ensure we always generate enough dates
    return Math.max(100, limit);
  }

  /**
   * Generate daily recurring dates
   */
  private generateDailyDates(
    config: DateGenerationConfig,
    interval: number,
    bounds: {start: DateValue; end: DateValue; originalStart: DateValue}
  ): DateValue[] {
    // Use the expanded calendar bounds which already include previous/next month dates
    const calendarStart = bounds.start;
    const calendarEnd = config.calendarEnd || bounds.end;

    // Calculate the aligned start date based on the original pattern
    // This ensures the pattern continues correctly when navigating to future months
    const alignedStart = this.calculateAlignedStartDate(
      bounds.originalStart,
      calendarStart,
      interval
    );

    return nextDaily(alignedStart, calendarEnd, interval, config.effectiveLimit);
  }

  /**
   * Calculate the first occurrence on or after targetDate that aligns with the pattern
   */
  private calculateAlignedStartDate(
    patternStart: DateValue,
    targetDate: DateValue,
    interval: number
  ): DateValue {
    // If target is before or equal to pattern start, use pattern start
    if (targetDate.compare(patternStart) <= 0) {
      return patternStart;
    }

    // Calculate days between pattern start and target
    const startJsDate = patternStart.toDate("UTC");
    const targetJsDate = targetDate.toDate("UTC");
    const daysDiff = Math.floor(
      (targetJsDate.getTime() - startJsDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate how many complete intervals have passed
    const intervalsCompleted = Math.floor(daysDiff / interval);

    // Calculate the aligned date
    const alignedDate = patternStart.add({days: intervalsCompleted * interval});

    // If aligned date is before target, move forward one interval
    if (alignedDate.compare(targetDate) < 0) {
      return alignedDate.add({days: interval});
    }

    return alignedDate;
  }

  /**
   * Generate weekly recurring dates
   */
  private generateWeeklyDates(
    config: DateGenerationConfig,
    interval: number,
    bounds: {start: DateValue; end: DateValue; originalStart: DateValue}
  ): DateValue[] {
    const weekDays = this.value.week_days ?? [];
    const calendarEnd = config.calendarEnd || bounds.end;

    // Calculate the aligned week start based on the original pattern
    // This ensures weekly patterns continue correctly when navigating to future months
    const alignedStart = this.calculateAlignedWeekStart(
      bounds.originalStart,
      bounds.start,
      interval
    );

    return nextWeekly(alignedStart, calendarEnd, interval, weekDays, config.effectiveLimit);
  }

  /**
   * Calculate the aligned week start for weekly patterns
   * Ensures the pattern interval is maintained when navigating to future months
   */
  private calculateAlignedWeekStart(
    patternStart: DateValue,
    targetDate: DateValue,
    interval: number
  ): DateValue {
    // If target is before or equal to pattern start, use pattern start
    if (targetDate.compare(patternStart) <= 0) {
      return patternStart;
    }

    // Calculate days between pattern start and target
    const startJsDate = patternStart.toDate("UTC");
    const targetJsDate = targetDate.toDate("UTC");
    const daysDiff = Math.floor(
      (targetJsDate.getTime() - startJsDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate how many complete week intervals have passed
    const weeksCompleted = Math.floor(daysDiff / (7 * interval));

    // Calculate the aligned week start
    const alignedWeekStart = patternStart.add({weeks: weeksCompleted * interval});

    // If aligned week start is before target, it's the correct week to start from
    // The nextWeekly function will handle finding the specific weekdays within this week
    if (alignedWeekStart.compare(targetDate) <= 0) {
      return alignedWeekStart;
    }

    // Otherwise, go back one interval to ensure we don't skip dates
    return alignedWeekStart.subtract({weeks: interval});
  }

  /**
   * Generate monthly recurring dates
   */
  private generateMonthlyDates(
    config: DateGenerationConfig,
    interval: number,
    bounds: {start: DateValue; end: DateValue; originalStart: DateValue}
  ): DateValue[] {
    // Use expanded bounds to catch monthly patterns that span across visible months
    const calendarStart = bounds.originalStart < bounds.start ? bounds.originalStart : bounds.start;
    const calendarEnd = config.calendarEnd || bounds.end;

    const onDay =
      this.value.on &&
      this.value.on_type === "day" &&
      this.value.days &&
      this.value.days.length > 0;
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
        this.value.days ?? [],
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
    bounds: {start: DateValue; end: DateValue; originalStart: DateValue}
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
   * Check if a date falls on a weekend (Saturday or Sunday)
   */
  private isWeekend(date: DateValue): boolean {
    const dayOfWeek = date.toDate(timezone).getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  }

  /**
   * Adjust a date if it falls on a weekend according to the move_weekends setting
   */
  private adjustForWeekend(date: DateValue): DateValue {
    if (!this.isWeekend(date) || this.value.move_weekends === MoveToWeekday.None) {
      return date;
    }

    const dayOfWeek = date.toDate(timezone).getDay();

    if (this.value.move_weekends === MoveToWeekday.NextWeekday) {
      // Move to next weekday (Monday)
      if (dayOfWeek === 0) {
        // Sunday -> Monday
        return date.add({days: 1});
      } else if (dayOfWeek === 6) {
        // Saturday -> Monday
        return date.add({days: 2});
      }
    } else if (this.value.move_weekends === MoveToWeekday.PreviousWeekday) {
      // Move to previous weekday (Friday)
      if (dayOfWeek === 0) {
        // Sunday -> Friday
        return date.subtract({days: 2});
      } else if (dayOfWeek === 6) {
        // Saturday -> Friday
        return date.subtract({days: 1});
      }
    }

    return date;
  }

  /**
   * Apply weekend adjustments to an array of dates
   */
  private applyWeekendAdjustments(dates: DateValue[]): DateValue[] {
    return dates.map((date) => this.adjustForWeekend(date));
  }

  /**
   * Adjust a date if it falls on a holiday according to the move_holidays setting
   */
  private adjustForHoliday(date: DateValue, maxAdjustments = 10): DateValue {
    if (!isHoliday(date) || this.value.move_holidays === MoveToWeekday.None) {
      return date;
    }

    let adjustedDate = date;
    let adjustmentCount = 0;

    // Keep adjusting until we find a non-holiday date
    // (don't worry about weekends here - they're handled separately)
    while (adjustmentCount < maxAdjustments) {
      if (this.value.move_holidays === MoveToWeekday.NextWeekday) {
        adjustedDate = adjustedDate.add({days: 1});
      } else if (this.value.move_holidays === MoveToWeekday.PreviousWeekday) {
        adjustedDate = adjustedDate.subtract({days: 1});
      }

      adjustmentCount++;

      // If the adjusted date is not a holiday, we're done
      if (!isHoliday(adjustedDate)) {
        return adjustedDate;
      }
    }

    return adjustedDate;
  }

  /**
   * Apply holiday adjustments to an array of dates
   */
  private applyHolidayAdjustments(dates: DateValue[]): DateValue[] {
    return dates.map((date) => this.adjustForHoliday(date));
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
    const parts: string[] = [];

    if (this.value.end_type === "limit") {
      parts.push(`for ${this.value.limit} times`);
    }

    if (this.value.end_type === "until" && this.value.end) {
      parts.push(`until ${formatDate(this.value.end.toDate(timezone))}`);
    }

    // Add weekend and holiday handling information
    const adjustments: string[] = [];

    if (this.value.move_weekends === MoveToWeekday.NextWeekday) {
      adjustments.push("weekends moved to Monday");
    } else if (this.value.move_weekends === MoveToWeekday.PreviousWeekday) {
      adjustments.push("weekends moved to Friday");
    }

    if (this.value.move_holidays === MoveToWeekday.NextWeekday) {
      adjustments.push("holidays moved to next weekday");
    } else if (this.value.move_holidays === MoveToWeekday.PreviousWeekday) {
      adjustments.push("holidays moved to previous weekday");
    }

    if (adjustments.length > 0) {
      parts.push(`(${adjustments.join(", ")})`);
    }

    // Add specific dates information
    const specificDates = this.value.specific_dates || [];
    if (specificDates.length > 0) {
      if (specificDates.length === 1) {
        parts.push(`with 1 additional date`);
      } else {
        parts.push(`with ${specificDates.length} additional dates`);
      }
    }

    return parts.join(" ");
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
    days: number[] | null,
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
    if (this.value.on && this.value.on_type === "day" && days && days.length > 0) {
      const dayLabels = days.map((day: number) => dayOptions[day - 1]?.label ?? `${day}th`);
      const dayText = dayLabels.length === 1 ? dayLabels[0] : listFmt.format(dayLabels);
      return `${prefix} on the ${dayText} day${dayLabels.length > 1 ? "s" : ""} starting from ${startFormatted} ${suffix}`.trim();
    }

    // "on the nth weekday"
    if (this.value.on && this.value.on_type === "the" && weeks?.length && weeksDays?.length) {
      const firstWeek = weeks[0];
      const weekPart =
        weeks.length === 1 && firstWeek !== undefined
          ? (weekOptions[firstWeek - 1]?.label ?? "")
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
  validate(): {valid: boolean; errors: string[]} {
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
  set days(value: number[] | null) {
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
    if (value) {
      this.value.end = value;
    } else {
      delete (this.value as any).end;
    }
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
    return this.value.start ?? currentDate;
  }
  get end(): DateValue | undefined {
    return this.value.end;
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
    return this.value.days ?? [];
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

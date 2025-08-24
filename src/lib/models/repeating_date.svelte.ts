// $lib/RepeatingDateInput.ts
import { MoveToWeekday, type RepeatingDate } from "$lib/types";
import {
  dayOptions,
  lastDayOption,
  weekdayOptions,
  weekOptions,
  monthOptions,
} from "$lib/utils/date-options";
import { formatDayOfMonth, formatStartDate } from "$lib/utils/date-formatters";
import { nextDaily, nextWeekly, nextMonthly, nextYearly } from "$lib/utils/date-frequency";
import { endOfWeek, startOfWeek, type DateValue } from "@internationalized/date";
import { currentDate, timezone, getFirstDayInCalendarMonth, sameMonthAndYear } from "$lib/utils";

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
 * Publicly exported option lists – used by the UI.
 */
export const options = {
  days: [...dayOptions, lastDayOption],
  weekdays: weekdayOptions,
  weeks: weekOptions,
  months: monthOptions,
};

export default class RepeatingDateInput {
  /** The raw data model – `$state` makes it reactive */
  value: RepeatingDate = $state(DEFAULT_STATE);

  /** The “placeholder” – the date currently displayed in the picker */
  placeholder: DateValue = $state(currentDate);

  /* ------------------------------------------------------------------ */
  /* 1️⃣  Upcoming dates – derived from `value`                          */
  /* ------------------------------------------------------------------ */
  upcoming: DateValue[] = $derived.by(() => {
    const start = this.value.start;
    const end = this.value.end ? this.value.end : null;
    const frequency = this.value.frequency || "daily";
    const interval = this.value.interval || 1;
    const limit = this.value.limit || 50;
    const days = this.value.days || null;
    const weeks = this.value.weeks || [];
    const weeks_days = this.value.weeks_days || [];
    const specificDates = this.value.specific_dates || [];
    const upcomingDates: DateValue[] = [];

    // If no start date is set, return an empty array or if the start date is in the future of the placeholder
    if (
      !start ||
      (this.start.month > this.placeholder.month && this.start.year === this.placeholder.year)
    ) {
      return [];
    }

    let calendarStart = sameMonthAndYear(this.start, this.placeholder)
      ? this.start
      : this.placeholder;
    let calendarEnd = this.placeholder
      .set({
        day: 0,
      })
      .add({ months: 1 });

    // 1. Pick the proper generator
    switch (frequency) {
      case "daily":
        if (this.placeholder > start) {
          calendarStart = startOfWeek(calendarStart.set({ day: 1 }), "en-us", "sun");
        }

        // Move calendarEnd to the next Saturday (or last day of week)
        calendarEnd = end || endOfWeek(calendarEnd, "en-us", "sun");

        upcomingDates.push(...nextDaily(calendarStart, calendarEnd, interval, limit));
        break;
      case "weekly":
        if (this.placeholder > start) {
          calendarStart = getFirstDayInCalendarMonth(this.placeholder);
          calendarEnd = calendarEnd.add({ months: 1 }).set({ day: 0 });
        }

        calendarEnd = end || endOfWeek(calendarEnd, "en-us", "sun");

        if (this.value.week_days && this.value.week_days.length > 0) {
          if (this.placeholder > start) {
            calendarStart = calendarStart.subtract({ days: 6 });
          } else {
            calendarStart = calendarStart.subtract({ days: 1 });
          }
        }

        upcomingDates.push(
          ...nextWeekly(calendarStart, calendarEnd, interval, this.value.week_days ?? [], limit)
        );
        break;
      case "monthly":
        const on_day =
          this.value.on && this.value.on_type === "day" && this.value.days && this.value.days > 0;
        const on_the =
          this.value.on &&
          this.value.on_type === "the" &&
          this.value.weeks &&
          this.value.weeks.length > 0 &&
          this.value.weeks_days &&
          this.value.weeks_days.length > 0;

        calendarEnd = end || calendarEnd;

        if (on_day) {
          upcomingDates.push(
            ...nextMonthly(calendarStart, calendarEnd, interval, days, [], [], limit)
          );
        } else if (on_the) {
          upcomingDates.push(
            ...nextMonthly(calendarStart, calendarEnd, interval, null, weeks, weeks_days, limit)
          );
        } else {
          // fallback to “the day of the month that the start date falls on”
          upcomingDates.push(
            ...nextMonthly(calendarStart, calendarEnd, interval, start.day, [], [], limit)
          );
        }
        break;
      case "yearly":
        upcomingDates.push(...nextYearly(start, calendarStart, calendarEnd, interval, limit));
        break;
    }

    // 2. Add specific dates the user added manually
    upcomingDates.push(...specificDates);

    return upcomingDates;
  });

  /* ------------------------------------------------------------------ */
  /* 2️⃣  Human‑readable string – derived from `value`                  */
  /* ------------------------------------------------------------------ */
  formatted: string = $derived.by(() => {
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

    switch (frequency) {
      case "daily": {
        const prefix =
          interval === 1
            ? "Repeats daily"
            : `Repeats every ${interval} day${interval > 1 ? "s" : ""}`;
        return `${prefix} starting from ${formatStartDate(start.toDate(timezone))}`;
      }

      case "weekly": {
        const prefix =
          interval === 1
            ? "Repeats weekly"
            : `Repeats every ${interval} week${interval > 1 ? "s" : ""}`;

        const dayList =
          week_days && week_days.length
            ? ` on ${listFmt.format(week_days.map((d) => weekdayOptions[d]?.label ?? ""))}`
            : "";

        return `${prefix}${dayList} starting from ${formatStartDate(start.toDate(timezone))}`;
      }

      case "monthly": {
        const prefix =
          interval === 1
            ? "Repeats monthly"
            : `Repeats every ${interval} month${interval > 1 ? "s" : ""}`;

        // “on the Xth day of the month”
        if (this.value.on && this.value.on_type === "day" && days) {
          return `${prefix} on the ${dayOptions[days - 1]?.label ?? ""} day starting from ${formatStartDate(start.toDate(timezone))}`;
        }

        // “on the nth weekday”
        if (this.value.on && this.value.on_type === "the" && weeks?.length && weeks_days?.length) {
          const weekPart =
            weeks.length === 1
              ? (weekOptions[weeks[0] - 1]?.label ?? "")
              : listFmt.format(weeks.map((w) => weekOptions[w - 1]?.label ?? ""));
          const dayPart =
            weeks_days.length > 0
              ? listFmt.format(weeks_days.map((d) => weekdayOptions[d]?.label ?? ""))
              : "";

          return `${prefix} on the ${weekPart} ${dayPart} starting from ${formatStartDate(start.toDate(timezone))}`;
        }

        // fallback – the day the start date falls on
        return `${prefix} on the ${formatDayOfMonth(
          start
        )} starting from ${formatStartDate(start.toDate(timezone))}`;
      }

      case "yearly": {
        const prefix =
          interval === 1
            ? "Repeats yearly"
            : `Repeats every ${interval} year${interval > 1 ? "s" : ""}`;
        return `${prefix} starting from ${formatStartDate(start.toDate(timezone))}`;
      }
    }

    return "";
  });

  /* ------------------------------------------------------------------ */
  /* 3️⃣  Setters / getters – wrapping the `$state` object              */
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
    this.value.interval = value;
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
    this.value.limit = value;
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
  get end() {
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

import { today, getLocalTimeZone, CalendarDate, startOfWeek, } from "@internationalized/date";
export const timezone = getLocalTimeZone();
export const currentDate = today(timezone);
export function getSpecialDateValue(date) {
    return date.split(":");
}
/**
 * Returns the day of week for a DateValue.
 * 0 = Sunday, 6 = Saturday
 *
 * @param date - The DateValue to get the day of week for
 * @param timeZone - The timezone to use (default: UTC)
 * @returns The day of week for the given DateValue
 *
 * @example
 * // Get the day of week for today in local timezone
 * const today = getLocalTimeZone();
 * const dayOfWeek = getDayOfWeek(today);
 */
export function getDayOfWeek(date, timeZone = "UTC") {
    // Use standard Date constructor which is more reliable than toDate()
    // month - 1 because Date constructor expects 0-indexed months
    const jsDate = new Date(date.year, date.month - 1, date.day);
    return jsDate.getDay(); // 0=Sunday … 6=Saturday
}
/* ------------------------------------------------------------------ */
/* Helper that returns the correct ordinal suffix for a day number   */
/* ------------------------------------------------------------------ */
export function getOrdinalSuffix(day) {
    const j = day % 10, k = day % 100;
    if (j === 1 && k !== 11)
        return "st";
    if (j === 2 && k !== 12)
        return "nd";
    if (j === 3 && k !== 13)
        return "rd";
    return "th";
}
export function sameMonthAndYear(date1, date2) {
    return date1.month === date2.month && date1.year === date2.year;
}
export function sameMonthOrFuture(date1, date2 = currentDate) {
    return (date1.month === date2.month && date1.year === date2.year) || date1 > date2;
}
export function sameMonthOrPast(date1, date2 = currentDate) {
    return (date1.month === date2.month && date1.year === date2.year) || date1 < date2;
}
/* ------------------------------------------------------------------ */
/* Find first occurrence of a date's weekday                        */
/* ------------------------------------------------------------------ */
/**
 * Get the first day in the visible grid of a calendar month.
 *
 * @param date - A DateValue within the target month
 * @param locale - BCP47 locale string (e.g. "en-US")
 * @param firstDayOfWeek - Optional first day of week override ("sun", "mon", etc.)
 */
export function getFirstDayInCalendarMonth(date, locale = "en-US", firstDayOfWeek = "sun") {
    // Go to the 1st of the month
    const firstOfMonth = new CalendarDate(date.year, date.month, 1);
    // Snap to the beginning of that week
    return startOfWeek(firstOfMonth, locale, firstDayOfWeek);
}
/**
 * Finds the first occurrence of a date's weekday in the same month.
 * For example, if given a date that falls on a Wednesday, this will return
 * the first Wednesday of that month.
 *
 * @param date - The DateValue to find the first weekday occurrence for
 * @param timeZone - The timezone to use (default: "UTC")
 * @returns The first occurrence of the date's weekday in the same month
 *
 * @example
 * // If given January 17th, 2024 (a Wednesday), returns January 3rd, 2024 (first Wednesday)
 * const someWednesday = new CalendarDate(2024, 1, 17);
 * const firstWednesday = getFirstWeekday(someWednesday);
 */
/**
 * Finds the first occurrence of a specific weekday in a given month/year.
 *
 * @param targetYear - The target year
 * @param targetMonth - The target month (1-12)
 * @param weekday - The weekday to find (0 = Sunday, 6 = Saturday)
 * @param timeZone - The timezone to use (default: "UTC")
 * @returns The first occurrence of the weekday in the specified month
 */
export function getFirstSpecifiedWeekdayInMonth(targetYear, targetMonth, weekday, timeZone = "UTC") {
    // Create first day of target month
    const firstOfMonth = new CalendarDate(targetYear, targetMonth, 1);
    const firstDayWeekday = getDayOfWeek(firstOfMonth, timeZone);
    // Calculate how many days to add to reach the target weekday
    let daysToAdd = weekday - firstDayWeekday;
    if (daysToAdd < 0) {
        daysToAdd += 7; // Move to next week if target weekday is earlier in the week
    }
    // Add the calculated days to the first of the month
    return firstOfMonth.add({ days: daysToAdd });
}
export function getFirstWeekday(date, timeZone = "UTC") {
    const targetWeekday = getDayOfWeek(date, timeZone);
    // Get the first day of the same month
    const firstOfMonth = date.set({ day: 1 });
    const firstDayWeekday = getDayOfWeek(firstOfMonth, timeZone);
    // Calculate how many days to add to reach the target weekday
    let daysToAdd = targetWeekday - firstDayWeekday;
    if (daysToAdd < 0) {
        daysToAdd += 7; // Move to next week if target weekday is earlier in the week
    }
    // Add the calculated days to the first of the month
    return firstOfMonth.add({ days: daysToAdd });
}
/* ------------------------------------------------------------------ */
/* Find next occurrence of a specific weekday                         */
/* ------------------------------------------------------------------ */
/**
 * Finds the next occurrence of a specific weekday from a given date.
 * If the given date is already the target weekday, returns the next week's occurrence.
 *
 * @param fromDate - The starting date (DateValue)
 * @param targetWeekday - Target weekday (0 = Sunday, 1 = Monday, ..., 6 = Saturday) - ISO format
 * @returns The next DateValue that falls on the target weekday
 *
 * @example
 * // Find next Friday from today
 * const nextFriday = getNextWeekday(today(getLocalTimeZone()), 5);
 *
 * // Find next Monday from a specific date
 * const someDate = new DateValue(2024, 1, 15);
 * const nextMonday = getNextWeekday(someDate, 1);
 */
export function getNextWeekday(fromDate, targetWeekday) {
    // Validate weekday input (0-6, where 0 = Sunday, 6 = Saturday)
    if (targetWeekday < 0 || targetWeekday > 6) {
        throw new Error("Target weekday must be between 0 (Sunday) and 6 (Saturday)");
    }
    // Convert CalendarDate to JavaScript Date to get current weekday
    const jsDate = fromDate.toDate(timezone);
    // Get current weekday (JavaScript: 0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const currentWeekday = jsDate.getDay();
    // Calculate days to add to reach target weekday
    // We always want the NEXT occurrence, so if it's already the target weekday,
    // we go to next week
    let daysToAdd = targetWeekday - currentWeekday;
    if (daysToAdd <= 0) {
        daysToAdd += 7; // Move to next week
    }
    // Add the calculated days to the original date
    return fromDate.add({ days: daysToAdd });
}
/**
 * Finds the next occurrence of a specific weekday from a given date.
 * Optionally includes the same day if it matches the target weekday.
 *
 * @param fromDate - The starting date (CalendarDate)
 * @param targetWeekday - Target weekday (0 = Sunday, 1 = Monday, ..., 6 = Saturday) - ISO format
 * @param includeSameDay - If true, returns the same day if it matches target weekday (default: false)
 * @returns The next CalendarDate that falls on the target weekday
 *
 * @example
 * // Find next Friday from today (excluding today if it's Friday)
 * const nextFriday = getNextWeekdayFlexible(today(getLocalTimeZone()), 5);
 *
 * // Find next Friday from today (including today if it's Friday)
 * const nextFriday = getNextWeekdayFlexible(today(getLocalTimeZone()), 5, true);
 */
export function getNextWeekdayFlexible(fromDate, targetWeekday, includeSameDay = false) {
    // Validate weekday input (0-6, where 0 = Sunday, 6 = Saturday)
    if (targetWeekday < 0 || targetWeekday > 6) {
        throw new Error("Target weekday must be between 0 (Sunday) and 6 (Saturday)");
    }
    // Convert DateValue to JavaScript Date to get current weekday
    const jsDate = fromDate.toDate(timezone);
    // Get current weekday (JavaScript: 0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    // Convert to ISO format (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const currentWeekday = jsDate.getDay();
    // If it's already the target weekday and we want to include same day
    if (currentWeekday === targetWeekday && includeSameDay) {
        return fromDate;
    }
    // Calculate days to add to reach target weekday
    let daysToAdd = targetWeekday - currentWeekday;
    if (daysToAdd <= 0) {
        daysToAdd += 7; // Move to next week
    }
    // Add the calculated days to the original date
    return fromDate.add({ days: daysToAdd });
}
/**
 * Finds the next occurrence of a specific weekday using weekday option labels.
 * This works with your existing weekdayOptions from utils/options.ts
 *
 * @param fromDate - The starting date (DateValue)
 * @param weekdayLabel - Weekday label ("Monday", "Tuesday", etc.) - case insensitive
 * @param includeSameDay - If true, returns the same day if it matches target weekday (default: false)
 * @returns The next DateValue that falls on the target weekday
 *
 * @example
 * // Find next Friday from today
 * const nextFriday = getNextWeekdayByLabel(today(getLocalTimeZone()), "Friday");
 *
 * // Find next Monday including today if it's Monday
 * const nextMonday = getNextWeekdayByLabel(someDate, "monday", true);
 */
export function getNextWeekdayByLabel(fromDate, weekdayLabel, includeSameDay = false) {
    // Map of weekday labels to ISO weekday numbers (1 = Monday, 7 = Sunday)
    const weekdayMap = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
    };
    const normalizedLabel = weekdayLabel.toLowerCase();
    const targetWeekday = weekdayMap[normalizedLabel];
    if (targetWeekday === undefined) {
        throw new Error(`Invalid weekday label: "${weekdayLabel}". Valid options: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday`);
    }
    return getNextWeekdayFlexible(fromDate, targetWeekday, includeSameDay);
}
/**
 * Helper function to get the nth weekday of a specific month
 * @param year - The year
 * @param month - The month (1-12)
 * @param week - Which week (1=first, 2=second, 3=third, 4=fourth, 5=last)
 * @param weekDay - Day of week (0=Sunday, 6=Saturday)
 * @returns DateValue or null if not found
 */
export function getNthWeekdayOfMonth(year, month, week, weekDay) {
    try {
        if (week === 5) {
            // Special case: "last" weekday of the month
            return getLastWeekdayOfMonth(year, month, weekDay);
        }
        // Find the first day of the month
        const firstOfMonth = today(timezone).set({ year, month, day: 1 });
        const firstWeekDay = getDayOfWeek(firstOfMonth, timezone);
        // Calculate the first occurrence of the target weekday
        let daysToAdd = weekDay - firstWeekDay;
        if (daysToAdd < 0) {
            daysToAdd += 7;
        }
        // Add additional weeks to get to the nth occurrence
        daysToAdd += (week - 1) * 7;
        const targetDate = firstOfMonth.add({ days: daysToAdd });
        // Verify the date is still in the same month
        if (targetDate.month === month) {
            return targetDate;
        }
        return null;
    }
    catch (error) {
        return null;
    }
}
/**
 * Helper function to get the last weekday of a specific month
 * @param year - The year
 * @param month - The month (1-12)
 * @param weekDay - Day of week (0=Sunday, 6=Saturday)
 * @returns DateValue or null if not found
 */
export function getLastWeekdayOfMonth(year, month, weekDay) {
    try {
        // Get the last day of the month
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const firstOfNextMonth = today(timezone).set({ year: nextYear, month: nextMonth, day: 1 });
        const lastOfMonth = firstOfNextMonth.subtract({ days: 1 });
        // Work backwards from the last day to find the last occurrence of weekDay
        for (let i = 0; i < 7; i++) {
            const candidateDate = lastOfMonth.subtract({ days: i });
            if (getDayOfWeek(candidateDate, timezone) === weekDay) {
                return candidateDate;
            }
        }
        return null;
    }
    catch (error) {
        return null;
    }
}
/**
 * Parses a date value from various formats into a DateValue
 * @param dateValue - The date value to parse (string, Date, or DateValue)
 * @returns DateValue or null if parsing fails
 */
export function parseDateValue(dateValue) {
    if (!dateValue)
        return null;
    try {
        // If it's already a DateValue, return it
        if (dateValue && typeof dateValue === 'object' && 'year' in dateValue && 'month' in dateValue && 'day' in dateValue) {
            return dateValue;
        }
        // If it's a string, try to parse it
        if (typeof dateValue === 'string') {
            const date = new Date(dateValue);
            if (isNaN(date.getTime()))
                return null;
            return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
        }
        // If it's a Date object, convert it
        if (dateValue instanceof Date) {
            if (isNaN(dateValue.getTime()))
                return null;
            return new CalendarDate(dateValue.getFullYear(), dateValue.getMonth() + 1, dateValue.getDate());
        }
        // If it's a number (timestamp), convert it
        if (typeof dateValue === 'number' && !isNaN(dateValue)) {
            const date = new Date(dateValue);
            if (isNaN(date.getTime()))
                return null;
            return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
        }
        return null;
    }
    catch (error) {
        return null;
    }
}
/**
 * Safely converts various date formats to DateValue, with fallback to current date
 * @param dateValue - The date value to parse (string, Date, or DateValue)
 * @returns DateValue (guaranteed to return a valid DateValue)
 */
export function ensureDateValue(dateValue) {
    const parsed = parseDateValue(dateValue);
    return parsed || currentDate;
}
/**
 * Converts a DateValue to a JavaScript Date object for chart library compatibility
 * @param dateValue - The DateValue to convert
 * @param timeZone - The timezone to use (default: "UTC")
 * @returns JavaScript Date object
 */
export function dateValueToJSDate(dateValue, timeZone = "UTC") {
    return dateValue.toDate(timeZone);
}
//# sourceMappingURL=dates.js.map
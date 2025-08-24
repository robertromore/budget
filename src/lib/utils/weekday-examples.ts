// Example usage of weekday utility functions
import { CalendarDate, today, getLocalTimeZone, type DateValue } from "@internationalized/date";
import {
  getNextWeekday,
  getNextWeekdayFlexible,
  getNextWeekdayByLabel,
  getFirstWeekday,
} from "./dates";

/**
 * Basic examples of finding next weekdays
 */
export function basicExamples() {
  const today = new CalendarDate(2024, 1, 15); // Monday, January 15, 2024

  // Find next Friday (always excludes current day)
  const nextFriday = getNextWeekday(today, 5);
  console.log("Next Friday:", nextFriday.toString()); // 2024-01-19

  // Find next Monday (will be next week since today is Monday)
  const nextMonday = getNextWeekday(today, 1);
  console.log("Next Monday:", nextMonday.toString()); // 2024-01-22

  // Find next Sunday
  const nextSunday = getNextWeekday(today, 7);
  console.log("Next Sunday:", nextSunday.toString()); // 2024-01-21
}

/**
 * Using the flexible version to optionally include same day
 */
export function flexibleExamples() {
  const monday = new CalendarDate(2024, 1, 15); // Monday, January 15, 2024

  // Find next Monday (excluding today)
  const nextMondayExcluding = getNextWeekdayFlexible(monday, 1, false);
  console.log("Next Monday (excluding today):", nextMondayExcluding.toString()); // 2024-01-22

  // Find next Monday (including today if it's Monday)
  const nextMondayIncluding = getNextWeekdayFlexible(monday, 1, true);
  console.log("Next Monday (including today):", nextMondayIncluding.toString()); // 2024-01-15 (same day)

  // Find next Wednesday from Monday (including today flag doesn't matter since it's not Wednesday)
  const nextWednesday = getNextWeekdayFlexible(monday, 3, true);
  console.log("Next Wednesday:", nextWednesday.toString()); // 2024-01-17
}

/**
 * Using string labels for weekdays
 */
export function labelExamples() {
  const wednesday = new CalendarDate(2024, 1, 17); // Wednesday, January 17, 2024

  // Find next Friday using label
  const nextFriday = getNextWeekdayByLabel(wednesday, "Friday");
  console.log("Next Friday:", nextFriday.toString()); // 2024-01-19

  // Case insensitive - works with any case
  const nextSaturday = getNextWeekdayByLabel(wednesday, "saturday");
  console.log("Next Saturday:", nextSaturday.toString()); // 2024-01-20

  const nextTuesday = getNextWeekdayByLabel(wednesday, "TUESDAY");
  console.log("Next Tuesday:", nextTuesday.toString()); // 2024-01-23

  // Include same day option
  const sameWednesday = getNextWeekdayByLabel(wednesday, "Wednesday", true);
  console.log("Same Wednesday:", sameWednesday.toString()); // 2024-01-17 (same day)
}

/**
 * Using getFirstWeekday to find first occurrence of a weekday in a month
 */
export function firstWeekdayExamples() {
  const someWednesday = new CalendarDate(2024, 3, 20); // Wednesday, March 20, 2024

  // Find the first Wednesday of March 2024
  const firstWednesday = getFirstWeekday(someWednesday);
  console.log("First Wednesday of March 2024:", firstWednesday.toString()); // 2024-03-06

  // Find first Monday of any month
  const someMonday = new CalendarDate(2024, 7, 29); // Monday, July 29, 2024
  const firstMondayOfJuly = getFirstWeekday(someMonday);
  console.log("First Monday of July 2024:", firstMondayOfJuly.toString()); // 2024-07-01

  // Find first Sunday of a month
  const someSunday = new CalendarDate(2024, 2, 25); // Sunday, February 25, 2024
  const firstSundayOfFebruary = getFirstWeekday(someSunday);
  console.log("First Sunday of February 2024:", firstSundayOfFebruary.toString()); // 2024-02-04

  // Use with different timezones
  const dateInUTC = new CalendarDate(2024, 5, 15); // Some date in May
  const firstWeekdayUTC = getFirstWeekday(dateInUTC, "UTC");
  const firstWeekdayLocal = getFirstWeekday(dateInUTC, getLocalTimeZone());
  console.log("First occurrence (UTC):", firstWeekdayUTC.toString());
  console.log("First occurrence (Local):", firstWeekdayLocal.toString());
}

/**
 * Real-world use cases
 */
export function realWorldExamples() {
  const currentDate = today(getLocalTimeZone());

  // Schedule a meeting for next Friday
  const meetingDate = getNextWeekday(currentDate, 5);
  console.log("Schedule meeting for:", meetingDate.toString());

  // Find the next occurrence of multiple weekdays
  const weekdays = [1, 3, 5]; // Monday, Wednesday, Friday
  const nextOccurrences = weekdays.map((weekday) => ({
    weekday,
    date: getNextWeekday(currentDate, weekday),
  }));
  console.log("Next occurrences:", nextOccurrences);

  // Generate recurring dates for the next 4 Mondays
  const recurringMondays = [];
  let currentMonday = getNextWeekday(currentDate, 1);
  for (let i = 0; i < 4; i++) {
    recurringMondays.push(currentMonday);
    currentMonday = currentMonday.add({ days: 7 });
  }
  console.log(
    "Next 4 Mondays:",
    recurringMondays.map((d) => d.toString())
  );

  // Find next business day (Monday-Friday)
  function getNextBusinessDay(fromDate: DateValue): DateValue {
    const jsDate = fromDate.toDate(getLocalTimeZone());
    const currentWeekday = jsDate.getDay() === 0 ? 7 : jsDate.getDay();

    if (currentWeekday === 5) {
      // Friday
      return getNextWeekday(fromDate, 1); // Next Monday
    } else if (currentWeekday === 6) {
      // Saturday
      return getNextWeekday(fromDate, 1); // Next Monday
    } else if (currentWeekday === 7) {
      // Sunday
      return getNextWeekday(fromDate, 1); // Next Monday
    } else {
      return fromDate.add({ days: 1 }); // Next day
    }
  }

  const nextBusinessDay = getNextBusinessDay(currentDate);
  console.log("Next business day:", nextBusinessDay.toString());

  // Working with your existing weekdayOptions
  const weekdayOptions = [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
    { value: 7, label: "Sunday" },
  ];

  // Find next occurrence for each weekday option
  const allNextWeekdays = weekdayOptions.map((option) => ({
    label: option.label,
    value: option.value,
    nextDate: getNextWeekday(currentDate, option.value),
  }));
  console.log("All next weekdays:", allNextWeekdays);

  // Find first occurrence of each weekday in the current month
  const allFirstWeekdays = weekdayOptions.map((option) => {
    // Create a date in current month with the target weekday
    const sampleDate = currentDate.set({ day: 15 }); // Middle of month to ensure we're in the right month
    // We need to find a date that falls on the target weekday first
    const targetWeekdayDate = getNextWeekdayFlexible(sampleDate, option.value, true);
    // If it's not in the same month, use the next occurrence
    const workingDate =
      targetWeekdayDate.month === sampleDate.month
        ? targetWeekdayDate
        : getNextWeekday(sampleDate, option.value);

    return {
      label: option.label,
      value: option.value,
      firstInMonth: getFirstWeekday(workingDate),
    };
  });
  console.log("First occurrence of each weekday this month:", allFirstWeekdays);
}

/**
 * Error handling examples
 */
export function errorHandlingExamples() {
  const someDate = new CalendarDate(2024, 1, 15);

  try {
    // This will throw an error - invalid weekday
    const invalid = getNextWeekday(someDate, 8);
  } catch (error) {
    console.log("Caught error:", (error as Error).message);
  }

  try {
    // This will throw an error - invalid label
    const invalid = getNextWeekdayByLabel(someDate, "Funday");
  } catch (error) {
    console.log("Caught error:", (error as Error).message);
  }

  // Safe usage with validation
  function findNextWeekdaySafely(date: DateValue, weekday: number): DateValue | null {
    try {
      if (weekday >= 0 && weekday <= 6) {
        return getNextWeekday(date, weekday);
      }
      return null;
    } catch (error) {
      console.error("Error finding next weekday:", error);
      return null;
    }
  }

  const safeResult = findNextWeekdaySafely(someDate, 5);
  if (safeResult) {
    console.log("Safe result:", safeResult.toString());
  }
}

/**
 * Integration with your existing date utilities
 */
export function integrationExamples() {
  const currentDate = today(getLocalTimeZone());

  // Combine with your existing date frequency functions
  // For example, find the next 5 Fridays
  const nextFridays = [];
  let fridayDate = getNextWeekday(currentDate, 5);
  for (let i = 0; i < 5; i++) {
    nextFridays.push(fridayDate);
    fridayDate = fridayDate.add({ days: 7 });
  }
  console.log(
    "Next 5 Fridays:",
    nextFridays.map((d) => d.toString())
  );

  // Use with your transaction scheduling
  function scheduleWeeklyTransaction(startDate: DateValue, weekday: number, weeks: number) {
    const transactions = [];
    let transactionDate = getNextWeekdayFlexible(startDate, weekday, true);

    for (let i = 0; i < weeks; i++) {
      transactions.push({
        date: transactionDate,
        // ... other transaction properties
      });
      transactionDate = transactionDate.add({ days: 7 });
    }

    return transactions;
  }

  // Schedule 4 weekly transactions starting next Monday
  const weeklyTransactions = scheduleWeeklyTransaction(currentDate, 1, 4);
  console.log(
    "Weekly transactions:",
    weeklyTransactions.map((t) => t.date.toString())
  );
}

// Run all examples
export function runAllExamples() {
  console.log("=== Basic Examples ===");
  basicExamples();

  console.log("\n=== Flexible Examples ===");
  flexibleExamples();

  console.log("\n=== Label Examples ===");
  labelExamples();

  console.log("\n=== First Weekday Examples ===");
  firstWeekdayExamples();

  console.log("\n=== Real World Examples ===");
  realWorldExamples();

  console.log("\n=== Error Handling Examples ===");
  errorHandlingExamples();

  console.log("\n=== Integration Examples ===");
  integrationExamples();
}

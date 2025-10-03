import {DateFormatter, getLocalTimeZone, parseDate, type DateValue} from "@internationalized/date";
import {getSpecialDateValue} from "./dates";

export const dayFmt = new DateFormatter("en-US", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
export const monthFmt = new DateFormatter("en-US", {
  month: "long",
});
export const monthYearFmt = new DateFormatter("en-US", {
  month: "short",
  year: "numeric",
});
export const monthYearShortFmt = new DateFormatter("en-US", {
  month: "2-digit",
  year: "2-digit",
});
export const dateFormatter = new DateFormatter("en-US", {
  dateStyle: "long",
});
export const rawDateFormatter = new DateFormatter("en-US", {
  dateStyle: "short",
});

export function getSpecialDateValueAsLabel(date: string): string {
  if (!date.includes(":")) {
    return dayFmt.format(parseDate(date).toDate(getLocalTimeZone()));
  }

  const [type, value] = getSpecialDateValue(date);
  switch (type) {
    case "quarter":
      return `Q${value}`;

    case "half-year":
      const date = parseDate(value);
      const half = date.month > 6 ? "2" : "1";
      return `H${half} ${date.year}`;

    case "year":
      return parseDate(value).year.toString();

    case "month":
    default:
      return monthYearFmt.format(parseDate(value).toDate(getLocalTimeZone()));
  }
}

// Define a map for the ordinal suffixes
const suffixMap = {
  one: "st",
  two: "nd",
  few: "rd",
  other: "th",
};

// Create an Intl.PluralRules instance for ordinal numbers in English
const pr = new Intl.PluralRules("en-US", {type: "ordinal"});

// Create an Intl.PluralRules instance for cardinal numbers (for pluralization)
export const pluralRules = new Intl.PluralRules("en-US", {type: "cardinal"});

/** Formats a `Date` as “{short month}. {day}, {year}” e.g. “Aug. 1st, 2023” */
export const formatDate = (d: Date): string => {
  // month abbreviation (e.g. "Aug")
  const monthAbbr = new Intl.DateTimeFormat("en-US", {month: "short"}).format(d);
  const monthWithDot = `${monthAbbr}.`;

  // day + ordinal suffix
  const day = d.getDate();
  // Select the appropriate plural rule for the day
  const ordinalRule = pr.select(day) as keyof typeof suffixMap;
  const dayWithSuffix = `${day}${suffixMap[ordinalRule] ?? "th"}`;

  // year
  const year = new Intl.DateTimeFormat("en-US", {year: "numeric"}).format(d);

  return `${monthWithDot} ${dayWithSuffix}, ${year}`;
};

export function formatDayOfMonth(date: DateValue): string {
  const day = date.day; // Get the day of the month (1-31)

  // Select the appropriate plural rule for the day
  const ordinalRule = pr.select(day) as keyof typeof suffixMap;

  // Combine the day with its corresponding suffix, defaulting to 'th' if not found
  return `${day}${suffixMap[ordinalRule] ?? "th"}`;
}

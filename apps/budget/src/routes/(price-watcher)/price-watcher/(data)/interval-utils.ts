/**
 * Convert a check interval in hours to the most natural display unit.
 */
export function hoursToUnit(hours: number): { value: string; unit: string } {
  if (hours >= 168 && hours % 168 === 0) return { value: String(hours / 168), unit: "weeks" };
  if (hours >= 24 && hours % 24 === 0) return { value: String(hours / 24), unit: "days" };
  if (hours < 1) return { value: String(Math.round(hours * 60)), unit: "minutes" };
  return { value: String(hours), unit: "hours" };
}

/**
 * Convert a value + unit back to hours for database storage.
 * Minimum 1 hour (rounds up from minutes).
 */
export function unitToHours(value: string, unit: string): number {
  const num = parseFloat(value) || 1;
  switch (unit) {
    case "minutes":
      return Math.max(1, Math.round(num / 60));
    case "hours":
      return num;
    case "days":
      return num * 24;
    case "weeks":
      return num * 168;
    default:
      return num;
  }
}

import { describe, test, expect } from 'bun:test';

// Test the core recurring date logic without Svelte runes
// These tests focus on the mathematical and business logic algorithms

describe('Recurring Date Logic', () => {
  describe('Daily Frequency', () => {
    test('should generate daily dates with interval 1', () => {
      // Test simple daily recurrence
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');
      const interval = 1;
      
      const expectedDates = [
        '2024-01-01',
        '2024-01-02', 
        '2024-01-03',
        '2024-01-04',
        '2024-01-05',
        '2024-01-06',
        '2024-01-07'
      ];
      
      const generatedDates = generateDailyDates(startDate, endDate, interval);
      expect(generatedDates.map(d => d.toISOString().split('T')[0])).toEqual(expectedDates);
    });

    test('should generate daily dates with interval 2', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-08');
      const interval = 2;
      
      const expectedDates = [
        '2024-01-01',
        '2024-01-03',
        '2024-01-05',
        '2024-01-07'
      ];
      
      const generatedDates = generateDailyDates(startDate, endDate, interval);
      expect(generatedDates.map(d => d.toISOString().split('T')[0])).toEqual(expectedDates);
    });

    test('should handle interval larger than date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-05');
      const interval = 10;
      
      const generatedDates = generateDailyDates(startDate, endDate, interval);
      expect(generatedDates).toHaveLength(1);
      expect(generatedDates[0].toISOString().split('T')[0]).toBe('2024-01-01');
    });
  });

  describe('Weekly Frequency', () => {
    test('should generate weekly dates with interval 1', () => {
      const startDate = new Date('2024-01-01'); // Monday
      const endDate = new Date('2024-01-29');
      const interval = 1;
      
      const expectedDates = [
        '2024-01-01',
        '2024-01-08',
        '2024-01-15',
        '2024-01-22',
        '2024-01-29'
      ];
      
      const generatedDates = generateWeeklyDates(startDate, endDate, interval);
      expect(generatedDates.map(d => d.toISOString().split('T')[0])).toEqual(expectedDates);
    });

    test('should generate bi-weekly dates', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-02-15');
      const interval = 2;
      
      const expectedDates = [
        '2024-01-01',
        '2024-01-15',
        '2024-01-29',
        '2024-02-12'
      ];
      
      const generatedDates = generateWeeklyDates(startDate, endDate, interval);
      expect(generatedDates.map(d => d.toISOString().split('T')[0])).toEqual(expectedDates);
    });

    test('should handle specific weekdays', () => {
      const startDate = new Date('2024-01-01'); // Monday
      const endDate = new Date('2024-01-15');
      const interval = 1;
      const weekdays = [1, 3, 5]; // Monday, Wednesday, Friday
      
      const generatedDates = generateWeeklyDatesWithWeekdays(startDate, endDate, interval, weekdays);
      const dateStrings = generatedDates.map(d => d.toISOString().split('T')[0]);
      
      // Should include Mondays, Wednesdays, and Fridays
      expect(dateStrings).toContain('2024-01-01'); // Monday
      expect(dateStrings).toContain('2024-01-03'); // Wednesday  
      expect(dateStrings).toContain('2024-01-05'); // Friday
      expect(dateStrings).toContain('2024-01-08'); // Monday
      expect(dateStrings).toContain('2024-01-10'); // Wednesday
      expect(dateStrings).toContain('2024-01-12'); // Friday
      expect(dateStrings).toContain('2024-01-15'); // Monday
    });
  });

  describe('Monthly Frequency', () => {
    test('should generate monthly dates on same day of month', () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-04-20');
      const interval = 1;
      
      const expectedDates = [
        '2024-01-15',
        '2024-02-15',
        '2024-03-15',
        '2024-04-15'
      ];
      
      const generatedDates = generateMonthlyDates(startDate, endDate, interval);
      expect(generatedDates.map(d => d.toISOString().split('T')[0])).toEqual(expectedDates);
    });

    test('should handle month boundary edge cases', () => {
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-04-05');
      const interval = 1;
      
      const generatedDates = generateMonthlyDates(startDate, endDate, interval);
      const dateStrings = generatedDates.map(d => d.toISOString().split('T')[0]);
      
      expect(dateStrings[0]).toBe('2024-01-31');
      // February doesn't have 31st, should adjust to last day of month (29th in leap year)
      expect(dateStrings[1]).toBe('2024-02-29');
      // March should be 31st again
      expect(dateStrings[2]).toBe('2024-03-31');
    });

    test('should generate quarterly dates (interval 3)', () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-12-31');
      const interval = 3;
      
      const expectedDates = [
        '2024-01-15',
        '2024-04-15',
        '2024-07-15',
        '2024-10-15'
      ];
      
      const generatedDates = generateMonthlyDates(startDate, endDate, interval);
      expect(generatedDates.map(d => d.toISOString().split('T')[0])).toEqual(expectedDates);
    });
  });

  describe('Yearly Frequency', () => {
    test('should generate yearly dates', () => {
      const startDate = new Date('2024-03-15');
      const endDate = new Date('2027-06-01');
      const interval = 1;
      
      const expectedDates = [
        '2024-03-15',
        '2025-03-15',
        '2026-03-15',
        '2027-03-15'
      ];
      
      const generatedDates = generateYearlyDates(startDate, endDate, interval);
      expect(generatedDates.map(d => d.toISOString().split('T')[0])).toEqual(expectedDates);
    });

    test('should handle leap year edge cases', () => {
      const startDate = new Date('2024-02-29'); // Leap year
      const endDate = new Date('2026-03-01');
      const interval = 1;
      
      const generatedDates = generateYearlyDates(startDate, endDate, interval);
      const dateStrings = generatedDates.map(d => d.toISOString().split('T')[0]);
      
      expect(dateStrings[0]).toBe('2024-02-29');
      // 2025 is not a leap year, should adjust to Feb 28
      expect(dateStrings[1]).toBe('2025-02-28');
      // 2026 is not a leap year, should also be Feb 28
      expect(dateStrings[2]).toBe('2026-02-28');
    });

    test('should generate dates with multi-year interval', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2030-01-01');
      const interval = 2; // Every 2 years
      
      const expectedDates = [
        '2024-01-01',
        '2026-01-01',
        '2028-01-01',
        '2030-01-01'
      ];
      
      const generatedDates = generateYearlyDates(startDate, endDate, interval);
      expect(generatedDates.map(d => d.toISOString().split('T')[0])).toEqual(expectedDates);
    });
  });

  describe('Weekend Adjustments', () => {
    test('should move weekend dates to next weekday', () => {
      // Saturday and Sunday should move to Monday
      const saturdayDate = new Date('2024-01-06'); // Saturday
      const sundayDate = new Date('2024-01-07'); // Sunday
      
      const adjustedSaturday = adjustWeekendToNext(saturdayDate);
      const adjustedSunday = adjustWeekendToNext(sundayDate);
      
      expect(adjustedSaturday.toISOString().split('T')[0]).toBe('2024-01-08'); // Monday
      expect(adjustedSunday.toISOString().split('T')[0]).toBe('2024-01-08'); // Monday
    });

    test('should move weekend dates to previous weekday', () => {
      const saturdayDate = new Date('2024-01-06'); // Saturday
      const sundayDate = new Date('2024-01-07'); // Sunday
      
      const adjustedSaturday = adjustWeekendToPrevious(saturdayDate);
      const adjustedSunday = adjustWeekendToPrevious(sundayDate);
      
      expect(adjustedSaturday.toISOString().split('T')[0]).toBe('2024-01-05'); // Friday
      expect(adjustedSunday.toISOString().split('T')[0]).toBe('2024-01-05'); // Friday
    });

    test('should leave weekdays unchanged', () => {
      const mondayDate = new Date('2024-01-01');
      const fridayDate = new Date('2024-01-05');
      
      const adjustedMonday = adjustWeekendToNext(mondayDate);
      const adjustedFriday = adjustWeekendToPrevious(fridayDate);
      
      expect(adjustedMonday.toISOString().split('T')[0]).toBe('2024-01-01');
      expect(adjustedFriday.toISOString().split('T')[0]).toBe('2024-01-05');
    });
  });

  describe('Date Limits and Constraints', () => {
    test('should respect occurrence limits', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31'); // Large range
      const interval = 1;
      const limit = 5;
      
      const generatedDates = generateDailyDatesWithLimit(startDate, endDate, interval, limit);
      expect(generatedDates).toHaveLength(5);
      
      const expectedDates = [
        '2024-01-01',
        '2024-01-02',
        '2024-01-03',
        '2024-01-04',
        '2024-01-05'
      ];
      
      expect(generatedDates.map(d => d.toISOString().split('T')[0])).toEqual(expectedDates);
    });

    test('should respect end date over limit', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');
      const interval = 1;
      const limit = 10; // Limit is larger than date range
      
      const generatedDates = generateDailyDatesWithLimit(startDate, endDate, interval, limit);
      expect(generatedDates).toHaveLength(3); // Limited by end date, not limit
    });

    test('should handle zero limit', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-10');
      const interval = 1;
      const limit = 0;
      
      const generatedDates = generateDailyDatesWithLimit(startDate, endDate, interval, limit);
      expect(generatedDates).toHaveLength(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle start date after end date', () => {
      const startDate = new Date('2024-01-10');
      const endDate = new Date('2024-01-01'); // Earlier than start
      const interval = 1;
      
      const generatedDates = generateDailyDates(startDate, endDate, interval);
      expect(generatedDates).toHaveLength(0);
    });

    test('should handle zero interval', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-10');
      const interval = 0;
      
      const generatedDates = generateDailyDates(startDate, endDate, interval);
      expect(generatedDates).toHaveLength(0);
    });

    test('should handle negative interval', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-10');
      const interval = -1;
      
      const generatedDates = generateDailyDates(startDate, endDate, interval);
      expect(generatedDates).toHaveLength(0);
    });

    test('should deduplicate dates', () => {
      const dates = [
        new Date('2024-01-01'),
        new Date('2024-01-02'),
        new Date('2024-01-01'), // Duplicate
        new Date('2024-01-03'),
        new Date('2024-01-02'), // Duplicate
      ];
      
      const uniqueDates = deduplicateDates(dates);
      expect(uniqueDates).toHaveLength(3);
      
      const uniqueStrings = uniqueDates.map(d => d.toISOString().split('T')[0]).sort();
      expect(uniqueStrings).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
    });

    test('should sort dates correctly', () => {
      const dates = [
        new Date('2024-01-03'),
        new Date('2024-01-01'),
        new Date('2024-01-05'),
        new Date('2024-01-02'),
        new Date('2024-01-04'),
      ];
      
      const sortedDates = sortDates(dates);
      const sortedStrings = sortedDates.map(d => d.toISOString().split('T')[0]);
      expect(sortedStrings).toEqual([
        '2024-01-01',
        '2024-01-02', 
        '2024-01-03',
        '2024-01-04',
        '2024-01-05'
      ]);
    });
  });
});

// Helper functions for testing - simplified implementations
function generateDailyDates(startDate: Date, endDate: Date, interval: number): Date[] {
  if (interval <= 0 || startDate > endDate) return [];
  
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + interval);
  }
  
  return dates;
}

function generateDailyDatesWithLimit(startDate: Date, endDate: Date, interval: number, limit: number): Date[] {
  if (limit === 0) return [];
  
  const dates = generateDailyDates(startDate, endDate, interval);
  return dates.slice(0, limit);
}

function generateWeeklyDates(startDate: Date, endDate: Date, interval: number): Date[] {
  if (interval <= 0 || startDate > endDate) return [];
  
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + (interval * 7));
  }
  
  return dates;
}

function generateWeeklyDatesWithWeekdays(startDate: Date, endDate: Date, interval: number, weekdays: number[]): Date[] {
  if (interval <= 0 || startDate > endDate || weekdays.length === 0) return [];
  
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  // Find the start of the week containing startDate
  const weekStart = new Date(current);
  weekStart.setDate(current.getDate() - current.getDay() + 1); // Monday = 1
  
  let weekCounter = 0;
  while (weekStart <= endDate) {
    if (weekCounter % interval === 0) {
      // Add dates for specified weekdays in this week
      weekdays.forEach(weekday => {
        const dateInWeek = new Date(weekStart);
        dateInWeek.setDate(weekStart.getDate() + weekday - 1);
        
        if (dateInWeek >= startDate && dateInWeek <= endDate) {
          dates.push(new Date(dateInWeek));
        }
      });
    }
    
    weekStart.setDate(weekStart.getDate() + 7);
    weekCounter++;
  }
  
  return dates.sort((a, b) => a.getTime() - b.getTime());
}

function generateMonthlyDates(startDate: Date, endDate: Date, interval: number): Date[] {
  if (interval <= 0 || startDate > endDate) return [];
  
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    dates.push(new Date(current));
    
    // Move to next month(s), handling month boundary issues
    const targetMonth = current.getMonth() + interval;
    const targetYear = current.getFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = targetMonth % 12;
    
    // Try to keep the same day of month, but adjust if it doesn't exist
    const dayOfMonth = startDate.getDate();
    current.setFullYear(targetYear, normalizedMonth, 1);
    
    // Get the last day of the target month
    const lastDayOfMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
    current.setDate(Math.min(dayOfMonth, lastDayOfMonth));
  }
  
  return dates;
}

function generateYearlyDates(startDate: Date, endDate: Date, interval: number): Date[] {
  if (interval <= 0 || startDate > endDate) return [];
  
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    dates.push(new Date(current));
    
    // Move to next year(s), handling leap year edge cases
    const targetYear = current.getFullYear() + interval;
    const month = startDate.getMonth();
    const dayOfMonth = startDate.getDate();
    
    current.setFullYear(targetYear, month, 1);
    
    // Handle February 29th in non-leap years
    if (month === 1 && dayOfMonth === 29) {
      const isLeapYear = (targetYear % 4 === 0 && targetYear % 100 !== 0) || (targetYear % 400 === 0);
      current.setDate(isLeapYear ? 29 : 28);
    } else {
      current.setDate(dayOfMonth);
    }
  }
  
  return dates;
}

function adjustWeekendToNext(date: Date): Date {
  const adjusted = new Date(date);
  const dayOfWeek = adjusted.getDay(); // 0 = Sunday, 6 = Saturday
  
  if (dayOfWeek === 6) { // Saturday
    adjusted.setDate(adjusted.getDate() + 2); // Move to Monday
  } else if (dayOfWeek === 0) { // Sunday
    adjusted.setDate(adjusted.getDate() + 1); // Move to Monday
  }
  
  return adjusted;
}

function adjustWeekendToPrevious(date: Date): Date {
  const adjusted = new Date(date);
  const dayOfWeek = adjusted.getDay();
  
  if (dayOfWeek === 6) { // Saturday
    adjusted.setDate(adjusted.getDate() - 1); // Move to Friday
  } else if (dayOfWeek === 0) { // Sunday
    adjusted.setDate(adjusted.getDate() - 2); // Move to Friday
  }
  
  return adjusted;
}

function deduplicateDates(dates: Date[]): Date[] {
  const uniqueDates = new Map<string, Date>();
  
  dates.forEach(date => {
    const key = date.toISOString().split('T')[0];
    if (!uniqueDates.has(key)) {
      uniqueDates.set(key, date);
    }
  });
  
  return Array.from(uniqueDates.values());
}

function sortDates(dates: Date[]): Date[] {
  return dates.slice().sort((a, b) => a.getTime() - b.getTime());
}
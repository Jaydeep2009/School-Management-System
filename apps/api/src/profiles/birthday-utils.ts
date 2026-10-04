/**
 * Birthday Utility Functions
 * 
 * Handles birthday date calculations with proper year boundary handling
 */

/**
 * Get today's date in MM-DD format
 * @param timezone - Optional timezone (defaults to UTC)
 */
export function getTodayMMDD(timezone: string = 'UTC'): string {
  const now = new Date();
  
  if (timezone === 'UTC') {
    const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = now.getUTCDate().toString().padStart(2, '0');
    return `${month}-${day}`;
  }
  
  // Use Intl.DateTimeFormat for timezone conversion
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: '2-digit',
    day: '2-digit',
  });
  
  const parts = formatter.formatToParts(now);
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';
  
  return `${month}-${day}`;
}

/**
 * Calculate days until birthday from a given date
 * Handles year boundaries correctly (e.g., Dec 28 to Jan 2)
 * 
 * @param dobMd - Birthday in MM-DD format
 * @param fromDate - Reference date (defaults to now)
 * @returns Number of days until birthday (0 if today, negative if impossible)
 */
export function calculateDaysUntilBirthday(
  dobMd: string,
  fromDate: Date = new Date()
): number {
  const [month, day] = dobMd.split('-').map(Number);
  
  if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    return -1; // Invalid date
  }
  
  const currentYear = fromDate.getFullYear();
  
  // Try birthday in current year
  let birthdayThisYear = new Date(currentYear, month - 1, day);
  
  // If birthday already passed this year, use next year
  if (birthdayThisYear < fromDate) {
    birthdayThisYear = new Date(currentYear + 1, month - 1, day);
  }
  
  // Calculate difference in milliseconds
  const diffMs = birthdayThisYear.getTime() - fromDate.getTime();
  
  // Convert to days (rounding down)
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Filter birthdays to only those within the next 7 days
 * Properly handles year boundaries (Dec -> Jan)
 * 
 * @param birthdays - Array of objects with dob_md property
 * @param fromDate - Reference date (defaults to now)
 * @returns Filtered array of birthdays within next 7 days
 */
export function filterBirthdaysThisWeek<T extends { dob_md: string }>(
  birthdays: T[],
  fromDate: Date = new Date()
): T[] {
  return birthdays.filter(b => {
    const daysUntil = calculateDaysUntilBirthday(b.dob_md, fromDate);
    return daysUntil >= 0 && daysUntil < 7;
  });
}

/**
 * Sort birthdays by upcoming date (nearest first)
 * Handles year boundaries correctly
 * 
 * @param birthdays - Array of objects with dob_md property
 * @param fromDate - Reference date (defaults to now)
 * @returns Sorted array (nearest birthdays first)
 */
export function sortBirthdaysByUpcoming<T extends { dob_md: string }>(
  birthdays: T[],
  fromDate: Date = new Date()
): T[] {
  return [...birthdays].sort((a, b) => {
    const daysA = calculateDaysUntilBirthday(a.dob_md, fromDate);
    const daysB = calculateDaysUntilBirthday(b.dob_md, fromDate);
    return daysA - daysB;
  });
}

/**
 * Format days until birthday as human-readable string
 * 
 * @param daysUntil - Number of days
 * @returns Formatted string (e.g., "Today!", "Tomorrow", "In 5 days")
 */
export function formatDaysUntil(daysUntil: number): string {
  if (daysUntil === 0) return 'Today!';
  if (daysUntil === 1) return 'Tomorrow';
  if (daysUntil < 0) return 'Past';
  return `In ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
}

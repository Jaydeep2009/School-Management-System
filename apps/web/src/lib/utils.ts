/**
 * Utility functions
 */

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const day = days[d.getDay()];
  const date_num = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  return `${day}, ${date_num} ${month} ${year}`;
}

export function formatAcademicYear(startsOn: string, endsOn: string): string {
  const startYear = new Date(startsOn).getFullYear();
  const endYear = new Date(endsOn).getFullYear();
  const endYearShort = endYear.toString().slice(-2);
  return `${startYear}–${endYearShort}`;
}

export function getMonthName(month: number): string {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return months[month - 1] || '';
}

export function getInitials(name: string): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

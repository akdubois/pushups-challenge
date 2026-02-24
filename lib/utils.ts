import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parses a YYYY-MM-DD date string as a local date (not UTC).
 * This prevents timezone shifts that occur when parseISO treats dates as UTC.
 *
 * Example: "2026-02-13" becomes Feb 13 in local timezone, not Feb 12 (if in MST).
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

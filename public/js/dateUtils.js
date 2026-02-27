/**
 * Date utility functions for calendar logic.
 */

// Returns the number of days in a given month and year
export function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

// Returns the day of the week (0-6) the month starts on
export function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

// Formats a Date object to YYYY-MM-DD
export function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Parses YYYY-MM-DD to a local Date object 
// (avoiding timezone offset issues with standard Date parsing)
export function parseDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return new Date(year, month - 1, day);
}

// Check if two Date objects represent the same day
export function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
}

// Check if date represents "today"
export function isToday(date) {
    const today = new Date();
    return isSameDay(date, today);
}

// Returns a new Date object with `days` added
export function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// Submits a date, returns the start of that week (Sunday)
export function getStartOfWeek(date) {
    const result = new Date(date);
    const day = result.getDay();
    result.setDate(result.getDate() - day);
    return result;
}

// Array of month names
export const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Array of short weekday names
export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

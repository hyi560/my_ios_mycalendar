/**
 * Global application state management.
 */

export const state = {
    currentDate: new Date(),
    view: 'month', // 'month' or 'week'
    events: [],
    filters: {
        event: true,
        task: true
    },
    theme: 'dark' // default
};

// Listeners for state changes
const listeners = [];

export function subscribe(callback) {
    listeners.push(callback);
}

export function notify() {
    listeners.forEach(cb => cb());
}

// Persist data to localStorage
function saveToStorage() {
    localStorage.setItem('calendar-events', JSON.stringify(state.events));
    localStorage.setItem('calendar-theme', state.theme);
}

// Load data from localStorage
export function loadFromStorage() {
    const savedEvents = localStorage.getItem('calendar-events');
    if (savedEvents) {
        state.events = JSON.parse(savedEvents);
    } else {
        // Mock data for initial view
        state.events = [
            {
                id: '1',
                title: 'Team Meeting',
                date: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                time: '10:00',
                type: 'event',
                note: 'Discuss Q4 goals.',
                isRecurring: false,
                recurrence: null,
                isAllDay: false,
                endTime: '',
                enableDiscussion: false,
                discussion: [],
                autoRotateTasks: false,
                attachments: [],
                participants: []
            },
            {
                id: '2',
                title: 'Finish UI Mockups',
                date: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                time: '',
                type: 'task',
                note: 'Review with design team.',
                isRecurring: false,
                recurrence: null,
                isAllDay: false,
                endTime: '',
                enableDiscussion: false,
                discussion: [],
                autoRotateTasks: false,
                attachments: [],
                participants: []
            }
        ];
        saveToStorage();
    }

    const savedTheme = localStorage.getItem('calendar-theme');
    if (savedTheme) {
        state.theme = savedTheme;
    }
}

// CRUD operations
export function addEvent(eventData) {
    const newEvent = {
        id: Date.now().toString(),
        isRecurring: false,
        recurrence: null,
        isAllDay: false,
        date: eventData.date || new Date().toISOString().split('T')[0],
        endDate: eventData.endDate || eventData.date || new Date().toISOString().split('T')[0],
        endTime: '',
        enableDiscussion: false,
        discussion: [],
        autoRotateTasks: false,
        attachments: [],
        participants: [],
        ...eventData
    };
    state.events.push(newEvent);
    saveToStorage();
    notify();
}

export function updateEvent(id, updatedData) {
    const index = state.events.findIndex(e => e.id === id);
    if (index !== -1) {
        state.events[index] = { ...state.events[index], ...updatedData };
        saveToStorage();
        notify();
    }
}

export function deleteEvent(id) {
    state.events = state.events.filter(e => e.id !== id);
    saveToStorage();
    notify();
}

export function getEventById(id) {
    return state.events.find(e => e.id === id);
}

export function addDiscussionMessage(id, sender, message) {
    const event = state.events.find(e => e.id === id);
    if (event) {
        if (!event.discussion) event.discussion = [];
        event.discussion.push({
            sender,
            message,
            timestamp: new Date().toISOString()
        });
        saveToStorage();
        notify();
    }
}

// ─── Recurring Event Expansion ────────────────────────────────────────────────

import { formatDate } from './dateUtils.js';

/**
 * Check if a recurring event should appear on a given date.
 * @param {object} event - The master event record
 * @param {Date} date - The calendar date to check
 * @returns {number|false} occurrence index (0-based) or false if no match
 */
function getRecurrenceOccurrence(event, date) {
    if (!event.isRecurring || !event.recurrence) return false;

    const { frequency, endType, endDate } = event.recurrence;
    const start = parseDateStr(event.date);
    const check = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());

    // Must be on or after start date
    if (check < startDay) return false;

    // Must be on or before end date (if set)
    if (endType === 'date' && endDate) {
        const end = parseDateStr(endDate);
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        if (check > endDay) return false;
    }

    // Check frequency match
    switch (frequency) {
        case 'daily': {
            const diffMs = check - startDay;
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays >= 0) return diffDays;
            return false;
        }
        case 'weekly': {
            if (check.getDay() !== startDay.getDay()) return false;
            const diffMs = check - startDay;
            const diffWeeks = Math.round(diffMs / (1000 * 60 * 60 * 24 * 7));
            if (diffWeeks >= 0) return diffWeeks;
            return false;
        }
        case 'monthly': {
            if (check.getDate() !== startDay.getDate()) return false;
            const monthDiff = (check.getFullYear() - startDay.getFullYear()) * 12
                + (check.getMonth() - startDay.getMonth());
            if (monthDiff >= 0) return monthDiff;
            return false;
        }
        case 'yearly': {
            if (check.getDate() !== startDay.getDate()) return false;
            if (check.getMonth() !== startDay.getMonth()) return false;
            const yearDiff = check.getFullYear() - startDay.getFullYear();
            if (yearDiff >= 0) return yearDiff;
            return false;
        }
        default:
            return false;
    }
}

function parseDateStr(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

// Retrieve events for a specific Date, considering filters
export function getEventsForDate(date) {
    const dateStr = formatDate(date);
    const result = [];

    for (const event of state.events) {
        if (!state.filters[event.type]) continue;

        if (!event.isRecurring) {
            // Check if date is within [event.date, event.endDate]
            if (dateStr >= event.date && dateStr <= (event.endDate || event.date)) {
                result.push({ ...event, _occurrenceIndex: 0 });
            }
        } else {
            // Recurring event: check if this date is an occurrence
            const occIndex = getRecurrenceOccurrence(event, date);
            if (occIndex !== false) {
                // Build a virtual occurrence with rotated tasks if needed
                const occurrence = buildOccurrence(event, occIndex);
                result.push(occurrence);
            }
        }
    }

    return result.sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1;
        if (b.time) return 1;
        return 0;
    });
}

/**
 * Build an occurrence object, rotating participant tasks if autoRotateTasks is on.
 */
function buildOccurrence(event, occurrenceIndex) {
    const occurrence = { ...event, _occurrenceIndex: occurrenceIndex };

    if (event.autoRotateTasks && event.participants && event.participants.length > 1) {
        const count = event.participants.length;
        const shift = occurrenceIndex % count;
        // Get only participants that have tasks
        const tasks = event.participants.map(p => p.task);
        const rotatedParticipants = event.participants.map((p, i) => ({
            ...p,
            task: tasks[(i + shift) % count]
        }));
        occurrence.participants = rotatedParticipants;
    }

    return occurrence;
}

// Navigation / View state
export function setDate(date) {
    state.currentDate = new Date(date);
    notify();
}

export function setView(viewMode) {
    state.view = viewMode;
    notify();
}

export function toggleFilter(type, isVisible) {
    state.filters[type] = isVisible;
    notify();
}

export function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    saveToStorage();
    notify();
}

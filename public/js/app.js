import {
    state,
    loadFromStorage,
    subscribe,
    setDate,
    setView,
    toggleTheme,
    toggleFilter,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventById
} from './state.js';
import { renderApp, openModal, closeModal, addParticipant, getTempParticipants, openDetailModal, closeDetailModal, showConfirm, getTempAttachments, setupUIListeners } from './ui.js';
import { parseDate, addDays, getStartOfWeek } from './dateUtils.js';

// Application Initialization
function init() {
    loadFromStorage();
    // Check for Imported Event in URL
    const urlParams = new URLSearchParams(window.location.search);
    const importData = urlParams.get('import');
    if (importData) {
        try {
            const json = decodeURIComponent(escape(atob(importData)));
            const eventData = JSON.parse(json);
            // Sanitize: ensure no ID and fresh timestamps if needed
            delete eventData.id;

            import('./ui.js').then(ui => {
                ui.openModal(eventData);
            });

            // Clean URL after import attempt
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
            console.error('Failed to import event', e);
        }
    }
    subscribe(renderApp); // Re-render whenever state changes
    setupEventListeners();
    setupUIListeners();
    renderApp(); // Initial render
}

function setupEventListeners() {
    // Header Navigation
    document.getElementById('btn-prev').addEventListener('click', () => navigate(-1));
    document.getElementById('btn-next').addEventListener('click', () => navigate(1));
    document.getElementById('btn-today').addEventListener('click', () => {
        setDate(new Date());
    });

    // View toggles
    document.getElementById('btn-view-month').addEventListener('click', (e) => {
        setView('month');
        e.target.classList.add('active');
        document.getElementById('btn-view-week').classList.remove('active');
    });
    document.getElementById('btn-view-week').addEventListener('click', (e) => {
        setView('week');
        e.target.classList.add('active');
        document.getElementById('btn-view-month').classList.remove('active');
    });

    // Theme toggle
    document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);

    // Sidebar Filters
    document.querySelectorAll('.sidebar-nav input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const type = e.target.dataset.filter;
            toggleFilter(type, e.target.checked);
        });
    });

    // Modal Open/Close
    document.getElementById('btn-create-event').addEventListener('click', () => openModal(null));
    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);

    // Mobile FAB — opens modal
    document.getElementById('btn-fab').addEventListener('click', () => openModal(null));

    // Detail popup close button
    document.getElementById('btn-close-detail').addEventListener('click', closeDetailModal);

    // Detail popup — Edit button opens edit modal
    document.getElementById('btn-edit-event').addEventListener('click', (e) => {
        const eventId = e.currentTarget.dataset.eventId;
        const eventData = getEventById(eventId);
        closeDetailModal();
        if (eventData) openModal(eventData);
    });

    // Close detail popup when clicking outside
    document.getElementById('detail-overlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('detail-overlay')) closeDetailModal();
    });

    // Close edit modal when clicking outside
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal-overlay')) closeModal();
    });

    // Mobile sidebar toggle (hamburger)
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.remove('hidden');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.add('hidden');
    }

    document.getElementById('btn-sidebar-toggle').addEventListener('click', () => {
        sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
    sidebarOverlay.addEventListener('click', closeSidebar);

    // Add Participant button
    document.getElementById('btn-add-participant').addEventListener('click', () => {
        const input = document.getElementById('participant-name-input');
        addParticipant(input.value);
        input.value = '';
        input.focus();
    });

    // Allow pressing Enter in participant name field to add
    document.getElementById('participant-name-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const input = document.getElementById('participant-name-input');
            addParticipant(input.value);
            input.value = '';
        }
    });

    document.getElementById('event-location-input').addEventListener('dblclick', (e) => {
        const loc = e.target.value.trim();
        if (loc) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`, '_blank');
        }
    });

    // --- Time & All Day Toggle ---
    document.getElementById('event-allday-toggle').addEventListener('change', (e) => {
        const timeInputsRow = document.getElementById('time-inputs-row');
        if (e.target.checked) {
            timeInputsRow.classList.add('hidden');
            document.getElementById('event-time-input').value = '';
            document.getElementById('event-endtime-input').value = '';
        } else {
            timeInputsRow.classList.remove('hidden');
        }
    });

    // --- Recurrence & Attachment Toggles ---

    // Toggle recurrence options based on One-time vs Recurring
    document.querySelectorAll('input[name="recurrence-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const options = document.getElementById('recurrence-options');
            if (e.target.value === 'recurring') {
                options.classList.remove('hidden');
            } else {
                options.classList.add('hidden');
            }
            // Check auto-rotate visibility too
            import('./ui.js').then(m => m.checkAutoRotateVisibility());
        });
    });

    // Toggle end date row based on By Date vs Indefinite
    document.querySelectorAll('input[name="recurrence-end"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const dateRow = document.getElementById('recurrence-end-date-row');
            if (e.target.value === 'date') {
                dateRow.classList.remove('hidden');
            } else {
                dateRow.classList.add('hidden');
            }
        });
    });

    // File input change listener
    document.getElementById('file-input').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            import('./ui.js').then(m => m.addAttachments(e.target.files));
        }
    });

    // Form Submit (Create/Update)
    document.getElementById('event-form').addEventListener('submit', (e) => {
        e.preventDefault();

        const dateInput = document.getElementById('event-date-input').value;
        const endDateInput = document.getElementById('event-enddate-input').value;

        if (endDateInput < dateInput) {
            alert('End date cannot be before start date.');
            return;
        }

        const id = document.getElementById('event-id').value;
        const isRecurring = document.querySelector('input[name="recurrence-type"]:checked').value === 'recurring';

        const formData = {
            title: document.getElementById('event-title-input').value,
            date: document.getElementById('event-date-input').value,
            endDate: document.getElementById('event-enddate-input').value || document.getElementById('event-date-input').value,
            isAllDay: document.getElementById('event-allday-toggle').checked,
            time: document.getElementById('event-time-input').value,
            endTime: document.getElementById('event-endtime-input').value,
            note: document.getElementById('event-note-input').value,
            type: document.querySelector('input[name="event-type"]:checked').value,
            location: document.getElementById('event-location-input').value.trim(),
            enableDiscussion: document.getElementById('enable-discussion-toggle').checked,
            participants: getTempParticipants().map(p => ({
                name: p.name,
                email: p.email || '',
                phone: p.phone || '',
                task: p.task || ''
            })),
            isRecurring: isRecurring,
            recurrence: isRecurring ? {
                frequency: document.querySelector('input[name="recurrence-freq"]:checked').value,
                endType: document.querySelector('input[name="recurrence-end"]:checked').value,
                endDate: document.getElementById('recurrence-end-date').value
            } : null,
            autoRotateTasks: document.getElementById('auto-rotate-toggle').checked,
            attachments: getTempAttachments().map(a => ({ ...a }))
        };

        if (id) {
            updateEvent(id, formData);
        } else {
            addEvent(formData);
        }
        closeModal();
    });

    // Delete Event
    document.getElementById('btn-delete-event').addEventListener('click', async () => {
        const id = document.getElementById('event-id').value;
        if (id) {
            const confirmed = await showConfirm(
                'Delete Activity?',
                'Are you sure you want to delete this activity? All occurrences of recurring events will be removed.'
            );
            if (confirmed) {
                deleteEvent(id);
                closeModal();
            }
        }
    });

    // Delegate clicks for the calendar container
    document.getElementById('calendar-container').addEventListener('click', (e) => {
        // View event detail on event pill click
        const eventEl = e.target.closest('.calendar-event');
        if (eventEl) {
            e.stopPropagation();
            const eventId = eventEl.dataset.id;
            const eventData = getEventById(eventId);
            if (eventData) openDetailModal(eventData);
            return;
        }

        // Add new event on blank day/column click
        const cellEl = e.target.closest('.day-cell') || e.target.closest('.week-column');
        if (cellEl) {
            const dateStr = cellEl.dataset.date;
            openModal(null, dateStr);
        }
    });
}

function navigate(direction) {
    const current = new Date(state.currentDate);
    if (state.view === 'month') {
        current.setMonth(current.getMonth() + direction);
    } else {
        current.setDate(current.getDate() + (direction * 7));
    }
    setDate(current);
}

// Kickoff
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

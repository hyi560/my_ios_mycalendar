import { state, getEventsForDate } from './state.js';
import {
    getDaysInMonth,
    getFirstDayOfMonth,
    addDays,
    formatDate,
    isSameDay,
    isToday,
    MONTH_NAMES,
    WEEKDAYS_SHORT,
    getStartOfWeek,
    parseDate
} from './dateUtils.js';

// DOM Elements
const elements = {
    container: document.getElementById('calendar-container'),
    monthYearDisplay: document.getElementById('current-month-year'),
    miniCalendar: document.getElementById('mini-calendar'),
    themeToggleIconLight: document.getElementById('icon-light-theme'),
    themeToggleIconDark: document.getElementById('icon-dark-theme')
};

export function renderApp() {
    updateTheme();
    updateHeader();

    if (state.view === 'month') {
        renderMonthView();
    } else {
        renderWeekView();
    }

    // Always render mini calendar
    renderMiniCalendar();

    // Re-initialize icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function updateTheme() {
    if (state.theme === 'dark') {
        document.body.classList.add('theme-dark');
        elements.themeToggleIconLight.classList.remove('hidden');
        elements.themeToggleIconDark.classList.add('hidden');
    } else {
        document.body.classList.remove('theme-dark');
        elements.themeToggleIconLight.classList.add('hidden');
        elements.themeToggleIconDark.classList.remove('hidden');
    }
}

function updateHeader() {
    const d = state.currentDate;
    if (state.view === 'month') {
        elements.monthYearDisplay.textContent = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    } else {
        const start = getStartOfWeek(d);
        const end = addDays(start, 6);
        if (start.getMonth() === end.getMonth()) {
            elements.monthYearDisplay.textContent = `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
        } else {
            elements.monthYearDisplay.textContent = `${MONTH_NAMES[start.getMonth()]} - ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
        }
    }
}

function renderEventsSnippet(date) {
    const events = getEventsForDate(date);
    if (events.length === 0) return '';

    return events.map(event => {
        const timeStr = event.time ? `<span class="event-time">${event.time}</span>` : '';
        const recurIcon = event.isRecurring ? `<span class="event-recur-icon" title="Recurring">↺</span>` : '';
        return `
            <div class="calendar-event type-${event.type}" data-id="${event.id}" title="${event.title}">
                <div class="event-indicator"></div>
                <div class="event-content">
                    ${timeStr}
                    <span class="event-title">${event.title}</span>
                    ${recurIcon}
                </div>
            </div>
        `;
    }).join('');
}

function renderMonthView() {
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month === 0 ? 11 : month - 1);

    let html = `
        <div class="month-grid">
            <div class="weekdays-row">
                ${WEEKDAYS_SHORT.map(day => `<div class="weekday-header">${day}</div>`).join('')}
            </div>
            <div class="days-grid">
    `;

    for (let i = firstDay - 1; i >= 0; i--) {
        const date = new Date(year, month - 1, daysInPrevMonth - i);
        html += `<div class="day-cell padding-day" data-date="${formatDate(date)}">
             <span class="day-number">${date.getDate()}</span>
             <div class="events-container">${renderEventsSnippet(date)}</div>
        </div>`;
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i);
        const todayClass = isToday(date) ? 'today' : '';
        html += `<div class="day-cell ${todayClass}" data-date="${formatDate(date)}">
             <span class="day-number">${i}</span>
             <div class="events-container">${renderEventsSnippet(date)}</div>
        </div>`;
    }

    const totalCells = firstDay + daysInMonth;
    const remainingCells = 42 - totalCells;

    for (let i = 1; i <= remainingCells; i++) {
        const date = new Date(year, month + 1, i);
        html += `<div class="day-cell padding-day" data-date="${formatDate(date)}">
             <span class="day-number">${i}</span>
             <div class="events-container">${renderEventsSnippet(date)}</div>
        </div>`;
    }

    html += `</div></div>`;
    elements.container.innerHTML = html;
}

function renderWeekView() {
    const startOfWeek = getStartOfWeek(state.currentDate);

    let html = `
        <div class="week-grid">
            <div class="weekdays-header-row">
    `;

    for (let i = 0; i < 7; i++) {
        const date = addDays(startOfWeek, i);
        const todayClass = isToday(date) ? 'today' : '';
        html += `
            <div class="week-day-header ${todayClass}">
                <span class="dow">${WEEKDAYS_SHORT[date.getDay()]}</span>
                <span class="dom">${date.getDate()}</span>
            </div>
        `;
    }

    html += `</div><div class="week-columns-row">`;

    for (let i = 0; i < 7; i++) {
        const date = addDays(startOfWeek, i);
        html += `
            <div class="week-column" data-date="${formatDate(date)}">
                <div class="events-container flex-col">
                    ${renderEventsSnippet(date)}
                </div>
            </div>
        `;
    }

    html += `</div></div>`;
    elements.container.innerHTML = html;
}

function renderMiniCalendar() {
    const d = state.currentDate;
    const dStr = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    elements.miniCalendar.innerHTML = `
        <div class="mini-cal-header">
            <h4>${dStr}</h4>
        </div>
        <div class="mini-cal-grid">
            <p style="font-size: 0.8rem; color: var(--text-secondary); text-align: center; padding: 1rem 0;">Small preview grid</p>
        </div>
    `;
}

// --- Custom Confirmation Modal ---
let _confirmResolve = null;

export function showConfirm(title, message, okText = 'Delete') {
    const overlay = document.getElementById('confirm-overlay');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    const okBtn = document.getElementById('btn-confirm-ok');
    okBtn.textContent = okText;

    overlay.style.zIndex = '2000';
    overlay.classList.remove('hidden');

    return new Promise((resolve) => {
        _confirmResolve = resolve;
    });
}

export function hideConfirm(result) {
    const overlay = document.getElementById('confirm-overlay');
    overlay.classList.add('hidden');
    if (_confirmResolve) {
        _confirmResolve(result);
        _confirmResolve = null;
    }
}

export function setupUIListeners() {
    const cancelBtn = document.getElementById('btn-confirm-cancel');
    const okBtn = document.getElementById('btn-confirm-ok');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            hideConfirm(false);
        });
    }

    if (okBtn) {
        okBtn.addEventListener('click', () => {
            hideConfirm(true);
        });
    }

    document.getElementById('confirm-overlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('confirm-overlay')) hideConfirm(false);
    });
}

// --- Participant helpers ---

let _tempParticipants = [];

export function getTempParticipants() {
    return _tempParticipants;
}

function getInitials(name) {
    return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function renderParticipantCard(p, index) {
    const el = document.createElement('div');
    el.className = 'participant-card';
    el.dataset.index = index;
    el.innerHTML = `
        <div class="participant-card-header">
            <div class="participant-info">
                <div class="participant-avatar">${getInitials(p.name)}</div>
                <span class="participant-name">${p.name}</span>
            </div>
            <button type="button" class="btn-remove-participant" data-index="${index}" title="Remove">✕</button>
        </div>
        <input type="email" class="participant-email-input" placeholder="Email (optional)" value="${p.email || ''}">
        <input type="tel" class="participant-phone-input" placeholder="Phone (optional)" value="${p.phone || ''}">
        <input type="text" class="participant-task-input" placeholder="Assign task to ${p.name} (optional)" value="${p.task || ''}">
    `;

    el.querySelector('.btn-remove-participant').addEventListener('click', () => {
        _tempParticipants.splice(index, 1);
        refreshParticipantList();
        checkAutoRotateVisibility();
    });

    el.querySelector('.participant-email-input').addEventListener('input', (e) => {
        _tempParticipants[index].email = e.target.value;
    });

    el.querySelector('.participant-phone-input').addEventListener('input', (e) => {
        _tempParticipants[index].phone = e.target.value;
    });

    el.querySelector('.participant-task-input').addEventListener('input', (e) => {
        _tempParticipants[index].task = e.target.value;
        checkAutoRotateVisibility();
    });

    return el;
}

function refreshParticipantList() {
    const list = document.getElementById('participant-list');
    if (!list) return;
    list.innerHTML = '';
    _tempParticipants.forEach((p, i) => list.appendChild(renderParticipantCard(p, i)));
    if (window.lucide) window.lucide.createIcons();
}

export function addParticipant(name) {
    if (!name.trim()) return;
    _tempParticipants.push({ name: name.trim(), email: '', phone: '', task: '' });
    refreshParticipantList();
    checkAutoRotateVisibility();
}

// ─── Attachment helpers ────────────────────────────────────────────────────────

let _tempAttachments = [];

export function getTempAttachments() {
    return _tempAttachments;
}

export function addAttachments(files) {
    const promises = Array.from(files).map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                _tempAttachments.push({
                    name: file.name,
                    dataUrl: e.target.result,
                    type: file.type
                });
                resolve();
            };
            reader.readAsDataURL(file);
        });
    });
    Promise.all(promises).then(() => {
        refreshAttachmentList();
    });
}

function refreshAttachmentList() {
    const list = document.getElementById('attachment-list');
    if (!list) return;
    list.innerHTML = '';
    _tempAttachments.forEach((att, i) => {
        const chip = document.createElement('div');
        chip.className = 'attachment-chip';
        chip.innerHTML = `
            <i data-lucide="file" class="attach-chip-icon"></i>
            <span class="attach-chip-name" title="${att.name}">${att.name}</span>
            <button type="button" class="btn-remove-attach" data-index="${i}" title="Remove">✕</button>
        `;
        chip.querySelector('.btn-remove-attach').addEventListener('click', () => {
            _tempAttachments.splice(i, 1);
            refreshAttachmentList();
        });
        list.appendChild(chip);
    });
    if (window.lucide) window.lucide.createIcons();
}

// ─── Auto-Rotate visibility ───────────────────────────────────────────────────

export function checkAutoRotateVisibility() {
    const autoRotateRow = document.getElementById('auto-rotate-row');
    if (!autoRotateRow) return;

    const isRecurring = document.querySelector('input[name="recurrence-type"]:checked')?.value === 'recurring';
    const hasParticipantsWithTasks = _tempParticipants.some(p => p.task && p.task.trim());

    if (isRecurring && hasParticipantsWithTasks) {
        autoRotateRow.classList.remove('hidden');
    } else {
        autoRotateRow.classList.add('hidden');
    }
}

// ─── Recurrence helpers ────────────────────────────────────────────────────────

export function recurrenceLabel(recurrence) {
    if (!recurrence) return '';
    const freqMap = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
    const freq = freqMap[recurrence.frequency] || recurrence.frequency;
    if (recurrence.endType === 'indefinite') {
        return `${freq} · No end date`;
    }
    const endDate = recurrence.endDate ? formatDetailDate(recurrence.endDate) : '?';
    return `${freq} · Until ${endDate}`;
}

function formatDetailDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function openModal(eventData = null, defaultDateStr = null) {
    const modal = document.getElementById('modal-overlay');
    const form = document.getElementById('event-form');
    const titleHeader = document.getElementById('modal-title');
    const deleteBtn = document.getElementById('btn-delete-event');

    form.reset();
    _tempParticipants = [];
    _tempAttachments = [];
    refreshParticipantList();
    refreshAttachmentList();

    document.querySelector('input[name="recurrence-type"][value="one-time"]').checked = true;
    document.getElementById('recurrence-options').classList.add('hidden');
    document.querySelector('input[name="recurrence-freq"][value="weekly"]').checked = true;
    document.querySelector('input[name="recurrence-end"][value="date"]').checked = true;
    document.getElementById('recurrence-end-date-row').classList.remove('hidden');
    document.getElementById('recurrence-end-date').value = '';
    document.getElementById('auto-rotate-toggle').checked = false;
    document.getElementById('auto-rotate-row').classList.add('hidden');
    document.getElementById('event-allday-toggle').checked = false;
    document.getElementById('time-inputs-row').classList.remove('hidden');
    document.getElementById('enable-discussion-toggle').checked = false;

    if (eventData) {
        titleHeader.textContent = eventData.id ? 'Edit Activity' : 'Import Activity';
        document.getElementById('event-id').value = eventData.id || '';
        document.getElementById('event-title-input').value = eventData.title;
        document.getElementById('event-date-input').value = eventData.date;
        document.getElementById('event-enddate-input').value = eventData.endDate || eventData.date;
        document.getElementById('event-allday-toggle').checked = eventData.isAllDay || false;
        if (eventData.isAllDay) {
            document.getElementById('time-inputs-row').classList.add('hidden');
        } else {
            document.getElementById('time-inputs-row').classList.remove('hidden');
        }
        document.getElementById('event-time-input').value = eventData.time || '';
        document.getElementById('event-endtime-input').value = eventData.endTime || '';
        document.getElementById('event-note-input').value = eventData.note || '';
        document.getElementById('event-location-input').value = eventData.location || '';
        document.getElementById('enable-discussion-toggle').checked = eventData.enableDiscussion || false;
        document.querySelector(`input[name="event-type"][value="${eventData.type}"]`).checked = true;

        if (eventData.isRecurring && eventData.recurrence) {
            document.querySelector('input[name="recurrence-type"][value="recurring"]').checked = true;
            document.getElementById('recurrence-options').classList.remove('hidden');
            const freq = eventData.recurrence.frequency || 'weekly';
            document.querySelector(`input[name="recurrence-freq"][value="${freq}"]`).checked = true;
            const endType = eventData.recurrence.endType || 'date';
            document.querySelector(`input[name="recurrence-end"][value="${endType}"]`).checked = true;
            if (endType === 'indefinite') {
                document.getElementById('recurrence-end-date-row').classList.add('hidden');
            } else {
                document.getElementById('recurrence-end-date').value = eventData.recurrence.endDate || '';
            }
        }

        _tempParticipants = (eventData.participants || []).map(p => ({ ...p, email: p.email || '' }));
        refreshParticipantList();
        document.getElementById('auto-rotate-toggle').checked = eventData.autoRotateTasks || false;
        _tempAttachments = (eventData.attachments || []).map(a => ({ ...a }));
        refreshAttachmentList();
        deleteBtn.classList.remove('hidden');
    } else {
        titleHeader.textContent = 'New Activity';
        document.getElementById('event-id').value = '';
        const today = defaultDateStr || formatDate(state.currentDate);
        document.getElementById('event-date-input').value = today;
        document.getElementById('event-enddate-input').value = today;
        document.getElementById('event-location-input').value = '';
        deleteBtn.classList.add('hidden');
    }

    checkAutoRotateVisibility();
    modal.classList.remove('hidden');
    document.getElementById('event-title-input').focus();
    if (window.lucide) window.lucide.createIcons();
}

export function closeModal() {
    const modal = document.getElementById('modal-overlay');
    modal.classList.add('hidden');
    _tempParticipants = [];
    _tempAttachments = [];
}

// ─── Detail View (read-only) ──────────────────────────────────────────────────

export function openDetailModal(eventData) {
    const overlay = document.getElementById('detail-overlay');
    const badge = document.getElementById('detail-type-badge');
    const recurrenceBadge = document.getElementById('detail-recurrence-badge');
    const recurrenceText = document.getElementById('detail-recurrence-text');
    const title = document.getElementById('detail-title');
    const datetimeText = document.getElementById('detail-datetime-text');
    const locationRow = document.getElementById('detail-location-row');
    const locationLink = document.getElementById('detail-location-link');
    const noteRow = document.getElementById('detail-note-row');
    const noteEl = document.getElementById('detail-note');
    const participantsRow = document.getElementById('detail-participants-row');
    const participantsList = document.getElementById('detail-participants-list');
    const rotateBadge = document.getElementById('detail-rotate-badge');
    const attachmentsRow = document.getElementById('detail-attachments-row');
    const attachmentsList = document.getElementById('detail-attachments-list');

    badge.textContent = eventData.type === 'task' ? 'Task' : 'Event';
    badge.className = `detail-type-badge${eventData.type === 'task' ? ' task-badge' : ''}`;

    if (eventData.isRecurring && eventData.recurrence) {
        recurrenceBadge.classList.remove('hidden');
        recurrenceText.textContent = recurrenceLabel(eventData.recurrence);
    } else {
        recurrenceBadge.classList.add('hidden');
    }

    title.textContent = eventData.title;

    const [year, month, day] = eventData.date.split('-');
    const dateObj = new Date(year, month - 1, day);
    let dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

    if (eventData.endDate && eventData.endDate !== eventData.date) {
        const [ey, em, ed] = eventData.endDate.split('-');
        const endObj = new Date(ey, em - 1, ed);
        dateStr += ` - ${endObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`;
    }
    dateStr += `, ${year}`;

    let timeString = '';
    if (eventData.isAllDay) {
        timeString = 'All Day';
    } else if (eventData.time) {
        timeString = eventData.time;
        if (eventData.endTime) timeString += ` - ${eventData.endTime}`;
    }
    datetimeText.textContent = timeString ? `${dateStr} at ${timeString}` : dateStr;

    if (eventData.location) {
        locationRow.classList.remove('hidden');
        locationLink.textContent = eventData.location;
        locationLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventData.location)}`;
    } else {
        locationRow.classList.add('hidden');
    }

    if (eventData.note) {
        noteRow.classList.remove('hidden');
        noteEl.textContent = eventData.note;
    } else {
        noteRow.classList.add('hidden');
    }

    const participants = eventData.participants || [];
    if (participants.length > 0) {
        participantsRow.classList.remove('hidden');
        if (eventData.autoRotateTasks && eventData.isRecurring) {
            rotateBadge.classList.remove('hidden');
        } else {
            rotateBadge.classList.add('hidden');
        }
        participantsList.innerHTML = participants.map((p, pIndex) => `
            <div class="detail-participant-row">
                <div class="participant-avatar">${p.name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)}</div>
                <div class="detail-participant-info">
                    <span class="detail-participant-name">${p.name}</span>
                    ${p.email ? `<span class="detail-participant-email"><a href="mailto:${p.email}" class="detail-email-link">${p.email}</a></span>` : ''}
                    ${p.task ? `<span class="detail-participant-task">Task: ${p.task}</span>` : ''}
                </div>
                ${p.phone ? `
                <button type="button" class="btn-sms-invite" data-p-index="${pIndex}" title="Send SMS Invite">
                    <i data-lucide="message-circle"></i>
                </button>` : ''}
                ${p.email ? `
                <button type="button" class="btn-email-invite" data-p-index="${pIndex}" title="Send Email Invite">
                    <i data-lucide="mail"></i>
                </button>` : ''}
            </div>
        `).join('');

        // Wire up invite buttons
        participantsList.querySelectorAll('.btn-email-invite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.dataset.pIndex;
                triggerEmailInvite(participants[idx], eventData);
            });
        });
        participantsList.querySelectorAll('.btn-sms-invite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.dataset.pIndex;
                triggerSMSInvite(participants[idx], eventData);
            });
        });
    } else {
        participantsRow.classList.add('hidden');
    }

    // Discussion Panel
    const discussionRow = document.getElementById('detail-discussion-row');
    const discussionList = document.getElementById('detail-discussion-list');
    const sendDiscussionBtn = document.getElementById('btn-send-discussion');
    const discussionInput = document.getElementById('detail-discussion-input');

    if (eventData.enableDiscussion) {
        discussionRow.classList.remove('hidden');
        const renderMessages = () => {
            const messages = eventData.discussion || [];
            if (messages.length === 0) {
                discussionList.innerHTML = '<p style="color:var(--text-secondary); text-align:center; margin:0;">No messages yet.</p>';
            } else {
                discussionList.innerHTML = messages.map(msg => `
                    <div style="background:var(--bg-primary); padding:8px; border-radius:4px; font-size:0.9rem;">
                        <span style="font-weight:bold; color:var(--primary-color);">${msg.sender}:</span>
                        <span style="color:var(--text-primary);">${msg.message}</span>
                        <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px;">${new Date(msg.timestamp).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                `).join('');
            }
            discussionList.scrollTop = discussionList.scrollHeight; // Auto-scroll to bottom
        };

        renderMessages();

        // Prevent attaching multiple listeners
        const newSendBtn = sendDiscussionBtn.cloneNode(true);
        sendDiscussionBtn.parentNode.replaceChild(newSendBtn, sendDiscussionBtn);

        const newDiscussionInput = discussionInput.cloneNode(true);
        discussionInput.parentNode.replaceChild(newDiscussionInput, discussionInput);

        newSendBtn.addEventListener('click', async () => {
            const val = newDiscussionInput.value.trim();
            if (val) {
                const stateModule = await import('./state.js');
                stateModule.addDiscussionMessage(eventData.id, 'Organizer', val);
                newDiscussionInput.value = '';
                renderMessages();
            }
        });

        newDiscussionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') newSendBtn.click();
        });
    } else {
        discussionRow.classList.add('hidden');
    }

    const attachments = eventData.attachments || [];
    if (attachments.length > 0) {
        attachmentsRow.classList.remove('hidden');
        attachmentsList.innerHTML = attachments.map(att => `
            <div class="detail-attachment-item">
                <i data-lucide="file" class="detail-attach-icon"></i>
                <a href="${att.dataUrl}" download="${att.name}" class="detail-attach-link">${att.name}</a>
            </div>
        `).join('');
    } else {
        attachmentsRow.classList.add('hidden');
    }

    document.getElementById('btn-edit-event').dataset.eventId = eventData.id;
    overlay.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
}

// ─── Email & Google Calendar Invites ──────────────────────────────────────────

export function generateGoogleCalendarUrl(eventData) {
    const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    const text = encodeURIComponent(eventData.title);
    const [year, month, day] = eventData.date.split('-');
    const startDateStr = `${year}${month}${day}`;

    let dates = startDateStr + '/' + startDateStr;
    if (eventData.time) {
        const timeParts = eventData.time.split(':');
        const startHour = timeParts[0];
        const startMin = timeParts[1];
        const endHour = String(Number(startHour) + 1).padStart(2, '0');
        dates = `${startDateStr}T${startHour}${startMin}00/${startDateStr}T${endHour}${startMin}00`;
    }

    let url = `${baseUrl}&text=${text}&dates=${dates}`;
    if (eventData.location) url += `&location=${encodeURIComponent(eventData.location)}`;
    if (eventData.note) url += `&details=${encodeURIComponent(eventData.note)}`;
    return url;
}

export function triggerEmailInvite(participant, eventData) {
    const gCalUrl = generateGoogleCalendarUrl(eventData);
    const importUrl = generateImportUrl(eventData);

    const subject = encodeURIComponent(`Invitation: ${eventData.title}`);
    const body = encodeURIComponent(`Hi ${participant.name},\nYou're invited to: ${eventData.title}\nDate: ${eventData.date}\n${eventData.location ? 'At: ' + eventData.location : ''}\n\nAdd to Google Calendar: ${gCalUrl}\n\nImport to Simple Calendar: ${importUrl}`);

    window.location.href = `mailto:${participant.email}?subject=${subject}&body=${body}`;
}

export function generateImportUrl(eventData) {
    // Strip local ID and other session-specific data if needed
    const { id, ...exportData } = eventData;
    const json = JSON.stringify(exportData);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?import=${b64}`;
}

export function triggerSMSInvite(participant, eventData) {
    const gCalUrl = generateGoogleCalendarUrl(eventData);
    const importUrl = generateImportUrl(eventData);
    const dateInfo = eventData.date + (eventData.endDate && eventData.endDate !== eventData.date ? ` to ${eventData.endDate}` : '');
    const text = `Hi ${participant.name},\nYou're invited to: ${eventData.title}\nDate: ${dateInfo} ${eventData.isAllDay ? 'All Day' : (eventData.time || '')}\n${eventData.location ? 'At: ' + eventData.location : ''}\n\nImport to App: ${importUrl}\n\nGCal: ${gCalUrl}`;
    // Using ?body= works best across most mobile platforms, though some iOS versions preferred &body=
    window.location.href = `sms:${participant.phone}?body=${encodeURIComponent(text)}`;
}

export function closeDetailModal() {
    document.getElementById('detail-overlay').classList.add('hidden');
}

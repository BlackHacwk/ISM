const engineerKeyInput = document.getElementById('engineerKey');
const refreshButton = document.getElementById('refreshButton');
const engineerStatus = document.getElementById('engineerStatus');
const engineerIdentity = document.getElementById('engineerIdentity');
const ticketList = document.getElementById('ticketList');
const queueCount = document.getElementById('queueCount');
const clearButton = document.getElementById('clearButton');
const fieldFilter = document.getElementById('fieldFilter');

let engineerProfile = null;

function getHeaders() {
  const key = engineerKeyInput.value.trim();
  return key ? { 'x-engineer-key': key, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? isoString : date.toLocaleString();
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function populateFieldFilter(fields = []) {
  const current = fieldFilter.value;
  const options = ['<option value="all">All engineering fields</option>']
    .concat(fields.map((field) => `<option value="${escapeHtml(field)}">${escapeHtml(field)}</option>`));

  fieldFilter.innerHTML = options.join('');
  if ([...fieldFilter.options].some((option) => option.value === current)) {
    fieldFilter.value = current;
  }
}

function renderTickets(tickets) {
  if (!tickets.length) {
    ticketList.innerHTML = '<div class="ticket-card"><p>No tickets found for this filter yet.</p></div>';
    queueCount.textContent = '0 tickets';
    return;
  }

  queueCount.textContent = `${tickets.length} ticket${tickets.length === 1 ? '' : 's'}`;

  ticketList.innerHTML = tickets.map((ticket) => `
    <article class="ticket-card" data-ticket-id="${escapeHtml(ticket.id)}">
      <div class="ticket-card-top">
        <div>
          <h3>${escapeHtml(ticket.id)}</h3>
          <p class="muted-line">${escapeHtml(ticket.topic)} · ${escapeHtml(ticket.difficulty)} · requested: ${escapeHtml(ticket.requestedField || ticket.topic)} </p>
        </div>
        <span class="badge ${ticket.status === 'answered_by_engineer' ? 'idle' : 'loading'}">${escapeHtml(ticket.status.replaceAll('_', ' '))}</span>
      </div>

      <div class="ticket-section">
        <strong>Question</strong>
        <p>${escapeHtml(ticket.question)}</p>
      </div>

      <div class="ticket-section">
        <strong>AI answer</strong>
        <p>${escapeHtml(ticket.aiAnswer || 'No AI answer was captured for this ticket.')}</p>
      </div>

      <div class="ticket-section">
        <strong>Engineer reply</strong>
        <textarea class="engineer-answer-input" rows="6" placeholder="Write the engineer answer here...">${escapeHtml(ticket.engineerAnswer || '')}</textarea>
      </div>

      <div class="ticket-actions stacked-actions">
        <input class="engineer-name-input" type="text" placeholder="Engineer name" value="${escapeHtml(ticket.engineerName || engineerProfile?.name || '')}" />
        <input class="engineer-field-input" type="text" placeholder="Engineering field" value="${escapeHtml(ticket.engineerField || engineerProfile?.field || '')}" />
        <button class="save-answer-button" type="button">Save engineer answer</button>
      </div>

      <p class="muted-line">Created: ${escapeHtml(formatDate(ticket.createdAt))} · Updated: ${escapeHtml(formatDate(ticket.updatedAt))}</p>
    </article>
  `).join('');
}

async function loadAccessProfile() {
  const response = await fetch('/api/engineer-access', { headers: getHeaders() });

  if (!response.ok) {
    throw new Error(await response.text() || 'Unable to verify engineer access.');
  }

  const payload = await response.json();
  engineerProfile = payload.currentEngineer;
  engineerIdentity.textContent = `Signed in as ${payload.currentEngineer.name} · ${payload.currentEngineer.field} · ${payload.engineerCount} engineer account${payload.engineerCount === 1 ? '' : 's'} configured.`;
  populateFieldFilter(payload.fields || []);
}

async function loadTickets() {
  engineerStatus.textContent = 'Loading tickets...';

  try {
    await loadAccessProfile();

    const params = new URLSearchParams();
    if (fieldFilter.value && fieldFilter.value !== 'all') {
      params.set('field', fieldFilter.value);
    }

    const response = await fetch(`/api/questions${params.toString() ? `?${params.toString()}` : ''}`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(await response.text() || 'Failed to load tickets.');
    }

    const tickets = await response.json();
    renderTickets(tickets);
    engineerStatus.textContent = 'Queue loaded.';
  } catch (error) {
    ticketList.innerHTML = '<div class="ticket-card"><p>Unable to load the queue.</p></div>';
    engineerIdentity.textContent = 'Engineer access not verified.';
    engineerStatus.textContent = error.message || 'Unable to load tickets.';
    queueCount.textContent = 'Error';
  }
}

async function clearAllTickets() {
  const response = await fetch('/api/questions', {
    method: 'DELETE',
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error(await response.text() || 'Failed to clear tickets.');
  }

  return response.json();
}

async function saveEngineerAnswer(ticketId, engineerName, engineerField, engineerAnswer) {
  const response = await fetch(`/api/questions/${encodeURIComponent(ticketId)}/reply`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ engineerName, engineerField, engineerAnswer })
  });

  if (!response.ok) {
    throw new Error(await response.text() || 'Failed to save engineer answer.');
  }

  return response.json();
}

refreshButton.addEventListener('click', loadTickets);
fieldFilter.addEventListener('change', loadTickets);

ticketList.addEventListener('click', async (event) => {
  const button = event.target.closest('.save-answer-button');
  if (!button) {
    return;
  }

  const card = event.target.closest('.ticket-card');
  const ticketId = card?.dataset.ticketId;
  const engineerName = card.querySelector('.engineer-name-input').value.trim() || engineerProfile?.name || 'Engineer';
  const engineerField = card.querySelector('.engineer-field-input').value.trim() || engineerProfile?.field || 'General Engineering';
  const engineerAnswer = card.querySelector('.engineer-answer-input').value.trim();

  if (!ticketId || !engineerAnswer) {
    engineerStatus.textContent = 'Add an engineer answer before saving.';
    return;
  }

  button.disabled = true;
  engineerStatus.textContent = `Saving answer for ${ticketId}...`;

  try {
    await saveEngineerAnswer(ticketId, engineerName, engineerField, engineerAnswer);
    engineerStatus.textContent = `Saved answer for ${ticketId}.`;
    await loadTickets();
  } catch (error) {
    engineerStatus.textContent = error.message || 'Unable to save engineer answer.';
  } finally {
    button.disabled = false;
  }
});

clearButton.addEventListener('click', async () => {
  const confirmed = window.confirm('Clear the entire engineer queue? This deletes all logged tickets.');
  if (!confirmed) {
    return;
  }

  clearButton.disabled = true;
  engineerStatus.textContent = 'Clearing all tickets...';

  try {
    await clearAllTickets();
    engineerStatus.textContent = 'All tickets cleared.';
    await loadTickets();
  } catch (error) {
    engineerStatus.textContent = error.message || 'Unable to clear tickets.';
  } finally {
    clearButton.disabled = false;
  }
});

loadTickets();

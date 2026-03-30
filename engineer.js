const engineerKeyInput = document.getElementById('engineerKey');
const refreshButton = document.getElementById('refreshButton');
const engineerStatus = document.getElementById('engineerStatus');
const ticketList = document.getElementById('ticketList');
const queueCount = document.getElementById('queueCount');
const clearButton = document.getElementById('clearButton');

function getHeaders() {
  const key = engineerKeyInput.value.trim();
  return key ? { 'x-engineer-key': key, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? isoString : date.toLocaleString();
}

function renderTickets(tickets) {
  if (!tickets.length) {
    ticketList.innerHTML = '<div class="ticket-card"><p>No tickets found yet.</p></div>';
    queueCount.textContent = '0 tickets';
    return;
  }

  queueCount.textContent = `${tickets.length} ticket${tickets.length === 1 ? '' : 's'}`;

  ticketList.innerHTML = tickets.map((ticket) => `
    <article class="ticket-card" data-ticket-id="${ticket.id}">
      <div class="ticket-card-top">
        <div>
          <h3>${ticket.id}</h3>
          <p class="muted-line">${ticket.topic} · ${ticket.difficulty} · ${ticket.status}</p>
        </div>
        <span class="badge ${ticket.status === 'answered_by_engineer' ? 'idle' : 'loading'}">${ticket.status.replaceAll('_', ' ')}</span>
      </div>

      <div class="ticket-section">
        <strong>Question</strong>
        <p>${ticket.question}</p>
      </div>

      <div class="ticket-section">
        <strong>AI answer</strong>
        <p>${ticket.aiAnswer || 'No AI answer was captured for this ticket.'}</p>
      </div>

      <div class="ticket-section">
        <strong>Engineer reply</strong>
        <textarea class="engineer-answer-input" rows="6" placeholder="Write the engineer answer here...">${ticket.engineerAnswer || ''}</textarea>
      </div>

      <div class="ticket-actions">
        <input class="engineer-name-input" type="text" placeholder="Engineer name" value="${ticket.engineerName || ''}" />
        <button class="save-answer-button" type="button">Save engineer answer</button>
      </div>

      <p class="muted-line">Created: ${formatDate(ticket.createdAt)} · Updated: ${formatDate(ticket.updatedAt)}</p>
    </article>
  `).join('');
}

async function loadTickets() {
  engineerStatus.textContent = 'Loading tickets...';

  try {
    const response = await fetch('/api/questions', {
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

async function saveEngineerAnswer(ticketId, engineerName, engineerAnswer) {
  const response = await fetch(`/api/questions/${encodeURIComponent(ticketId)}/reply`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ engineerName, engineerAnswer })
  });

  if (!response.ok) {
    throw new Error(await response.text() || 'Failed to save engineer answer.');
  }

  return response.json();
}

refreshButton.addEventListener('click', loadTickets);

ticketList.addEventListener('click', async (event) => {
  const button = event.target.closest('.save-answer-button');
  if (!button) {
    return;
  }

  const card = event.target.closest('.ticket-card');
  const ticketId = card?.dataset.ticketId;
  const engineerName = card.querySelector('.engineer-name-input').value.trim() || 'Engineer';
  const engineerAnswer = card.querySelector('.engineer-answer-input').value.trim();

  if (!ticketId || !engineerAnswer) {
    engineerStatus.textContent = 'Add an engineer answer before saving.';
    return;
  }

  button.disabled = true;
  engineerStatus.textContent = `Saving answer for ${ticketId}...`;

  try {
    await saveEngineerAnswer(ticketId, engineerName, engineerAnswer);
    engineerStatus.textContent = `Saved answer for ${ticketId}.`;
    await loadTickets();
  } catch (error) {
    engineerStatus.textContent = error.message || 'Unable to save engineer answer.';
  } finally {
    button.disabled = false;
  }
});

loadTickets();


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

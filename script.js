const form = document.getElementById('qaForm');
const questionInput = document.getElementById('question');
const difficultyInput = document.getElementById('difficulty');
const topicInput = document.getElementById('topic');
const answerBox = document.getElementById('answer');
const statusBadge = document.getElementById('statusBadge');
const askButton = document.getElementById('askButton');
const demoButton = document.getElementById('demoButton');
const exampleChips = document.querySelectorAll('.example-chip');
const ticketPanel = document.getElementById('ticketPanel');
const ticketIdText = document.getElementById('ticketId');
const lookupForm = document.getElementById('lookupForm');
const lookupTicketInput = document.getElementById('lookupTicket');
const lookupResult = document.getElementById('lookupResult');

function setStatus(type, label) {
  statusBadge.className = `badge ${type}`;
  statusBadge.textContent = label;
}

function setAnswer(text, isEmpty = false) {
  answerBox.textContent = text;
  answerBox.classList.toggle('empty', isEmpty);
}

function showTicket(ticketId) {
  if (!ticketId) {
    ticketPanel.classList.add('hidden');
    ticketIdText.textContent = '—';
    return;
  }

  ticketIdText.textContent = ticketId;
  ticketPanel.classList.remove('hidden');
}

async function getAnswer(question, difficulty, topic) {
  const response = await fetch('/api/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, difficulty, topic })
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { error: await response.text() };

  if (!response.ok) {
    const error = new Error(payload.error || 'Failed to get an answer.');
    error.ticketId = payload.ticketId;
    throw error;
  }

  return payload;
}

async function lookupTicket(ticketId) {
  const response = await fetch(`/api/questions/${encodeURIComponent(ticketId)}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Ticket lookup failed.');
  }

  return response.json();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const question = questionInput.value.trim();
  const difficulty = difficultyInput.value;
  const topic = topicInput.value;

  if (!question) {
    setStatus('error', 'Missing question');
    setAnswer('Please enter a question.', true);
    return;
  }

  askButton.disabled = true;
  showTicket('');
  setStatus('loading', 'Thinking');
  setAnswer('Generating answer...');

  try {
    const data = await getAnswer(question, difficulty, topic);
    setStatus('idle', data.model ? `Done · ${data.model}` : 'Done');
    setAnswer(data.answer || 'No answer returned.');
    showTicket(data.ticketId);
  } catch (error) {
    console.error(error);
    setStatus('error', 'Error');
    showTicket(error.ticketId);
    setAnswer(error.message || 'Something went wrong while contacting the AI.', true);
  } finally {
    askButton.disabled = false;
  }
});

demoButton.addEventListener('click', () => {
  questionInput.value = 'How do I estimate heat loss through a flat insulated wall, and what information do I need first?';
  topicInput.value = 'heat transfer';
  difficultyInput.value = 'intermediate';
  questionInput.focus();
});

exampleChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    questionInput.value = chip.textContent.trim();
    questionInput.focus();
  });
});

lookupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const ticketId = lookupTicketInput.value.trim();

  if (!ticketId) {
    lookupResult.textContent = 'Enter a ticket number first.';
    lookupResult.classList.add('empty');
    return;
  }

  lookupResult.textContent = 'Checking ticket...';
  lookupResult.classList.remove('empty');

  try {
    const ticket = await lookupTicket(ticketId);
    const engineerReply = ticket.engineerAnswer
      ? `Engineer reply from ${ticket.engineerName || 'Engineer'}:\n${ticket.engineerAnswer}`
      : 'No engineer reply yet. Your ticket is still waiting in the queue.';

    lookupResult.textContent = [
      `Ticket: ${ticket.id}`,
      `Status: ${ticket.status}`,
      `Topic: ${ticket.topic}`,
      '',
      engineerReply
    ].join('\n');
  } catch (error) {
    lookupResult.textContent = error.message || 'Unable to find that ticket.';
  }
});

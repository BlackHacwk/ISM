const form = document.getElementById('qaForm');
const questionInput = document.getElementById('question');
const difficultyInput = document.getElementById('difficulty');
const topicInput = document.getElementById('topic');
const answerBox = document.getElementById('answer');
const statusBadge = document.getElementById('statusBadge');
const askButton = document.getElementById('askButton');
const demoButton = document.getElementById('demoButton');
const exampleChips = document.querySelectorAll('.example-chip');

function setStatus(type, label) {
  statusBadge.className = `badge ${type}`;
  statusBadge.textContent = label;
}

function setAnswer(text, isEmpty = false) {
  answerBox.textContent = text;
  answerBox.classList.toggle('empty', isEmpty);
}

async function getAnswer(question, difficulty, topic) {
  const response = await fetch('/api/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, difficulty, topic })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to get an answer.');
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
  setStatus('loading', 'Thinking');
  setAnswer('Generating answer...');

  try {
    const data = await getAnswer(question, difficulty, topic);
    setStatus('idle', data.model ? `Done · ${data.model}` : 'Done');
    setAnswer(data.answer || 'No answer returned.');
  } catch (error) {
    console.error(error);
    setStatus('error', 'Error');
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

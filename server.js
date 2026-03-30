const express = require('express');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || 'gpt-5.4';
const engineerPortalKey = process.env.ENGINEER_PORTAL_KEY || '';
const client = apiKey ? new OpenAI({ apiKey }) : null;

const dataDir = path.join(__dirname, 'data');
const questionsFile = path.join(dataDir, 'questions.json');

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

ensureStorage();

function ensureStorage() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(questionsFile)) {
    fs.writeFileSync(questionsFile, '[]\n', 'utf8');
  }
}

function buildSystemPrompt(difficulty, topic) {
  return [
    'You are a careful mechanical engineering assistant.',
    `Answer for a ${difficulty} audience.`,
    `Primary topic: ${topic}.`,
    'Prioritize correctness, units, assumptions, limitations, and practical engineering judgment.',
    'When relevant, include governing equations in plain text, define variables, and explain each step.',
    'If the user did not provide enough data for a numerical answer, clearly say what is missing and show the method anyway.',
    'Do not pretend calculations are exact when inputs are incomplete.',
    'Keep the answer organized with these headings when useful: Summary, Principles, Equations, Assumptions, Worked Approach, Practical Notes.'
  ].join(' ');
}

function readQuestions() {
  try {
    return JSON.parse(fs.readFileSync(questionsFile, 'utf8'));
  } catch (error) {
    console.error('Failed to read questions file:', error);
    return [];
  }
}

function writeQuestions(records) {
  fs.writeFileSync(questionsFile, JSON.stringify(records, null, 2), 'utf8');
}

function createTicketId() {
  return `ME-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function saveQuestion({ question, difficulty, topic, aiAnswer }) {
  const records = readQuestions();
  const record = {
    id: createTicketId(),
    question: String(question).trim(),
    difficulty,
    topic,
    aiAnswer: aiAnswer || '',
    engineerAnswer: '',
    engineerName: '',
    status: 'pending_engineer',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  records.unshift(record);
  writeQuestions(records);
  return record;
}

function requireEngineerAuth(req, res, next) {
  if (!engineerPortalKey) {
    return next();
  }

  const providedKey = req.header('x-engineer-key');
  if (providedKey !== engineerPortalKey) {
    return res.status(401).send('Unauthorized engineer request.');
  }

  next();
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'mech-engineer-qa-site',
    model,
    configured: Boolean(apiKey),
    engineerPortalProtected: Boolean(engineerPortalKey)
  });
});

app.post('/api/answer', async (req, res) => {
  const { question, difficulty = 'intermediate', topic = 'general' } = req.body || {};

  if (!question || !String(question).trim()) {
    return res.status(400).send('Question is required.');
  }

  if (!client) {
    return res.status(500).send('Server is missing OPENAI_API_KEY. Add it in your hosting platform environment variables and redeploy.');
  }

  try {
    const response = await client.responses.create({
      model,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: buildSystemPrompt(difficulty, topic) }]
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: question }]
        }
      ]
    });

    const answer = (response.output_text || '').trim();

    if (!answer) {
      return res.status(502).send('The AI returned an empty answer. Please try again.');
    }

    const record = saveQuestion({ question, difficulty, topic, aiAnswer: answer });
    res.json({ answer, model, ticketId: record.id, status: record.status });
  } catch (error) {
    console.error('OpenAI API error:', error);

    const message =
      error?.status === 401
        ? 'Invalid OPENAI_API_KEY. Update your hosting platform environment variable and redeploy.'
        : error?.status === 429
        ? 'Rate limit reached or billing is not ready yet. Please try again shortly.'
        : error?.message || 'Failed to generate an answer.';

    try {
      const record = saveQuestion({ question, difficulty, topic, aiAnswer: '' });
      return res.status(500).json({ error: message, ticketId: record.id, status: record.status });
    } catch (storageError) {
      console.error('Failed to log question after AI error:', storageError);
      return res.status(500).send(message);
    }
  }
});

app.get('/api/questions', requireEngineerAuth, (req, res) => {
  const records = readQuestions();
  res.json(records);
});


app.delete('/api/questions', requireEngineerAuth, (_req, res) => {
  writeQuestions([]);
  res.json({ ok: true, cleared: true });
});

app.get('/api/questions/:id', (req, res) => {
  const records = readQuestions();
  const record = records.find((item) => item.id === req.params.id);

  if (!record) {
    return res.status(404).send('Ticket not found.');
  }

  res.json(record);
});

app.post('/api/questions/:id/reply', requireEngineerAuth, (req, res) => {
  const { engineerAnswer, engineerName = 'Engineer' } = req.body || {};

  if (!engineerAnswer || !String(engineerAnswer).trim()) {
    return res.status(400).send('Engineer answer is required.');
  }

  const records = readQuestions();
  const record = records.find((item) => item.id === req.params.id);

  if (!record) {
    return res.status(404).send('Ticket not found.');
  }

  record.engineerAnswer = String(engineerAnswer).trim();
  record.engineerName = String(engineerName).trim() || 'Engineer';
  record.status = 'answered_by_engineer';
  record.updatedAt = new Date().toISOString();

  writeQuestions(records);
  res.json(record);
});

app.get('/engineer', (_req, res) => {
  res.sendFile(path.join(__dirname, 'engineer.html'));
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Mechanical engineering Q&A site running on port ${PORT}`);
  console.log(`Using model: ${model}`);
});

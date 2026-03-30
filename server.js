const express = require('express');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || 'gpt-5.4';

const client = apiKey ? new OpenAI({ apiKey }) : null;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

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

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'mech-engineer-qa-site',
    model,
    configured: Boolean(apiKey)
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

    res.json({ answer, model });
  } catch (error) {
    console.error('OpenAI API error:', error);

    const message =
      error?.status === 401
        ? 'Invalid OPENAI_API_KEY. Update your hosting platform environment variable and redeploy.'
        : error?.status === 429
        ? 'Rate limit reached or billing is not ready yet. Please try again shortly.'
        : error?.message || 'Failed to generate an answer.';

    res.status(500).send(message);
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Mechanical engineering Q&A site running on port ${PORT}`);
  console.log(`Using model: ${model}`);
});

# Mechanical Engineer Q&A Site with Multi-Engineer Review Queue

This site answers user questions with AI, logs every question as a ticket, and lets multiple engineers from different disciplines review and respond through a protected dashboard.

## Features
- Public question form with AI-generated answers
- Every question saved with a ticket ID
- Engineer dashboard at `/engineer`
- Multiple engineer accounts with separate access keys
- Engineer field tracking for replies
- Queue filter by engineering discipline
- Clear-all queue button with confirmation

## Environment variables
Create a `.env` file locally or add these in Render:

```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-5.4
ENGINEER_PORTAL_USERS=Alex Rivera|Mechanical Engineering|mech-key-123;Priya Shah|Electrical Engineering|electrical-key-456;Jordan Lee|Civil Engineering|civil-key-789
```

### Multi-engineer setup format
Use this pattern:

```text
Name|Engineering Field|AccessKey;Name|Engineering Field|AccessKey
```

Example:

```text
Taylor Moss|Mechanical Engineering|mech-team-2026;Sam Patel|Chemical Engineering|chem-team-2026
```

If `ENGINEER_PORTAL_USERS` is not set, the app will fall back to the older single shared key using `ENGINEER_PORTAL_KEY`.

## Run locally
```bash
npm install
npm start
```

Open:
- Main site: `http://localhost:3000`
- Engineer dashboard: `http://localhost:3000/engineer`

## Render deploy
1. Push the project to GitHub
2. Create a new Render Blueprint or Web Service
3. Add `OPENAI_API_KEY`
4. Add `ENGINEER_PORTAL_USERS`
5. Deploy

## Important storage note
Tickets are stored in `data/questions.json`.
On Render free or basic deployments, local file storage may reset after restarts or redeploys. For permanent storage, move the queue to a database.

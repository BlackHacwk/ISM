# Mechanical Engineering Q&A Site

This version is ready to deploy so other people can use it on the web.

## What changed

- Works locally or on a public host
- Uses the OpenAI API from the server so your API key stays private
- Includes a health check endpoint for hosting platforms
- Includes `render.yaml` for quick Render deployment
- Includes a `Dockerfile` so you can deploy on many other platforms too

## Local use

### 1) Install dependencies

```bash
npm install
```

### 2) Add your API key

Copy `.env.example` to `.env` and add your real key:

```bash
cp .env.example .env
```

Then edit `.env`:

```env
OPENAI_API_KEY=your_real_key_here
OPENAI_MODEL=gpt-5.4
PORT=3000
```

### 3) Start the site

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## Deploy publicly on Render

### Option A: GitHub + Render

1. Upload this project to a GitHub repository
2. Create a Render account
3. Choose **New +** → **Blueprint** or **Web Service**
4. Connect your GitHub repository
5. Set this environment variable in Render:

```text
OPENAI_API_KEY=your_real_key_here
```

6. Deploy

Render will use `render.yaml` or the Node settings below:

- Build command: `npm install`
- Start command: `npm start`

After deployment, Render gives you a public URL like:

```text
https://your-app-name.onrender.com
```

## Deploy with Docker

Build:

```bash
docker build -t mech-engineer-qa-site .
```

Run:

```bash
docker run -p 3000:3000 -e OPENAI_API_KEY=your_real_key_here mech-engineer-qa-site
```

## Important notes

- Do **not** put your API key in `script.js` or `index.html`
- Do **not** commit your real `.env` file to GitHub
- Public users can use the site, but your OpenAI API account is billed for their usage
- For a real public launch, add rate limiting, authentication, and abuse protection

## Suggested next improvements

- Add chat history
- Format answers as markdown
- Add equation rendering
- Add usage limits per IP or per user
- Add admin analytics


## Engineer review queue

This version logs every submitted question to `data/questions.json` and gives the user a ticket ID.

### New routes
- `GET /engineer` - engineer dashboard
- `GET /api/questions` - list logged questions
- `GET /api/questions/:id` - look up a ticket
- `POST /api/questions/:id/reply` - save an engineer answer

### Optional protection
Set this environment variable to protect the dashboard and write APIs:

```bash
ENGINEER_PORTAL_KEY=your-secret-key
```

When set, the engineer dashboard will ask for that key before it can load or save tickets.

### Important note for Render
The included logging uses a local JSON file for simplicity. On platforms with ephemeral storage, old tickets can be lost during redeploys or restarts. For production, switch the queue to a database like PostgreSQL, Supabase, or Firebase.

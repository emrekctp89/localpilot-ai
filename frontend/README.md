# LocalPilot AI Frontend

Version: `1.0.0-rc.1`

LocalPilot AI is a local business dashboard built with Next.js, Supabase, and a FastAPI AI service.

## Development

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

The app expects the AI service to be available through:

```text
NEXT_PUBLIC_AI_SERVICE_URL=http://127.0.0.1:8000
```

## Useful Commands

```powershell
npm run lint
npm run build
npm run test:smoke
```

For TypeScript checks:

```powershell
npx tsc --noEmit
```

## Backend

The API service lives in `../ai-service`.

```powershell
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

API docs:

```text
http://127.0.0.1:8000/docs
```

## Deployment

### Frontend (Vercel)

1. Import the repo in [Vercel](https://vercel.com/new).
2. Set **Root Directory** to `frontend`.
3. Add environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_AI_SERVICE_URL=https://<your-ai-service-host>
```

4. Deploy. Production URL example: `https://your-app.vercel.app`.

`vercel.json` pins the region to `fra1` (Frankfurt).

### AI Service (Render or Railway)

Both platforms use `ai-service/Dockerfile` and expose `/health`.

**Render:** connect the repo and apply `render.yaml` (root dir `ai-service`).

**Railway:** point the service at `ai-service/` and use `railway.toml`.

Required env vars (see `../deploy/production.env.template`):

```text
GEMINI_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
FRONTEND_URL=https://your-app.vercel.app
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-*.vercel.app
ENVIRONMENT=production
AI_SERVICE_REQUIRE_AUTH=true
```

Wildcard origins (e.g. `https://your-app-*.vercel.app`) are converted to CORS regex so Vercel preview deployments work.

### Stripe Webhook

After the AI service is live, register:

```text
https://<your-ai-service-host>/stripe-webhook
```

### Post-deploy checks

```powershell
npm run build
npm run test
curl https://<your-ai-service-host>/health
```

## Project Docs

- `../docs/CHANGELOG.md`
- `../docs/ROADMAP.md`

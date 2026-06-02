# IGNOUprep Backend

Express + Prisma + JWT API for the course creator app.

## Stack

- Node 20 + Express 4
- Prisma 5
- PostgreSQL or MySQL, selected by `scripts/prisma-auto.ts`
- JWT auth + bcrypt password hashing
- Zod validation
- Pino request logging with secret redaction
- OpenAPI docs at `/docs` and `/openapi.json`

## Local Development

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate:auto
npm run prisma:migrate-dev:auto -- --name init
npm run dev
```

Default local API URL: `http://localhost:5000`

Useful endpoints:

- `GET /health`
- `GET /docs`
- `GET /openapi.json`

## Environment

Required:

- `DATABASE_URL`
- `JWT_SECRET`

Optional:

- `AI_KEY_ENCRYPTION_SECRET` stable secret for saved Gemini API keys; keep this unchanged across deploys
- `AI_KEY_LEGACY_SECRETS` comma-separated old secrets that can still decrypt existing saved Gemini API keys
- `JWT_EXPIRES_IN`
- `PORT`
- `JSON_BODY_LIMIT`
- `CORS_ORIGIN`
- `GOOGLE_AI_API_KEY`
- `SUPER_ADMIN_EMAILS`

## Frontend Bridge

The React frontend uses `src/integrations/api/client.ts` as a small API adapter for app data, auth, AI actions, and export/backup flows.

## Production

```bash
cd backend
npm install
npm run prisma:generate:auto
npm run prisma:migrate:auto
npm run build
npm start
```

Use `npm run prisma:push:auto` only when you intentionally want schema push behavior instead of migrations.

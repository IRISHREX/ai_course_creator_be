# IGNOUprep Backend

Express + MongoDB/Mongoose + JWT API for the course creator app.

## Stack

- Node 20 + Express 4
- MongoDB + Mongoose
- JWT auth + bcrypt password hashing
- Zod validation
- Pino request logging with secret redaction
- OpenAPI docs at `/docs` and `/openapi.json`

## Local Development

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Default local API URL: `http://localhost:8081`

Useful endpoints:

- `GET /health`
- `GET /docs`
- `GET /openapi.json`

## Environment

Required:

- `DATABASE_URL` MongoDB connection string, for example `mongodb://127.0.0.1:27017/ai_course_creator`
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
npm run build
npm start
```

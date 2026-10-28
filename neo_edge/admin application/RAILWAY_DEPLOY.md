# Deploy InsightEdge Admin to Railway

## Prerequisites

- [Railway](https://railway.app) account
- GitHub repo with this project (e.g. https://github.com/trueinf/neo_admin)

## Steps

### 1. Create a new project on Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project**
3. Choose **Deploy from GitHub repo**
4. Select your repo (e.g. `trueinf/neo_admin`)
5. Set **Root Directory** to `InsightEdge_Admin_Application` (if the repo root is the parent folder)  
   - If the repo root IS `InsightEdge_Admin_Application`, leave blank

### 2. Add environment variables

In Railway Dashboard → your service → **Variables**, add:

| Variable | Required | Description |
|----------|----------|-------------|
| `RAPIDAPI_KEY` | Yes | RapidAPI key for YouTube APIs |
| `OPENAI_API_KEY` | Yes | OpenAI API key for 18D extraction |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `NEO4J_URI` | Yes | Neo4j AuraDB URI (e.g. `neo4j+s://xxx.databases.neo4j.io`) |
| `NEO4J_USER` | No | Default: `neo4j` |
| `NEO4J_PASSWORD` | Yes | Neo4j password |

**Note:** `PORT` is set automatically by Railway. Do not add it.

### 3. Deploy

Railway will:

1. Run `npm install && npm run build`
2. Start with `npm start`
3. Assign a public URL (e.g. `https://your-app.up.railway.app`)

### 4. Access your app

Open the URL Railway provides. The admin UI and API run on the same domain.

## Troubleshooting

- **Build fails:** Check that all dependencies are in `package.json` (no dev-only deps required at runtime)
- **Neo4j connection fails:** Ensure AuraDB instance is running and not paused; check IP whitelist
- **API 404:** Ensure `VITE_API_BASE_URL` is empty or unset in production (uses same-origin)

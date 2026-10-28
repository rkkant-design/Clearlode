# Backend Environment Variables Template

Copy these variables to a `.env` file in the backend directory:

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# Neo4j Configuration (Optional - graceful fallback if not provided)
NEO4J_URI=your_neo4j_uri
NEO4J_USER=your_neo4j_username
NEO4J_PASSWORD=your_neo4j_password

# OpenAI Configuration (Required for Ask Neo chat feature)
OPENAI_API_KEY=your_openai_api_key

# CORS Configuration (Optional - comma-separated domains)
# ALLOWED_ORIGINS=https://your-frontend-domain.com,https://another-domain.com
```

## Railway Deployment

When deploying to Railway, set these environment variables in the Railway dashboard:
- All variables above (use production values)
- PORT is automatically set by Railway, so you can omit it

NODE_ENV = production
 SUPABASE_URL = https://xxx.supabase.co
 SUPABASE_KEY = eyJhbGci...OPENAI_API_KEY = sk-proj-xxx...
ALLOWED_ORIGINS = https://your-app.netlify.app (after Netlify deploy)
[ ] NEO4J_URI = neo4j+s://xxx... (optional)
[ ] NEO4J_USER = neo4j (optional)
[ ] NEO4J_PASSWORD = xxx (optional)
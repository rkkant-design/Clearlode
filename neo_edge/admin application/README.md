# InsightEdge Admin Application

Full admin application (frontend + backend) for InsightEdge. The original project is available at https://www.figma.com/design/wdF0DegP8xn7ym8iVVrBql/InsightEdge-Admin-Application.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment variables**
   - Copy `.env.example` to `.env`
   - Fill in your API keys and credentials (RapidAPI, OpenAI, Supabase, Neo4j)

## Running

- **Frontend** (port 3001): `npm run dev`
- **Backend** (port 5000): `npm run server`

Start both for a working admin experience. The frontend expects the backend at `http://localhost:5000`.

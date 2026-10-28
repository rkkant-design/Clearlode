# NEO Intelligence Platform

A modern enterprise AI intelligence platform that extracts, organizes, and presents insights from enterprise technology videos. NEO helps users quickly understand enterprise AI features, demos, use cases, and vendor comparisons without watching lengthy videos.

## 🚀 Features

### Core Functionality
- **Latest Intelligence Feed**: Real-time feed of enterprise AI updates and product demonstrations
- **Vendor Explorer**: Browse and compare different enterprise vendors and their offerings
- **Demo Catalog**: Curated collection of product demonstrations and keynotes
- **Feature Explorer**: Search and explore specific AI features across vendors
- **Use Case Library**: Comprehensive library of AI use cases and applications
- **Feed with Filters**: Customizable feed with vendor, product, and AI type filters
- **Benchmarking**: Compare vendors and products side-by-side
- **Playbook**: Strategic guides and best practices
- **Ask Neo Chat**: AI-powered chat assistant with RAG (Retrieval Augmented Generation) that answers questions based on video transcript embeddings

### User Interface
- **Modern Design**: Sleek, dark-themed UI with gold accent colors
- **Responsive Layout**: Fully responsive design for desktop and mobile
- **Smooth Animations**: Framer Motion powered animations for enhanced UX
- **Real-time Updates**: Live feed updates and trending topics
- **Advanced Filtering**: Multi-criteria filtering for personalized content

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Charts**: Recharts
- **Theme**: next-themes (dark/light mode support)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: 
  - **Supabase** (PostgreSQL) - Video metadata, transcripts, embeddings
  - **Neo4j** - Knowledge graph for relationships and trending analysis
- **APIs**: RESTful API endpoints

## 📁 Project Structure

```
user_application/
├── backend/
│   ├── db/
│   │   ├── neo4j.js              # Neo4j database operations
│   │   ├── supabase.js           # Supabase database operations
│   │   └── supabase-video-details.js  # Video details operations
│   ├── index.js                  # Express server entry point
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (main)/           # Main route group
│   │   │   │   ├── benchmarking/
│   │   │   │   ├── demo-candidates/
│   │   │   │   ├── feature-explorer/
│   │   │   │   ├── feed/
│   │   │   │   ├── latest/
│   │   │   │   │   └── [id]/     # Dynamic video detail pages
│   │   │   │   ├── playbook/
│   │   │   │   ├── use-case-explorer/
│   │   │   │   ├── vendors/
│   │   │   │   └── layout.tsx    # Main layout with TopNav and Sidebar
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── layout.tsx        # Root layout
│   │   │   └── globals.css       # Global styles
│   │   ├── components/
│   │   │   ├── TopNav.tsx        # Top navigation bar
│   │   │   ├── Sidebar.tsx      # Left sidebar navigation
│   │   │   ├── AskNeo.tsx       # AI assistant component
│   │   │   ├── FeedCard.tsx      # Feed card component
│   │   │   ├── FeedContainer.tsx # Feed container
│   │   │   ├── FilterBar.tsx     # Filter bar component
│   │   │   ├── HeroSpotlight.tsx # Hero spotlight section
│   │   │   ├── RightSidebar.tsx # Right sidebar component
│   │   │   ├── ThemeProvider.tsx # Theme context provider
│   │   │   └── ThemeToggle.tsx  # Theme toggle component
│   │   └── types/
│   │       └── lucide-react.d.ts # TypeScript definitions
│   ├── public/                   # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   └── tailwind.config.js
│
└── README.md                      # This file
```

## 🚦 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Supabase** account and project
- **Neo4j** database (optional, for trending features)
- Environment variables configured

### Installation

1. **Clone the repository**
   ```bash
   cd user_application
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Environment Setup

#### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# Neo4j Configuration (Optional)
NEO4J_URI=your_neo4j_uri
NEO4J_USER=your_neo4j_username
NEO4J_PASSWORD=your_neo4j_password

# OpenAI Configuration (Required for Ask Neo chat feature)
OPENAI_API_KEY=your_openai_api_key
```

#### Frontend Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5001
```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   The backend will run on `http://localhost:5001`

2. **Start the Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on `http://localhost:3001`

3. **Open your browser**
   Navigate to `http://localhost:3001` to see the application

## 📡 API Endpoints

### Backend API

Base URL: `http://localhost:5001`

#### Health Check
- `GET /health` - Server health status

#### Feed Endpoints
- `GET /api/feed` - Get paginated feed videos
  - Query parameters:
    - `page` (number): Page number (default: 1)
    - `limit` (number): Items per page (default: 12)
    - `vendor` (string): Filter by vendor
    - `function` (string): Filter by function
    - `days` (number): Filter by days

#### Spotlight
- `GET /api/spotlight` - Get featured spotlight video

#### Statistics
- `GET /api/stats/trending` - Get trending tags
  - Query parameters:
    - `limit` (number): Number of results (default: 10)

- `GET /api/stats/vendors` - Get top vendors
  - Query parameters:
    - `limit` (number): Number of results (default: 5)

#### Video Details
- `GET /api/video/:id` - Get detailed video information by ID

#### Chat / Ask Neo
- `POST /api/chat` - Chat with Neo using RAG (Retrieval Augmented Generation)
  - Request body:
    ```json
    {
      "question": "Your question here",
      "conversationHistory": [] // Optional: array of previous messages for context
    }
    ```
  - Response:
    ```json
    {
      "success": true,
      "data": {
        "answer": "Generated answer based on transcript context",
        "sources": [
          {
            "title": "Video title",
            "channel": "Channel name",
            "videoId": "video_id",
            "videoUrl": "video_url",
            "similarity": 0.85
          }
        ],
        "chunksUsed": 8
      }
    }
    ```

## 🎨 Design System

### Color Palette

The application uses a custom color scheme defined in Tailwind CSS:

- **Background**: `neo-bg` - Dark background
- **Panel**: `neo-panel` - Card/panel background
- **Text Primary**: `neo-text-primary` - Main text color
- **Text Secondary**: `neo-text-secondary` - Secondary text color
- **Accent A**: `neo-accent-a` - Primary accent (blue)
- **Accent B**: `neo-accent-b` - Secondary accent (gold)
- **Accent C**: `neo-accent-c` - Tertiary accent (green)
- **Divider**: `neo-divider` - Border/divider color

### Typography

- **Headings**: Bold, with gold gradient accents
- **Body**: Clean, readable sans-serif
- **Code**: Monospace for technical content

## 🔧 Development

### Available Scripts

#### Backend
```bash
npm start    # Start production server
npm run dev  # Start development server
```

#### Frontend
```bash
npm run dev      # Start development server (port 3001)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier (if configured) for formatting
- Component-based architecture

## 🗄️ Database Schema

### Supabase Tables

#### videos
- Video metadata (id, video_id, title, channel_title, description, thumbnail, duration, etc.)

#### transcripts
- Transcript data with 18-D extraction and embeddings
- `id` (uuid)
- `video_id` (uuid, references videos)
- `transcript_text` (text)
- `extraction` (jsonb) - Full 18-D JSON
- `embedding` (vector(1536)) - OpenAI embeddings
- `status` (text) - Processing status
- Timestamps (uploaded_at, extracted_at, recorded_at)

### Neo4j Graph Structure

**Nodes**: Video, Transcript, Speaker, Organization, UseCase, Problem, Benefit, Metric, Technology, Industry, etc.

**Relationships**: 
- Video → HAS_TRANSCRIPT → Transcript
- Transcript → MENTIONS_USECASE → UseCase
- UseCase → USES → Technology
- UseCase → BELONGS_TO → Industry
- And more...

## 🚢 Deployment

### Backend Deployment

1. Set environment variables on your hosting platform
2. Build and start the server:
   ```bash
   npm start
   ```

### Frontend Deployment

1. Build the production bundle:
   ```bash
   npm run build
   ```

2. Deploy to Vercel, Netlify, or your preferred platform
3. Set environment variables in your deployment platform

### Recommended Platforms

- **Frontend**: Vercel (optimized for Next.js)
- **Backend**: Railway, Render, or AWS
- **Database**: Supabase Cloud, Neo4j AuraDB

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary and confidential.

## 🚀 Production Deployment

### Backend Deployment (Railway)

#### Step 1: Prepare Railway Account
1. Sign up at [Railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repository

#### Step 2: Configure Environment Variables
In Railway Dashboard → Variables, add:
```
SUPABASE_URL=your_production_supabase_url
SUPABASE_KEY=your_production_supabase_key
NEO4J_URI=your_production_neo4j_uri
NEO4J_USER=your_neo4j_username
NEO4J_PASSWORD=your_neo4j_password
OPENAI_API_KEY=your_openai_api_key
NODE_ENV=production
ALLOWED_ORIGINS=https://your-app.netlify.app
```

#### Step 3: Deploy
1. Railway will auto-detect the backend and deploy
2. Note your Railway backend URL (e.g., `https://your-app.railway.app`)
3. Test the health endpoint: `https://your-app.railway.app/health`

**Backend Files for Railway:**
- `backend/railway.json` - Railway configuration
- `backend/package.json` - Node.js version specified in engines
- `backend/ENV_TEMPLATE.md` - Environment variables reference

---

### Frontend Deployment (Netlify)

#### Step 1: Prepare Netlify Account
1. Sign up at [Netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository

#### Step 2: Configure Build Settings
- **Base directory**: `frontend`
- **Build command**: `npm run build`
- **Publish directory**: `frontend/.next`
- **Node version**: 18 or higher

#### Step 3: Set Environment Variables
In Netlify Dashboard → Site Settings → Environment Variables:
```
NEXT_PUBLIC_API_BASE_URL=https://your-backend.railway.app
```
Replace `your-backend` with your actual Railway URL from Step 3 above.

#### Step 4: Install Netlify Next.js Plugin
Netlify will automatically detect and install `@netlify/plugin-nextjs` from `netlify.toml`

#### Step 5: Deploy
1. Netlify will automatically build and deploy
2. Your app will be live at `https://your-app.netlify.app`
3. Test all functionality end-to-end

**Frontend Files for Netlify:**
- `frontend/netlify.toml` - Netlify configuration with redirects
- `frontend/package.json` - Node.js version specified in engines
- `frontend/ENV_TEMPLATE.md` - Environment variables reference

---

### Post-Deployment Checklist

#### Backend (Railway)
- ✅ Health endpoint responds: `/health`
- ✅ All API endpoints working
- ✅ Supabase connection established
- ✅ Neo4j connection (if configured)
- ✅ OpenAI API working for chat
- ✅ CORS allows your Netlify domain

#### Frontend (Netlify)
- ✅ Site loads without errors
- ✅ API calls reach Railway backend
- ✅ Ask Neo chat works
- ✅ Feed page loads data
- ✅ Latest page displays videos
- ✅ Video detail pages work
- ✅ Dark/light theme toggle works

#### Integration Testing
1. Open browser console (F12)
2. Navigate to different pages
3. Check for CORS errors
4. Test Ask Neo chat with a question
5. Verify all data loads correctly

---

### Updating After Changes

#### Backend Updates:
```bash
git add .
git commit -m "Update backend"
git push origin main
```
Railway will auto-deploy from `main` branch.

#### Frontend Updates:
```bash
git add .
git commit -m "Update frontend"
git push origin main
```
Netlify will auto-deploy from `main` branch.

---

### Environment Variables Reference

#### Backend Required:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon/public key
- `OPENAI_API_KEY` - OpenAI API key for chat functionality

#### Backend Optional:
- `NEO4J_URI` - Neo4j database URI (graceful fallback if not set)
- `NEO4J_USER` - Neo4j username
- `NEO4J_PASSWORD` - Neo4j password
- `ALLOWED_ORIGINS` - Comma-separated allowed origins for CORS
- `PORT` - Server port (auto-set by Railway)

#### Frontend Required:
- `NEXT_PUBLIC_API_BASE_URL` - Your Railway backend URL

---

## 🆘 Troubleshooting

### Common Issues

1. **Backend not connecting to Supabase**
   - Verify your Supabase credentials in `.env`
   - Check that your Supabase project is active

2. **Neo4j connection errors**
   - Neo4j is optional - the app will continue without it
   - If using Neo4j, verify connection credentials

3. **Frontend build errors**
   - Clear `.next` folder: `rm -rf .next`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

4. **Port already in use**
   - Change the port in `package.json` or kill the process using the port

## 📞 Support

For issues and questions, please contact the development team.

---

**Built with ❤️ by the NEO Intelligence Team**


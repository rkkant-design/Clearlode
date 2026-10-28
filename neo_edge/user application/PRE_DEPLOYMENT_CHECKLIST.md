# 🔍 Pre-Deployment Testing & Validation Checklist

**Before deploying to Railway (Backend) and Netlify (Frontend), complete ALL checks below.**

---

## 📋 **Backend Pre-Deployment Checks**

### **1. Environment Variables Validation** ✅

#### **Required Variables Check:**
```bash
# Test in backend directory
cd backend
```

**Verify these exist (create .env file for testing):**
- [ ] `SUPABASE_URL` - Valid Supabase project URL
- [ ] `SUPABASE_KEY` - Valid Supabase anon key
- [ ] `OPENAI_API_KEY` - Valid OpenAI API key
- [ ] `NODE_ENV` - Set to `production` for deployment
- [ ] `PORT` - Will be auto-set by Railway (can omit)

**Optional (but recommended):**
- [ ] `NEO4J_URI` - Valid Neo4j connection string
- [ ] `NEO4J_USER` - Neo4j username
- [ ] `NEO4J_PASSWORD` - Neo4j password
- [ ] `ALLOWED_ORIGINS` - Comma-separated allowed domains

**Test Command:**
```bash
# Check if all required env vars are set
node -e "require('dotenv').config(); console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌'); console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✅' : '❌'); console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅' : '❌');"
```

---

### **2. Backend Code Validation** ✅

#### **Syntax Check:**
```bash
cd backend
node --check index.js
node --check db/supabase.js
node --check db/neo4j.js
node --check services/queryRouter.js
node --check services/chatService.js
```
**Expected:** No errors, clean exit

#### **Import Resolution Check:**
```bash
# Test if all imports resolve correctly
node --input-type=module -e "import('./index.js').catch(e => { console.error('Import error:', e.message); process.exit(1); })"
```
**Expected:** No import errors

---

### **3. Backend Dependency Check** ✅

```bash
cd backend
npm install
npm audit
npm outdated
```

**Check for:**
- [ ] No critical security vulnerabilities (`npm audit`)
- [ ] All dependencies install without errors
- [ ] No peer dependency warnings
- [ ] `package.json` has correct `engines` field (Node >=18)

**Fix any issues:**
```bash
# If vulnerabilities found
npm audit fix

# If peer dependency issues
npm install --legacy-peer-deps
```

---

### **4. Backend Local Server Test** ✅

#### **Start Server:**
```bash
cd backend
npm start
# OR
node index.js
```

**Test Health Endpoint:**
```bash
# In another terminal
curl http://localhost:5001/health
# OR open browser: http://localhost:5001/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Latest Page Backend is running"
}
```

**Test All API Endpoints:**
```bash
# Health
curl http://localhost:5001/health

# Videos
curl http://localhost:5001/api/videos?limit=5

# Feed
curl http://localhost:5001/api/feed?limit=5

# Spotlight
curl http://localhost:5001/api/spotlight

# Trending Tags
curl http://localhost:5001/api/stats/trending?limit=5

# Top Vendors
curl http://localhost:5001/api/stats/vendors?limit=5

# Filters - Vendors
curl http://localhost:5001/api/filters/vendors

# Filters - Trending Keywords
curl http://localhost:5001/api/filters/trending-keywords?limit=5
```

**Check for:**
- [ ] All endpoints return 200 status
- [ ] No 500 errors
- [ ] Response format is correct JSON
- [ ] No CORS errors in console

---

### **5. Backend Database Connection Tests** ✅

#### **Supabase Connection:**
```bash
# Test Supabase connection
node -e "
import('dotenv').then(dotenv => dotenv.default.config());
import('./db/supabase.js').then(async ({ supabase }) => {
  try {
    const { data, error } = await supabase.from('videos').select('id').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connected:', data ? 'Working' : 'No data');
  } catch (e) {
    console.error('❌ Supabase error:', e.message);
    process.exit(1);
  }
});
"
```

**Check:**
- [ ] Supabase connection successful
- [ ] Can query `videos` table
- [ ] Can query `feeds` table
- [ ] Can query `transcript_chunks` table

#### **Neo4j Connection (Optional):**
```bash
# Test Neo4j connection
node -e "
import('dotenv').then(dotenv => dotenv.default.config());
import('./db/neo4j.js').then(async ({ getDriver }) => {
  const driver = getDriver();
  if (!driver) {
    console.log('⚠️  Neo4j not configured (optional)');
    process.exit(0);
  }
  const session = driver.session();
  try {
    const result = await session.run('RETURN 1 as test');
    console.log('✅ Neo4j connected');
    await session.close();
  } catch (e) {
    console.error('❌ Neo4j error:', e.message);
    process.exit(1);
  }
});
"
```

**Check:**
- [ ] Neo4j connects (if configured)
- [ ] Can run basic queries
- [ ] Graceful fallback if not configured

---

### **6. Backend OpenAI API Test** ✅

```bash
# Test OpenAI API key
node -e "
import('dotenv').then(dotenv => dotenv.default.config());
import('openai').then(OpenAI => {
  const openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });
  openai.models.list().then(() => {
    console.log('✅ OpenAI API key valid');
  }).catch(e => {
    console.error('❌ OpenAI error:', e.message);
    process.exit(1);
  });
});
"
```

**Check:**
- [ ] OpenAI API key is valid
- [ ] Can make API calls
- [ ] Rate limits understood

---

### **7. Backend CORS Test** ✅

**Test CORS Headers:**
```bash
# Test CORS with curl
curl -H "Origin: http://localhost:3001" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:5001/api/videos \
     -v
```

**Check Response Headers:**
- [ ] `Access-Control-Allow-Origin` header present
- [ ] `Access-Control-Allow-Methods` includes GET, POST
- [ ] `Access-Control-Allow-Headers` includes Content-Type

**Test with Browser:**
```javascript
// Open browser console on http://localhost:3001
fetch('http://localhost:5001/api/videos')
  .then(r => r.json())
  .then(data => console.log('✅ CORS working:', data))
  .catch(e => console.error('❌ CORS error:', e));
```

---

### **8. Backend Chat/Ask Neo Test** ✅

```bash
# Test chat endpoint
curl -X POST http://localhost:5001/api/chat \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3001" \
  -d '{
    "question": "What is agentic AI?",
    "conversationHistory": []
  }'
```

**Check:**
- [ ] Returns 200 status
- [ ] Response has `answer` field
- [ ] Response has `sources` array
- [ ] Response has `intent` classification
- [ ] No errors in server logs

---

### **9. Backend Error Handling Test** ✅

**Test Invalid Requests:**
```bash
# Test invalid video ID
curl http://localhost:5001/api/video/invalid-id

# Test invalid chat request
curl -X POST http://localhost:5001/api/chat \
  -H "Content-Type: application/json" \
  -d '{}'

# Test missing question
curl -X POST http://localhost:5001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": ""}'
```

**Check:**
- [ ] Returns appropriate error codes (400, 404, 500)
- [ ] Error messages are helpful
- [ ] No stack traces in production mode
- [ ] Server doesn't crash

---

### **10. Backend Performance Test** ✅

**Test Response Times:**
```bash
# Test endpoint speed
time curl http://localhost:5001/api/videos?limit=12
time curl http://localhost:5001/api/feed?limit=12
time curl -X POST http://localhost:5001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "test"}'
```

**Check:**
- [ ] API responses < 2 seconds (except chat)
- [ ] Chat responses < 10 seconds
- [ ] No memory leaks (monitor with `node --inspect`)
- [ ] Server handles concurrent requests

---

### **11. Backend Logging Check** ✅

**Monitor Server Logs:**
```bash
# Start server and watch logs
npm start
```

**Check:**
- [ ] Startup messages clear
- [ ] Error logs are descriptive
- [ ] No sensitive data in logs (API keys, passwords)
- [ ] Connection status messages appear

---

### **12. Backend Production Build Test** ✅

```bash
cd backend
NODE_ENV=production npm start
```

**Test:**
- [ ] Server starts in production mode
- [ ] Error messages don't expose stack traces
- [ ] CORS works correctly
- [ ] All endpoints functional

---

## 📋 **Frontend Pre-Deployment Checks**

### **1. Environment Variables Validation** ✅

**Check `.env.local` or `.env.production`:**
```bash
cd frontend
```

**Required:**
- [ ] `NEXT_PUBLIC_API_BASE_URL` - Set to your Railway backend URL (for production)
- [ ] For local testing: `NEXT_PUBLIC_API_BASE_URL=http://localhost:5001`

**Test:**
```bash
# Check env var is accessible
node -e "console.log('API URL:', process.env.NEXT_PUBLIC_API_BASE_URL || 'NOT SET')"
```

**Note:** In Next.js, only `NEXT_PUBLIC_*` vars are exposed to browser.

---

### **2. Frontend TypeScript Compilation** ✅

```bash
cd frontend
npm run build
```

**Check Output:**
- [ ] No TypeScript errors
- [ ] No compilation errors
- [ ] Build completes successfully
- [ ] All pages compile
- [ ] No missing imports

**Expected Output:**
```
✓ Compiled successfully
✓ Running TypeScript ...
✓ Collecting page data ...
✓ Generating static pages ...
```

**If Errors Found:**
```bash
# Check TypeScript errors
npx tsc --noEmit

# Fix errors and rebuild
npm run build
```

---

### **3. Frontend Dependency Check** ✅

```bash
cd frontend
npm install
npm audit
npm outdated
```

**Check:**
- [ ] No critical security vulnerabilities
- [ ] All dependencies install without errors
- [ ] No peer dependency warnings
- [ ] `package.json` has correct `engines` field (Node >=18)

**Fix Issues:**
```bash
npm audit fix
npm install --legacy-peer-deps  # If needed
```

---

### **4. Frontend Linting** ✅

```bash
cd frontend
npm run lint
```

**Check:**
- [ ] No linting errors
- [ ] No linting warnings (or acceptable warnings)
- [ ] Code follows Next.js best practices

**Fix Issues:**
```bash
npm run lint -- --fix  # Auto-fix if possible
```

---

### **5. Frontend Production Build Test** ✅

```bash
cd frontend
npm run build
npm start
```

**Check:**
- [ ] Build completes without errors
- [ ] Production server starts on port 3000
- [ ] No console errors in terminal
- [ ] Build output size is reasonable

**Expected Build Output:**
```
Route (app)
┌ ○ /
├ ○ /feed
├ ƒ /latest
├ ƒ /latest/[id]
└ ...
```

---

### **6. Frontend Local Testing** ✅

**Start Production Build:**
```bash
cd frontend
npm run build
npm start
```

**Open Browser:** `http://localhost:3000`

**Test Each Page:**
- [ ] `/` - Landing page loads
- [ ] `/feed` - Feed page loads with data
- [ ] `/latest` - Latest page loads with videos
- [ ] `/latest/[id]` - Video detail page loads
- [ ] `/vendors` - Vendors page loads
- [ ] `/use-case-explorer` - Use case explorer loads
- [ ] `/feature-explorer` - Feature explorer loads
- [ ] `/benchmarking` - Benchmarking page loads
- [ ] `/playbook` - Playbook page loads

**Check Browser Console (F12):**
- [ ] No JavaScript errors
- [ ] No 404 errors for assets
- [ ] No CORS errors
- [ ] No network errors

---

### **7. Frontend API Integration Test** ✅

**Test API Calls from Frontend:**

**Open Browser Console on `http://localhost:3000`:**

```javascript
// Test API connection
fetch('/api/videos').then(r => r.json()).then(console.log).catch(console.error);

// Test Ask Neo
fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question: 'test', conversationHistory: [] })
}).then(r => r.json()).then(console.log).catch(console.error);
```

**Check:**
- [ ] API calls succeed
- [ ] Data loads correctly
- [ ] Error handling works
- [ ] Loading states display
- [ ] No CORS errors

---

### **8. Frontend Ask Neo Chat Test** ✅

**Manual Testing:**
1. Open app in browser
2. Click "Ask Neo" button (bottom-right)
3. Type a question: "What is agentic AI?"
4. Click send

**Check:**
- [ ] Chat opens correctly
- [ ] Message sends
- [ ] Response appears
- [ ] Sources display (if available)
- [ ] Loading indicator shows
- [ ] Error handling works
- [ ] Conversation history maintained

---

### **9. Frontend Responsive Design Test** ✅

**Test on Different Screen Sizes:**
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

**Browser DevTools:**
- Press `F12` → Toggle device toolbar
- Test responsive breakpoints

**Check:**
- [ ] Layout doesn't break
- [ ] Text is readable
- [ ] Buttons are clickable
- [ ] Images scale correctly
- [ ] Sidebar collapses on mobile
- [ ] Navigation works

---

### **10. Frontend Theme Test** ✅

**Test Dark/Light Mode:**
1. Click theme toggle
2. Check all pages in both modes

**Check:**
- [ ] Theme toggle works
- [ ] Colors are readable in both modes
- [ ] No contrast issues
- [ ] Theme persists across pages
- [ ] Theme persists on refresh

---

### **11. Frontend Performance Test** ✅

**Lighthouse Audit (Chrome DevTools):**
1. Open DevTools (F12)
2. Go to "Lighthouse" tab
3. Run audit for:
   - Performance
   - Accessibility
   - Best Practices
   - SEO

**Target Scores:**
- [ ] Performance: > 80
- [ ] Accessibility: > 90
- [ ] Best Practices: > 90
- [ ] SEO: > 80

**Check:**
- [ ] Images optimized
- [ ] No unused JavaScript
- [ ] Fast initial load
- [ ] Good Core Web Vitals

---

### **12. Frontend Error Boundaries Test** ✅

**Test Error Handling:**
```javascript
// In browser console, simulate errors
throw new Error('Test error');
```

**Check:**
- [ ] Errors don't crash entire app
- [ ] Error messages are user-friendly
- [ ] App can recover from errors

---

### **13. Frontend Environment Variable Test** ✅

**Test Production Environment:**
```bash
cd frontend
NEXT_PUBLIC_API_BASE_URL=https://your-railway-app.railway.app npm run build
```

**Check:**
- [ ] Build uses production API URL
- [ ] No hardcoded localhost URLs
- [ ] Environment variable accessible in browser

**Verify in Browser:**
```javascript
// In browser console
console.log('API URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
// Should show your Railway URL (not localhost)
```

---

### **14. Frontend Netlify Config Test** ✅

**Verify `netlify.toml`:**
```bash
cd frontend
cat netlify.toml
```

**Check:**
- [ ] Build command: `npm run build`
- [ ] Publish directory: `.next`
- [ ] Node version specified
- [ ] Redirects configured
- [ ] Headers configured

**Test Locally with Netlify CLI (Optional):**
```bash
npm install -g netlify-cli
netlify dev
```

---

## 🔗 **Integration Tests (Backend + Frontend)**

### **1. End-to-End API Test** ✅

**Start Both Servers:**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run build
npm start
```

**Test Full Flow:**
1. Open `http://localhost:3000`
2. Navigate to `/feed`
3. Check data loads from backend
4. Navigate to `/latest`
5. Check videos load
6. Click on a video
7. Check detail page loads
8. Test Ask Neo chat
9. Check all API calls succeed

**Check Browser Network Tab:**
- [ ] All API calls return 200
- [ ] No CORS errors
- [ ] Response times acceptable
- [ ] Data format correct

---

### **2. CORS Integration Test** ✅

**Test from Frontend:**
```javascript
// In browser console on http://localhost:3000
fetch('http://localhost:5001/api/videos')
  .then(r => {
    console.log('Status:', r.status);
    console.log('CORS Headers:', r.headers.get('access-control-allow-origin'));
    return r.json();
  })
  .then(data => console.log('✅ CORS working:', data))
  .catch(e => console.error('❌ CORS error:', e));
```

**Check:**
- [ ] No CORS errors
- [ ] Headers present
- [ ] Data accessible

---

### **3. Production Environment Simulation** ✅

**Test with Production URLs:**
```bash
# Backend - Use production env vars
cd backend
NODE_ENV=production ALLOWED_ORIGINS=https://your-app.netlify.app npm start

# Frontend - Use production API URL
cd frontend
NEXT_PUBLIC_API_BASE_URL=https://your-railway-app.railway.app npm run build
npm start
```

**Test:**
- [ ] Everything works with production config
- [ ] CORS allows Netlify domain
- [ ] API calls reach production backend

---

## 🔒 **Security Checks**

### **1. Secrets Check** ✅

```bash
# Check for accidentally committed secrets
git grep -i "api_key" -- "*.js" "*.ts" "*.tsx" "*.json"
git grep -i "password" -- "*.js" "*.ts" "*.tsx"
git grep -i "secret" -- "*.js" "*.ts" "*.tsx"
```

**Check:**
- [ ] No API keys in code
- [ ] No passwords in code
- [ ] No secrets in code
- [ ] All secrets in environment variables

---

### **2. .gitignore Check** ✅

```bash
# Verify .env files are ignored
git status | grep -i ".env"
```

**Check:**
- [ ] No `.env` files in git
- [ ] `.gitignore` includes `.env*`
- [ ] No sensitive files tracked

---

### **3. Dependency Security** ✅

```bash
# Backend
cd backend
npm audit

# Frontend
cd frontend
npm audit
```

**Check:**
- [ ] No critical vulnerabilities
- [ ] No high vulnerabilities (or acceptable)
- [ ] Fix any critical issues

---

## 📊 **Final Pre-Deployment Checklist**

### **Backend** ✅
- [ ] All environment variables set and tested
- [ ] All API endpoints working
- [ ] Database connections working
- [ ] OpenAI API working
- [ ] CORS configured correctly
- [ ] Error handling tested
- [ ] Production build tested
- [ ] No secrets in code
- [ ] Logging working
- [ ] Performance acceptable

### **Frontend** ✅
- [ ] Environment variables set
- [ ] TypeScript compiles without errors
- [ ] Production build successful
- [ ] All pages load correctly
- [ ] API integration working
- [ ] Ask Neo chat working
- [ ] Responsive design tested
- [ ] Theme toggle working
- [ ] Performance acceptable
- [ ] No console errors
- [ ] Netlify config correct

### **Integration** ✅
- [ ] End-to-end flow tested
- [ ] CORS working
- [ ] Production environment tested
- [ ] No integration errors

### **Security** ✅
- [ ] No secrets in code
- [ ] .gitignore correct
- [ ] Dependencies secure
- [ ] CORS properly configured

---

## 🚀 **Ready to Deploy?**

**If ALL checks pass:**
1. ✅ Backend ready for Railway
2. ✅ Frontend ready for Netlify
3. ✅ Integration tested
4. ✅ Security verified

**Proceed to deployment!**

---

## 📝 **Quick Test Script**

Save this as `test-deployment.sh`:

```bash
#!/bin/bash

echo "🔍 Running Pre-Deployment Tests..."

# Backend Tests
echo "Testing Backend..."
cd backend
node --check index.js && echo "✅ Backend syntax OK" || echo "❌ Backend syntax error"
npm audit --audit-level=moderate && echo "✅ Backend security OK" || echo "⚠️  Backend security issues"

# Frontend Tests
echo "Testing Frontend..."
cd ../frontend
npm run build && echo "✅ Frontend build OK" || echo "❌ Frontend build error"
npm audit --audit-level=moderate && echo "✅ Frontend security OK" || echo "⚠️  Frontend security issues"

echo "✅ Pre-deployment tests complete!"
```

**Run:**
```bash
chmod +x test-deployment.sh
./test-deployment.sh
```

---

**Last Updated:** January 24, 2026


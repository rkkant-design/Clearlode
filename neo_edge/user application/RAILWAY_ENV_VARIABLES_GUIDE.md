# 🚂 Railway Environment Variables Guide

## How to Add Environment Variables in Railway

### Step 1: Access Railway Dashboard
1. Go to [railway.app](https://railway.app)
2. Select your project: `neo_insight_edge-v2`
3. Click on your service (the backend service)
4. Go to **"Variables"** tab (or **"Settings"** → **"Variables"**)

### Step 2: Add Each Variable

Click **"+ New Variable"** for each variable below:

---

## ✅ **REQUIRED Environment Variables**

### **1. NODE_ENV**
```
Variable Name: NODE_ENV
Value: production
```
**Purpose:** Sets the environment to production mode

---

### **2. SUPABASE_URL**
```
Variable Name: SUPABASE_URL
Value: https://your-project-id.supabase.co
```
**How to Get:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy **"Project URL"**

**Example:**
```
https://abcdefghijklmnop.supabase.co
```

---

### **3. SUPABASE_KEY**
```
Variable Name: SUPABASE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
**How to Get:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy **"anon"** or **"public"** key (NOT the service_role key!)

**Example:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI4MCwiZXhwIjoxOTU0NTQzMjgwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### **4. OPENAI_API_KEY**
```
Variable Name: OPENAI_API_KEY
Value: sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
**How to Get:**
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign in to your account
3. Go to **API Keys** section
4. Click **"+ Create new secret key"**
5. Copy the key (you can only see it once!)

**Example:**
```
sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**⚠️ Important:** This is required for the Ask Neo chat feature to work.

---

## ⚙️ **OPTIONAL Environment Variables**

### **5. NEO4J_URI** (Optional)
```
Variable Name: NEO4J_URI
Value: neo4j+s://xxxxxxxx.databases.neo4j.io
```
**How to Get:**
1. Go to [Neo4j Aura](https://console.neo4j.io) or your Neo4j instance
2. Copy the connection URI

**Example:**
```
neo4j+s://xxxxxxxx.databases.neo4j.io
```

**Note:** If not provided, the app will gracefully continue without Neo4j features (trending tags, use case explorer).

---

### **6. NEO4J_USER** (Optional - only if using Neo4j)
```
Variable Name: NEO4J_USER
Value: neo4j
```
**Default:** Usually `neo4j`

---

### **7. NEO4J_PASSWORD** (Optional - only if using Neo4j)
```
Variable Name: NEO4J_PASSWORD
Value: your_neo4j_password
```
**How to Get:**
- Set when creating Neo4j database
- Or reset in Neo4j dashboard

---

### **8. ALLOWED_ORIGINS** (Recommended for Production)
```
Variable Name: ALLOWED_ORIGINS
Value: https://your-app.netlify.app,https://your-custom-domain.com
```
**Purpose:** Restricts CORS to only your frontend domains

**How to Get:**
1. After deploying frontend to Netlify, get your Netlify URL
2. Add it here (comma-separated if multiple domains)

**Example:**
```
https://neo-intelligence.netlify.app
```

**Or multiple domains:**
```
https://neo-intelligence.netlify.app,https://neo.example.com
```

**Note:** If not set, Railway will allow:
- Localhost (for testing)
- All `*.netlify.app` domains
- All `*.vercel.app` domains

---

## 📋 **Complete Railway Variables Checklist**

Copy this checklist and check off each variable as you add it:

### Required:
- [ ] `NODE_ENV` = `production`
- [ ] `SUPABASE_URL` = `https://your-project.supabase.co`
- [ ] `SUPABASE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- [ ] `OPENAI_API_KEY` = `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx`

### Optional (but recommended):
- [ ] `ALLOWED_ORIGINS` = `https://your-app.netlify.app`
- [ ] `NEO4J_URI` = `neo4j+s://xxxxxxxx.databases.neo4j.io` (if using Neo4j)
- [ ] `NEO4J_USER` = `neo4j` (if using Neo4j)
- [ ] `NEO4J_PASSWORD` = `your_password` (if using Neo4j)

---

## 🚫 **DO NOT ADD These Variables**

### **PORT** ❌
- **Don't add this!** Railway automatically sets `PORT` for you
- Your code already handles this: `const PORT = process.env.PORT || 5001;`

---

## 📸 **Railway Dashboard Screenshot Guide**

### Where to Find Variables Tab:
1. **Railway Dashboard** → Your Project
2. Click on **Service** (neo_insight_edge-v2)
3. Click **"Variables"** tab (top navigation)
4. Click **"+ New Variable"** button

### Adding a Variable:
1. **Variable Name:** Enter the exact name (case-sensitive!)
2. **Value:** Enter the value (Railway hides it for security)
3. Click **"Add"** or **"Save"**

---

## ✅ **Verification Steps**

After adding all variables:

1. **Check Railway Logs:**
   - Go to **"Deployments"** tab
   - Click on latest deployment
   - Check logs for:
     - ✅ `✅ Supabase client initialized`
     - ✅ `✅ Neo4j driver initialized` (if Neo4j configured)
     - ✅ No errors about missing environment variables

2. **Test Health Endpoint:**
   ```bash
   curl https://your-railway-app.railway.app/health
   ```
   Should return:
   ```json
   {
     "status": "ok",
     "message": "Latest Page Backend is running"
   }
   ```

3. **Test API Endpoint:**
   ```bash
   curl https://your-railway-app.railway.app/api/videos?limit=1
   ```
   Should return video data (not errors)

---

## 🔒 **Security Best Practices**

1. ✅ **Never commit** `.env` files to git (already in `.gitignore`)
2. ✅ **Use production keys** - Don't reuse development keys
3. ✅ **Rotate keys regularly** - Especially OpenAI API keys
4. ✅ **Use Railway's secret management** - Variables are encrypted at rest
5. ✅ **Limit ALLOWED_ORIGINS** - Only add your production domains

---

## 🆘 **Troubleshooting**

### Problem: "Supabase client not initialized"
**Solution:** Check `SUPABASE_URL` and `SUPABASE_KEY` are correct

### Problem: "OpenAI API key not configured"
**Solution:** Verify `OPENAI_API_KEY` is set correctly (starts with `sk-`)

### Problem: CORS errors from frontend
**Solution:** Add your Netlify URL to `ALLOWED_ORIGINS`

### Problem: Neo4j connection errors
**Solution:** 
- Check all three Neo4j variables are set
- Or remove them if not using Neo4j (app will work without it)

---

## 📝 **Quick Reference**

**Minimum Required (App will work):**
```
NODE_ENV=production
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbGci...
OPENAI_API_KEY=sk-proj-xxx...
```

**Recommended (Full features):**
```
NODE_ENV=production
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbGci...
OPENAI_API_KEY=sk-proj-xxx...
ALLOWED_ORIGINS=https://your-app.netlify.app
NEO4J_URI=neo4j+s://xxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```

---

**Last Updated:** January 24, 2026


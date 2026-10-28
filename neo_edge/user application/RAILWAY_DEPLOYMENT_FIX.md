# 🚂 Railway Deployment Fix

## Problem
Railway is trying to build from the root directory and sees both `backend/` and `frontend/` folders, so it can't determine which one to build.

**Error:** `Railpack could not determine how to build the app.`

## Solution Options

### **Option 1: Configure Root Directory in Railway Dashboard (RECOMMENDED)**

1. Go to your Railway project dashboard
2. Click on your service (neo_insight_edge-v2)
3. Go to **Settings** tab
4. Find **"Root Directory"** or **"Source"** section
5. Set **Root Directory** to: `backend`
6. Save and redeploy

This tells Railway to treat `backend/` as the root directory for this service.

---

### **Option 2: Use Root-Level Configuration Files**

I've created:
- `railway.json` - Railway configuration at root
- `nixpacks.toml` - Nixpacks builder configuration

These files tell Railway to:
- Change directory to `backend` before running commands
- Install dependencies in `backend`
- Start the server from `backend`

**If using this option:**
1. The files are already in the repo
2. Push to GitHub
3. Railway should auto-detect and use them

---

### **Option 3: Create Separate Railway Services**

**Best Practice for Monorepos:**

1. **Service 1: Backend**
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`

2. **Service 2: Frontend** (if deploying to Railway)
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Start Command: `npm start`

**Note:** Frontend should go to Netlify, not Railway.

---

## Quick Fix Steps

### **In Railway Dashboard:**

1. **Open your service**
2. **Go to Settings**
3. **Find "Root Directory"**
4. **Set to:** `backend`
5. **Save**
6. **Redeploy**

### **Or via Railway CLI:**

```bash
railway service update --root-directory backend
```

---

## Verification

After fixing, Railway should:
- ✅ Detect Node.js project in `backend/`
- ✅ Run `npm install` in `backend/`
- ✅ Run `npm start` in `backend/`
- ✅ Server starts on Railway's assigned PORT

---

## Current Configuration Files

- ✅ `railway.json` (root) - Railway config
- ✅ `nixpacks.toml` (root) - Nixpacks config
- ✅ `backend/railway.json` - Backend-specific config
- ✅ `backend/package.json` - Has correct start script

---

## Why This Happened

Railway's Railpack builder scans the root directory and looks for:
- `package.json` (Node.js)
- `requirements.txt` (Python)
- `Gemfile` (Ruby)
- etc.

When it sees multiple folders with different project types, it can't auto-detect which one to build.

**Solution:** Explicitly tell Railway which directory to use.

---

## Next Steps

1. ✅ **Set Root Directory in Railway Dashboard to `backend`**
2. ✅ **Redeploy**
3. ✅ **Check logs** - should see Node.js installation
4. ✅ **Verify** - health endpoint should work

---

**Last Updated:** January 24, 2026


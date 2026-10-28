# 🔗 URL Configuration Guide - Railway Backend ↔ Netlify Frontend

## Overview

You need to configure URLs in two places:
1. **Frontend (Netlify)** → Needs Railway backend URL
2. **Backend (Railway)** → Needs Netlify frontend URL (for CORS)

---

## 📍 **Step 1: Get Railway Backend URL**

### **After Railway Deployment:**

1. **Go to Railway Dashboard:**
   - Visit [railway.app](https://railway.app)
   - Select your project: `neo_insight_edge-v2`
   - Click on your **backend service**

2. **Find Your URL:**
   - Go to **"Settings"** tab
   - Scroll to **"Networking"** or **"Domains"** section
   - You'll see your Railway URL:
     ```
     https://your-app-name.up.railway.app
     ```
   - OR click **"Generate Domain"** if not already generated

3. **Alternative: Check Deployments:**
   - Go to **"Deployments"** tab
   - Click on latest deployment
   - The URL is shown in the deployment details

4. **Test Your Backend URL:**
   ```bash
   curl https://your-app-name.up.railway.app/health
   ```
   Should return:
   ```json
   {
     "status": "ok",
     "message": "Latest Page Backend is running"
   }
   ```

### **Example Railway URL:**
```
https://neo-insight-edge-v2-production.up.railway.app
```

---

## 📍 **Step 2: Get Netlify Frontend URL**

### **After Netlify Deployment:**

1. **Go to Netlify Dashboard:**
   - Visit [app.netlify.com](https://app.netlify.com)
   - Select your site

2. **Find Your URL:**
   - Your site URL is shown at the top:
     ```
     https://your-site-name.netlify.app
     ```
   - OR go to **"Site settings"** → **"Domain management"**
   - Default Netlify URL format: `https://random-name-12345.netlify.app`

3. **Custom Domain (Optional):**
   - If you added a custom domain, use that instead
   - Example: `https://neo-intelligence.com`

### **Example Netlify URL:**
```
https://neo-intelligence-12345.netlify.app
```

---

## 🔧 **Step 3: Configure Frontend (Netlify)**

### **Add Railway Backend URL to Netlify:**

1. **Go to Netlify Dashboard:**
   - Select your site
   - Go to **"Site settings"** (gear icon)
   - Click **"Environment variables"** in left sidebar

2. **Add New Variable:**
   - Click **"Add a variable"**
   - **Variable name:** `NEXT_PUBLIC_API_BASE_URL`
   - **Value:** `https://your-railway-app.up.railway.app`
     - Replace with your actual Railway URL from Step 1
   - **Scopes:** Select **"Production"** (and **"Deploy previews"** if you want)
   - Click **"Save"**

3. **Redeploy:**
   - After adding the variable, go to **"Deploys"** tab
   - Click **"Trigger deploy"** → **"Deploy site"**
   - This rebuilds your site with the new environment variable

### **Example Netlify Environment Variable:**
```
Variable Name: NEXT_PUBLIC_API_BASE_URL
Value: https://neo-insight-edge-v2-production.up.railway.app
Scope: Production, Deploy previews
```

---

## 🔧 **Step 4: Configure Backend (Railway)**

### **Add Netlify Frontend URL to Railway (for CORS):**

1. **Go to Railway Dashboard:**
   - Select your project
   - Click on your **backend service**
   - Go to **"Variables"** tab

2. **Add ALLOWED_ORIGINS Variable:**
   - Click **"+ New Variable"**
   - **Variable name:** `ALLOWED_ORIGINS`
   - **Value:** `https://your-site-name.netlify.app`
     - Replace with your actual Netlify URL from Step 2
   - Click **"Add"**

3. **If You Have Multiple Domains:**
   - Separate with commas (no spaces):
   ```
   https://neo-intelligence.netlify.app,https://neo-intelligence.com
   ```

4. **Redeploy:**
   - Railway will automatically redeploy when you add variables
   - Or manually trigger: **"Deployments"** → **"Redeploy"**

### **Example Railway Environment Variable:**
```
Variable Name: ALLOWED_ORIGINS
Value: https://neo-intelligence-12345.netlify.app
```

---

## ✅ **Complete Configuration Checklist**

### **Frontend (Netlify):**
- [ ] Get Railway backend URL: `https://xxx.up.railway.app`
- [ ] Add to Netlify: `NEXT_PUBLIC_API_BASE_URL = https://xxx.up.railway.app`
- [ ] Redeploy Netlify site

### **Backend (Railway):**
- [ ] Get Netlify frontend URL: `https://xxx.netlify.app`
- [ ] Add to Railway: `ALLOWED_ORIGINS = https://xxx.netlify.app`
- [ ] Railway auto-redeploys

---

## 🧪 **Testing the Configuration**

### **Test 1: Backend Health Check**
```bash
curl https://your-railway-app.up.railway.app/health
```
**Expected:** `{"status":"ok","message":"Latest Page Backend is running"}`

### **Test 2: Frontend Can Reach Backend**
1. Open your Netlify site in browser
2. Open browser console (F12)
3. Check Network tab
4. Navigate to a page that loads data (like `/feed` or `/latest`)
5. Look for API calls to your Railway URL
6. Should see **200 OK** responses (not CORS errors)

### **Test 3: CORS Working**
1. Open your Netlify site
2. Open browser console (F12)
3. Run this in console:
   ```javascript
   fetch('https://your-railway-app.up.railway.app/api/videos?limit=1')
     .then(r => r.json())
     .then(data => console.log('✅ CORS working:', data))
     .catch(e => console.error('❌ CORS error:', e));
   ```
4. Should see data, not CORS errors

---

## 🔄 **Deployment Order**

### **Recommended Sequence:**

1. **Deploy Backend to Railway First:**
   - Deploy backend
   - Get Railway URL
   - Test health endpoint

2. **Deploy Frontend to Netlify:**
   - Deploy frontend
   - Get Netlify URL
   - Add Railway URL to Netlify env vars
   - Redeploy frontend

3. **Update Backend CORS:**
   - Add Netlify URL to Railway `ALLOWED_ORIGINS`
   - Railway auto-redeploys

4. **Test Everything:**
   - Test frontend loads
   - Test API calls work
   - Test Ask Neo chat works
   - Test no CORS errors

---

## 📝 **Quick Reference**

### **Railway Backend URL Format:**
```
https://[service-name]-[random-id].up.railway.app
```

### **Netlify Frontend URL Format:**
```
https://[site-name].netlify.app
```

### **Environment Variables Summary:**

**Netlify (Frontend):**
```
NEXT_PUBLIC_API_BASE_URL=https://your-railway-app.up.railway.app
```

**Railway (Backend):**
```
ALLOWED_ORIGINS=https://your-site.netlify.app
```

---

## 🆘 **Troubleshooting**

### **Problem: Frontend can't reach backend**
**Check:**
- ✅ `NEXT_PUBLIC_API_BASE_URL` is set in Netlify
- ✅ Railway backend URL is correct
- ✅ Railway backend is running (check health endpoint)
- ✅ Netlify site was redeployed after adding env var

### **Problem: CORS errors in browser**
**Check:**
- ✅ `ALLOWED_ORIGINS` is set in Railway
- ✅ Netlify URL in `ALLOWED_ORIGINS` matches exactly (including `https://`)
- ✅ Railway service was redeployed after adding variable
- ✅ No typos in the URL

### **Problem: "Failed to fetch" errors**
**Check:**
- ✅ Backend is running (test health endpoint)
- ✅ URL is correct (no trailing slashes)
- ✅ Network connectivity (try curl from terminal)

---

## 🎯 **Example Configuration**

### **Railway Backend:**
```
Service URL: https://neo-insight-edge-v2-production.up.railway.app
Environment Variables:
  - NODE_ENV=production
  - SUPABASE_URL=https://xxx.supabase.co
  - SUPABASE_KEY=eyJhbGci...
  - OPENAI_API_KEY=sk-proj-xxx...
  - ALLOWED_ORIGINS=https://neo-intelligence.netlify.app
```

### **Netlify Frontend:**
```
Site URL: https://neo-intelligence.netlify.app
Environment Variables:
  - NEXT_PUBLIC_API_BASE_URL=https://neo-insight-edge-v2-production.up.railway.app
```

---

## 📸 **Visual Guide**

### **Railway Dashboard:**
```
Project: neo_insight_edge-v2
└── Service: backend
    ├── Settings → Networking → Domain
    │   └── URL: https://xxx.up.railway.app
    └── Variables
        └── ALLOWED_ORIGINS = https://xxx.netlify.app
```

### **Netlify Dashboard:**
```
Site: neo-intelligence
├── Site settings → Domain management
│   └── URL: https://xxx.netlify.app
└── Site settings → Environment variables
    └── NEXT_PUBLIC_API_BASE_URL = https://xxx.up.railway.app
```

---

**Last Updated:** January 24, 2026


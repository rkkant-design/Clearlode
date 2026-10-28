# 🔧 Railway CORS Error Fix

## Problem
```
CORS blocked origin: https://neosight.netlify.app
Error: Not allowed by CORS
```

**Cause:** Your Netlify frontend URL (`https://neosight.netlify.app`) is not in the `ALLOWED_ORIGINS` environment variable in Railway.

## Solution

### **Add Netlify URL to Railway Environment Variables**

1. **Go to Railway Dashboard:**
   - Open [railway.app](https://railway.app)
   - Select your project → Backend service
   - Go to **"Variables"** tab

2. **Add or Update `ALLOWED_ORIGINS`:**
   - If `ALLOWED_ORIGINS` doesn't exist, click **"+ New Variable"**
   - **Variable Name:** `ALLOWED_ORIGINS`
   - **Value:** `https://neosight.netlify.app`
   - Click **"Add"** or **"Save"**

3. **If `ALLOWED_ORIGINS` already exists:**
   - Click on it to edit
   - Add your Netlify URL (comma-separated if multiple):
     ```
     https://neosight.netlify.app,https://another-domain.com
     ```
   - Save

4. **Railway will auto-redeploy** after adding the variable

## Current CORS Configuration

Your backend code allows:
- Localhost (for development)
- All `*.netlify.app` domains (via regex)
- Custom domains from `ALLOWED_ORIGINS` env variable

However, the regex pattern might not be matching correctly, so explicitly adding your domain to `ALLOWED_ORIGINS` is the safest approach.

## Verification

After adding the variable and Railway redeploys:

1. **Check Railway logs** - Should see no more CORS errors
2. **Test from Netlify site:**
   - Open `https://neosight.netlify.app`
   - Open browser console (F12)
   - Navigate to a page that loads data
   - Should see **200 OK** responses (not CORS errors)

3. **Test API directly:**
   ```bash
   curl -H "Origin: https://neosight.netlify.app" \
        https://neoinsightedge-v2-production.up.railway.app/api/videos
   ```
   Should return data with CORS headers.

## Quick Fix Steps

1. ✅ Railway Dashboard → Variables
2. ✅ Add: `ALLOWED_ORIGINS = https://neosight.netlify.app`
3. ✅ Save (Railway auto-redeploys)
4. ✅ Test your Netlify site

---

**Status:** ⚠️ **CORS Error - Needs Fix**

**Last Updated:** January 24, 2026


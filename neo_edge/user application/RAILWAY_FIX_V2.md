# 🚂 Railway Build Fix - Nixpacks Error

## Problem
```
error: undefined variable 'npm-9'
```

**Cause:** `npm-9` is not a valid Nix package. npm comes bundled with Node.js, so it doesn't need to be specified separately.

## Solution Applied

✅ **Fixed `nixpacks.toml`:**
- Removed `npm-9` from nixPkgs
- Changed `npm install` to `npm ci` (faster, more reliable for production)
- Kept `nodejs-18_x` only

## Updated Configuration

**`nixpacks.toml`:**
```toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]  # npm comes with Node.js

[phases.install]
cmds = ["cd backend && npm ci"]  # ci is faster than install

[start]
cmd = "cd backend && npm start"
```

## What Changed

1. ✅ Removed invalid `npm-9` package
2. ✅ Changed `npm install` → `npm ci` (better for production)
3. ✅ Kept Node.js 18 specification

## Next Steps

1. **Push the fix:**
   ```bash
   git add nixpacks.toml
   git commit -m "Fix Railway build: Remove invalid npm-9 package"
   git push origin main
   ```

2. **Railway will auto-redeploy** (if auto-deploy is enabled)

3. **Or manually redeploy** in Railway dashboard

## Expected Build Flow

After fix, Railway should:
1. ✅ Detect Node.js project
2. ✅ Install Node.js 18 (npm included)
3. ✅ Run `npm ci` in `backend/` directory
4. ✅ Start server with `npm start`

## Alternative: Use Railway Dashboard Settings

If you prefer, you can also:
1. Set **Root Directory** to `backend` in Railway dashboard
2. Remove `nixpacks.toml` (let Railway auto-detect)
3. Railway will handle everything automatically

---

**Status:** ✅ Fixed - Ready to redeploy


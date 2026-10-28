# Frontend Environment Variables Template

Copy these variables to a `.env.local` file in the frontend directory:

## Local Development
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001
```

## Production (Netlify)
Set this in Netlify Dashboard → Site Settings → Environment Variables:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-railway-app.railway.app
```

Replace `your-railway-app` with your actual Railway backend URL after deployment.


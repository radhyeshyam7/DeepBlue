# Vercel Deployment Guide for Saarthi AI

## Project Structure
```
saarthi-ai/
├── frontend/          # React + Vite frontend
├── backend/           # Express.js backend API
├── vercel.json        # Root Vercel configuration
└── .env.example       # Environment variables template
```

## Deployment Options

### Option 1: Deploy as Monorepo (Recommended)

This deploys both frontend and backend together.

#### Steps:

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect the configuration

3. **Configure Environment Variables**
   
   In Vercel Dashboard → Settings → Environment Variables, add:
   
   **Backend Variables:**
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   REDIS_URL=your_redis_url (optional)
   SMS_ENABLED=false
   TWILIO_ACCOUNT_SID=your_twilio_sid (if SMS_ENABLED=true)
   TWILIO_AUTH_TOKEN=your_twilio_token (if SMS_ENABLED=true)
   TWILIO_PHONE_NUMBER=your_twilio_phone (if SMS_ENABLED=true)
   NODE_ENV=production
   ```
   
   **Frontend Variables:**
   ```
   VITE_API_URL=https://your-vercel-app.vercel.app/api
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically

---

### Option 2: Deploy Frontend and Backend Separately

#### Deploy Frontend:

1. **Create new Vercel project for frontend**
   - Import repository
   - Set Root Directory: `frontend`
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

2. **Environment Variables:**
   ```
   VITE_API_URL=https://your-backend-url.vercel.app
   ```

#### Deploy Backend:

1. **Create new Vercel project for backend**
   - Import repository
   - Set Root Directory: `backend`
   - Build Command: (leave empty)
   - Output Directory: (leave empty)

2. **Environment Variables:**
   (Same as backend variables above)

---

## Important Notes

### MongoDB Setup

**For Production, use MongoDB Atlas:**

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string
4. Add to Vercel environment variables as `MONGODB_URI`

Example:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/saarthi_ai?retryWrites=true&w=majority
```

### Redis (Optional)

Redis is optional. The app works without it but with reduced performance.

**Options:**
1. **Upstash Redis** (Free tier available)
   - Go to [upstash.com](https://upstash.com)
   - Create Redis database
   - Get connection URL
   - Add as `REDIS_URL` in Vercel

2. **Skip Redis**
   - Don't set `REDIS_URL`
   - App will work without caching

### API Routes

With the monorepo setup:
- Frontend: `https://your-app.vercel.app`
- Backend API: `https://your-app.vercel.app/api/*`

Update frontend API calls to use `/api` prefix:
```javascript
// frontend/src/api/transactionApi.ts
const API_URL = import.meta.env.VITE_API_URL || '/api';
```

---

## Build Configuration

### Frontend (Vite)

The `frontend/package.json` already has the correct build script:
```json
{
  "scripts": {
    "build": "vite build"
  }
}
```

### Backend (Express)

No build step needed. Vercel runs Node.js directly.

---

## Troubleshooting

### Issue: "Module not found"
**Solution:** Make sure all dependencies are in `package.json`, not just `devDependencies`

### Issue: "Cannot connect to MongoDB"
**Solution:** 
- Check `MONGODB_URI` is set correctly in Vercel
- Whitelist Vercel IPs in MongoDB Atlas (or allow all: `0.0.0.0/0`)

### Issue: "CORS errors"
**Solution:** Update CORS configuration in `backend/src/server.js`:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
```

### Issue: "Frontend can't reach backend"
**Solution:** 
- Check `VITE_API_URL` environment variable
- Verify API routes in `vercel.json`

---

## Post-Deployment Checklist

- [ ] Test user registration/login
- [ ] Test transaction risk analysis
- [ ] Verify MongoDB connection
- [ ] Check Redis connection (if enabled)
- [ ] Test SMS alerts (if enabled)
- [ ] Verify all API endpoints work
- [ ] Check browser console for errors
- [ ] Test on mobile devices

---

## Continuous Deployment

Once set up, Vercel automatically deploys on every push to `main` branch:

```bash
git add .
git commit -m "Update feature"
git push origin main
# Vercel deploys automatically
```

---

## Custom Domain (Optional)

1. Go to Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `VITE_API_URL` if needed

---

## Monitoring

- **Vercel Dashboard:** View deployment logs, analytics
- **MongoDB Atlas:** Monitor database performance
- **Upstash:** Monitor Redis usage (if used)

---

## Support

For issues:
1. Check Vercel deployment logs
2. Check browser console
3. Check MongoDB Atlas logs
4. Review this guide

---

## Quick Deploy Commands

```bash
# 1. Ensure all changes are committed
git status

# 2. Push to GitHub
git push origin main

# 3. Vercel deploys automatically!
```

That's it! Your Saarthi AI app should now be live on Vercel! 🚀

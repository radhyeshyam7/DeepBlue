# 🚀 Vercel Deployment Checklist

## Pre-Deployment

- [ ] All code committed to Git
- [ ] `.env` files are in `.gitignore` (✅ Already done)
- [ ] `vercel.json` configuration created (✅ Already done)
- [ ] MongoDB Atlas account created
- [ ] MongoDB connection string ready

## Vercel Setup

- [ ] GitHub repository pushed
- [ ] Vercel account created/logged in
- [ ] Project imported to Vercel
- [ ] Root directory set correctly (leave as root for monorepo)

## Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

### Required Variables

- [ ] `MONGODB_URI` - Your MongoDB Atlas connection string
  ```
  mongodb+srv://username:password@cluster.mongodb.net/saarthi_ai
  ```

- [ ] `JWT_SECRET` - Random secret key (generate with: `openssl rand -base64 32`)
  ```
  your_super_secret_jwt_key_here
  ```

- [ ] `NODE_ENV` - Set to `production`
  ```
  production
  ```

- [ ] `VITE_API_URL` - Your Vercel app URL + /api
  ```
  https://your-app.vercel.app/api
  ```

### Optional Variables

- [ ] `REDIS_URL` - Upstash Redis URL (for caching)
  ```
  rediss://default:password@your-redis.upstash.io:6379
  ```

- [ ] `SMS_ENABLED` - Enable SMS alerts
  ```
  false (or true if you have Twilio)
  ```

- [ ] `TWILIO_ACCOUNT_SID` - Twilio account SID (if SMS enabled)
- [ ] `TWILIO_AUTH_TOKEN` - Twilio auth token (if SMS enabled)
- [ ] `TWILIO_PHONE_NUMBER` - Twilio phone number (if SMS enabled)

## MongoDB Atlas Setup

- [ ] Create free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- [ ] Create database user
- [ ] Whitelist all IPs (`0.0.0.0/0`) or Vercel IPs
- [ ] Get connection string
- [ ] Test connection locally first

## Deploy

- [ ] Click "Deploy" in Vercel
- [ ] Wait for build to complete (2-5 minutes)
- [ ] Check deployment logs for errors

## Post-Deployment Testing

- [ ] Visit your Vercel URL
- [ ] Test user registration
- [ ] Test user login
- [ ] Test transaction submission
- [ ] Check risk analysis works
- [ ] Verify MongoDB data is saved
- [ ] Test on mobile device
- [ ] Check browser console for errors

## Troubleshooting

### Build Fails
- Check Vercel build logs
- Verify all dependencies in `package.json`
- Check Node.js version compatibility

### Can't Connect to MongoDB
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas IP whitelist
- Test connection string locally

### Frontend Can't Reach Backend
- Verify `VITE_API_URL` is set correctly
- Check `vercel.json` routes configuration
- Check CORS settings in backend

### 404 Errors
- Check `vercel.json` routes
- Verify build output directory
- Check frontend routing

## Success Criteria

✅ App loads without errors
✅ User can register/login
✅ Transactions can be submitted
✅ Risk analysis returns results
✅ Data persists in MongoDB
✅ No console errors
✅ Mobile responsive

## Next Steps

- [ ] Set up custom domain (optional)
- [ ] Enable Redis for better performance (optional)
- [ ] Set up SMS alerts with Twilio (optional)
- [ ] Monitor with Vercel Analytics
- [ ] Set up error tracking (Sentry, etc.)

---

## Quick Commands

```bash
# Check Git status
git status

# Commit all changes
git add .
git commit -m "Ready for deployment"

# Push to GitHub
git push origin main

# Vercel deploys automatically!
```

---

## Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [Deployment Guide](./VERCEL_DEPLOYMENT_GUIDE.md)

---

**Good luck with your deployment! 🚀**

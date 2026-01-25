# Vercel Deployment Guide for GhostNote

## Quick Start (5 Minutes)

### Step 1: Prepare Your Code
```bash
# Make sure all changes are committed
git add .
git commit -m "Production ready for Vercel deployment"
git push origin main
```

### Step 2: Connect to Vercel
1. Go to [https://vercel.com](https://vercel.com)
2. Sign up with GitHub (or your preferred provider)
3. Click "Import Project"
4. Select your GhostNote repository
5. Click "Import"

### Step 3: Configure Environment Variables
1. In Vercel dashboard, go to your project
2. Click "Settings" → "Environment Variables"
3. Add this variable:
   - **Name**: `VITE_GEMINI_API_KEY`
   - **Value**: Your Gemini API key from https://ai.google.dev/
   - **Environments**: Production, Preview, Development
4. Click "Save"

### Step 4: Deploy
Vercel will automatically build and deploy. Just wait 2-3 minutes!

---

## Detailed Deployment Steps

### Prerequisites
- GitHub account with GhostNote repository
- Vercel account (free)
- Google Gemini API key (https://ai.google.dev/)

### Step-by-Step Instructions

#### 1. Push Code to GitHub
```bash
cd /home/rizdigico/ghostnote-app-final
git status
git add .
git commit -m "Configure for Vercel production deployment"
git push origin main
```

#### 2. Connect Repository to Vercel

**Option A: Via Vercel Dashboard (Easiest)**
1. Visit https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Click "Import Git Repository"
4. Paste your repository URL
5. Click "Import"

**Option B: Via CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to your Vercel account
vercel login

# Deploy the project
vercel --prod
```

#### 3. Configure Project Settings

After importing, Vercel will show you settings:
- **Build Command**: `npm run build` ✓ (pre-filled)
- **Output Directory**: `dist` ✓ (pre-filled)
- **Install Command**: `npm install` ✓ (pre-filled)

Click "Deploy" to continue.

#### 4. Set Environment Variables

**In Vercel Dashboard:**
1. Go to your project
2. Settings → Environment Variables
3. Add variable:
   ```
   Key: VITE_GEMINI_API_KEY
   Value: [Your actual API key from https://ai.google.dev/]
   ```
4. Check all three environments: Production, Preview, Development
5. Click "Save"

**Important**: Vercel will restart the deployment to use the new variables.

#### 5. Monitor Deployment

1. Go to "Deployments" tab
2. Watch the build progress
3. You'll see:
   - Building... (npm install + npm run build)
   - Generating... (creating deployment)
   - Ready! (deployment complete)

---

## Verification Checklist

After deployment completes:

### ✓ URL Access
- [ ] Visit your deployment URL (e.g., `https://ghostnote-app.vercel.app`)
- [ ] Page loads without errors
- [ ] No "Network Error" or "CORS" errors

### ✓ Basic Functionality
- [ ] Landing page displays
- [ ] Can enter email and login
- [ ] Dashboard loads after login
- [ ] Voice presets are available
- [ ] Can type in draft textarea

### ✓ Core Features
- [ ] Select a voice preset
- [ ] Type sample text in draft
- [ ] Click "Rewrite"
- [ ] See rewritten content
- [ ] Copy button works

### ✓ Error Handling
- [ ] No JavaScript errors in console (F12)
- [ ] Error messages display correctly
- [ ] Can logout and login again

### ✓ Performance
- [ ] Page loads in < 3 seconds
- [ ] Network tab shows multiple chunks (code splitting working)
- [ ] No failed requests (all green ✓)

### ✓ Security
- [ ] URL is HTTPS (not HTTP)
- [ ] No API key visible in Network tab
- [ ] No sensitive data in local storage

---

## Common Issues & Solutions

### Issue: "VITE_GEMINI_API_KEY is not defined"
**Cause**: Environment variable not set

**Solution**:
1. Go to Project Settings → Environment Variables
2. Verify variable name is exactly: `VITE_GEMINI_API_KEY`
3. Paste your actual API key (from https://ai.google.dev/)
4. Click "Save"
5. Vercel will auto-redeploy in a few seconds

### Issue: "Service configuration error" when rewriting
**Cause**: API key not properly configured or invalid

**Solution**:
1. Verify API key is correct at https://ai.google.dev/
2. Check API quota hasn't been exceeded
3. Check that variable is set to "Production" environment
4. Redeploy: Go to Deployments → Click latest → Click "Redeploy"

### Issue: Styling looks broken (no dark theme)
**Cause**: Tailwind CSS CDN didn't load

**Solution**:
1. Hard refresh: Ctrl+Shift+Delete (clear cache)
2. Check in DevTools that `https://cdn.tailwindcss.com` loaded
3. If not loaded, check CSP headers
4. Redeploy the project

### Issue: Build fails with "npm ERR!"
**Cause**: Missing dependencies or build error

**Solution**:
1. Verify locally: `npm install && npm run build`
2. Fix any errors shown
3. Commit and push changes
4. Vercel will automatically rebuild

### Issue: Page shows 404
**Cause**: File not deployed correctly

**Solution**:
1. Check Deployments → Files to verify `dist/` was uploaded
2. Verify build completed successfully
3. Redeploy: Go to Deployments → Click latest → "Redeploy"

### Issue: API calls fail with CORS error
**Cause**: Google Gemini API CORS misconfiguration

**Solution**:
1. Check API key is valid
2. Verify CORS is enabled in Google Cloud Console
3. Use latest Google Gemini SDK: `npm update @google/genai`
4. Redeploy

---

## Next Steps After Successful Deployment

### 1. Set Up Monitoring
- Go to Analytics in Vercel dashboard
- Monitor build times and performance
- Set up alerts for failed deployments

### 2. Set Up Error Tracking (Optional)
For better error monitoring in production:

```bash
npm install @sentry/react @sentry/tracing
```

Then add to `index.tsx`:
```typescript
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: "your-sentry-dsn",
    environment: "production",
  });
}
```

### 3. Domain Configuration (Optional)
1. In Vercel Settings → Domains
2. Add your custom domain (e.g., `ghostnote.com`)
3. Update DNS records with Vercel's nameservers
4. Wait for DNS propagation (24-48 hours)

### 4. Automatic Deployments
- Vercel auto-deploys on every git push to main
- Preview deployments for pull requests
- No additional setup needed!

---

## Useful Vercel Commands

```bash
# Deploy to production
vercel --prod

# Deploy as preview
vercel

# See deployment status
vercel status

# View logs
vercel logs

# View environment variables
vercel env ls

# Set environment variable
vercel env add VITE_GEMINI_API_KEY

# Pull environment variables locally
vercel env pull .env.local
```

---

## Vercel Dashboard Navigation

- **Deployments**: View all deployments, redeploy, promote
- **Settings**: General project settings
- **Environment Variables**: Manage secrets and variables
- **Domains**: Connect custom domains
- **Analytics**: Performance metrics and usage
- **Git**: Configure git integration and hooks
- **Functions**: View serverless functions (auto-generated)

---

## Performance Tips

### Caching
The `vercel.json` includes optimal caching:
- HTML: No cache (always fresh)
- Assets: 1 year cache (immutable)

### Build Optimization
Already configured in `vite.config.ts`:
- Code minification
- Code splitting (4 bundles)
- CSS splitting
- Console log removal

### CDN
Vercel automatically serves from their global CDN:
- No additional config needed
- Auto-compressed with Gzip
- Cached at edge locations worldwide

---

## Rollback Procedure

If something goes wrong:

1. **In Vercel Dashboard**:
   - Go to Deployments
   - Find the previous working deployment
   - Click "..." → "Promote to Production"

2. **Or redeploy**:
   ```bash
   vercel --prod
   ```

---

## Success Criteria

You'll know the deployment is successful when:

✅ Vercel shows "Ready" status
✅ Can visit production URL
✅ Can login
✅ Content rewriting works
✅ No JavaScript errors in console
✅ Page load time < 3 seconds
✅ HTTPS enabled automatically

---

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Google Gemini API**: https://ai.google.dev/
- **Vite Guide**: https://vitejs.dev/
- **React Docs**: https://react.dev/

---

## Deployment Checklist

Before hitting deploy:

- [ ] All code committed and pushed
- [ ] No hardcoded secrets in code
- [ ] `.env.local` not in git
- [ ] `vercel.json` configured
- [ ] Build works locally: `npm run build`
- [ ] Environment variables ready:
  - [ ] VITE_GEMINI_API_KEY

During deployment:

- [ ] Monitor Vercel deployment progress
- [ ] Set environment variables in Vercel dashboard
- [ ] Wait for build to complete

After deployment:

- [ ] Test production URL
- [ ] Verify all features work
- [ ] Check browser console for errors
- [ ] Test on mobile
- [ ] Monitor for 24 hours

---

**Deployment Date**: January 25, 2026
**Status**: Ready to Deploy ✅
**Est. Time**: 5-10 minutes
**Est. Downtime**: None (zero-downtime deployment)

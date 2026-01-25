# Production Deployment Pre-Launch Checklist

## Pre-Deployment (Before You Build)

### Code Review
- [ ] Review `vite.config.ts` - build optimization settings
- [ ] Check `tsconfig.json` - strict type checking enabled
- [ ] Verify `package.json` - version 1.0.0
- [ ] Review `App.tsx` - ErrorBoundary wrapped
- [ ] Check `index.tsx` - environment validation present
- [ ] Review `.gitignore` - excludes sensitive files

### Environment Setup
- [ ] Get GEMINI_API_KEY from https://ai.google.dev/
- [ ] Create `.env` file locally (DO NOT COMMIT)
- [ ] Set `GEMINI_API_KEY=your_actual_key` in `.env`
- [ ] Never add `.env` to git (already in .gitignore)

## Build & Test Phase

### Build Verification
- [ ] Run `npm install` successfully
- [ ] Run `npm run type-check` with no errors
- [ ] Run `npm run build` successfully
- [ ] Check `dist/` folder created
- [ ] Verify `dist/assets/` has multiple chunks

### Local Testing
- [ ] Run `npm run preview`
- [ ] Open http://localhost:4173 in browser
- [ ] Landing page loads correctly
- [ ] No JavaScript errors in console
- [ ] Styling is correct (dark theme visible)

### Functional Testing
- [ ] Test email login
- [ ] Verify session persists
- [ ] Test logout functionality
- [ ] Test content rewriting (use valid preset)
- [ ] Verify file upload works (if available)
- [ ] Test error messages display correctly
- [ ] Click through all navigation

### Performance Check
- [ ] Open DevTools Network tab
- [ ] Check bundle size (should be < 500KB)
- [ ] Verify multiple chunks loaded
- [ ] Check no 404 errors
- [ ] Page Load Time < 3 seconds

## Deployment Preparation

### Choose Platform
- [ ] Decision: Vercel / Netlify / AWS Amplify / Cloudflare / Other
- [ ] Create account if needed
- [ ] GitHub repository is public (if using GitHub-based deployment)

### Configure Hosting
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Node version: 18+ recommended
- [ ] Environment variable set: `GEMINI_API_KEY=your_key`

### Pre-Deployment Security
- [ ] No console.logs in production code
- [ ] No hardcoded API keys
- [ ] All secrets in environment variables
- [ ] .env file NOT in git repo
- [ ] .gitignore properly configured

## Deployment Execution

### Deploy
- [ ] Run `npm run build` one final time locally
- [ ] Commit all code changes
- [ ] Push to GitHub/your repository
- [ ] Trigger deployment on hosting platform
- [ ] Monitor deployment logs

### Immediate Post-Deployment
- [ ] Wait for build to complete (3-5 minutes)
- [ ] Visit your production URL
- [ ] Check for any 404 or 500 errors
- [ ] Verify page loads completely
- [ ] Check console for JavaScript errors

## Post-Deployment Verification

### Basic Functionality
- [ ] Landing page displays correctly
- [ ] Login form appears
- [ ] Test email login works
- [ ] Dashboard loads after login
- [ ] Can select voice presets
- [ ] Content rewriting works
- [ ] File upload works (if enabled)
- [ ] Logout works
- [ ] Can log back in

### Visual & UX
- [ ] Dark theme applies correctly
- [ ] All fonts load (Inter, JetBrains Mono)
- [ ] Icons render properly (lucide-react)
- [ ] Buttons are clickable
- [ ] Forms are responsive
- [ ] Mobile view works (test with DevTools)

### Performance & Errors
- [ ] Page load time is reasonable
- [ ] No console errors or warnings
- [ ] No 404 errors in Network tab
- [ ] API calls succeed
- [ ] Error boundary works (test in console)

### Security Check
- [ ] URL uses HTTPS
- [ ] API calls use HTTPS only
- [ ] No API key visible in Network tab
- [ ] No sensitive data in local storage
- [ ] Content-Security-Policy header present

## Ongoing Monitoring (First 24 Hours)

- [ ] Monitor error logs hourly
- [ ] Check API quota usage
- [ ] Test all main features multiple times
- [ ] Have rollback plan ready
- [ ] Monitor uptime (set up monitoring tool)

## Ongoing Maintenance (Weekly)

- [ ] Check error tracking (set up Sentry/LogRocket)
- [ ] Review performance metrics
- [ ] Test critical user flows
- [ ] Check for any security alerts
- [ ] Monitor API usage

## Ongoing Maintenance (Monthly)

- [ ] Run `npm audit` for security updates
- [ ] Review dependency updates
- [ ] Update dependencies if needed
- [ ] Run full test suite
- [ ] Performance review

## Emergency Procedures

### If Something Goes Wrong After Deploy

1. **Immediate (First 5 minutes)**
   - [ ] Check error logs
   - [ ] Check API quota
   - [ ] Verify environment variables

2. **Quick Fix (5-15 minutes)**
   - [ ] Redeploy previous working version
   - [ ] Verify it works
   - [ ] Notify users if needed

3. **Investigation (15-60 minutes)**
   - [ ] Review what changed
   - [ ] Check error tracking service
   - [ ] Reproduce issue locally
   - [ ] Fix and test thoroughly

4. **Redeployment**
   - [ ] Fix code locally
   - [ ] Test with `npm run build && npm run preview`
   - [ ] Commit and push
   - [ ] Redeploy

## Success Indicators ✓

Your deployment is successful when you can:

✅ Visit your production URL without errors
✅ Login with a test email
✅ Use the content rewriter
✅ See proper error messages when things fail
✅ No JavaScript errors in console
✅ Page loads in under 3 seconds
✅ All links and buttons work
✅ Logout and login again works

## Troubleshooting Guide

**Issue: "GEMINI_API_KEY not found"**
→ Check environment variable is set on hosting platform
→ Verify exact name: `GEMINI_API_KEY`
→ Redeploy after setting variable

**Issue: "Content rewriting returns error"**
→ Check API key is valid at https://ai.google.dev/
→ Verify API quota hasn't been exceeded
→ Check request size (max 50KB draft, 20KB reference)

**Issue: Styling is broken**
→ Clear browser cache (Ctrl+Shift+Delete)
→ Check Tailwind CDN loaded from head
→ Verify index.html was deployed

**Issue: Login not working**
→ Check localStorage isn't disabled
→ Open DevTools Console to see actual error
→ Test in incognito mode (clear cookies)

---

## Deployment Sign-Off

- **Date**: _______________
- **Deployed By**: _______________
- **Deployment URL**: _______________
- **All tests passed**: [ ] Yes [ ] No
- **Known issues**: _______________
- **Rollback plan**: _______________

---

**Remember**: When in doubt, redeploy! It only takes a few minutes.

Good luck with your deployment! 🚀

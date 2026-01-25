# GhostNote - Deployment Guide

## Overview
GhostNote is now configured and ready for production deployment. This guide covers all necessary steps to deploy to production.

## Quick Start Checklist

```bash
# 1. Install dependencies
npm install

# 2. Run type checking
npm run type-check

# 3. Build for production
npm run build

# 4. Test the build locally
npm run preview

# 5. Deploy the dist/ folder to your hosting platform
```

## Environment Setup

### Required Environment Variables

Create a `.env` file in the root directory (never commit this):

```bash
GEMINI_API_KEY=your_google_gemini_api_key_here
```

Get your API key from: https://ai.google.dev/

### On Your Hosting Platform

Set the following environment variable in your deployment settings:
- `GEMINI_API_KEY`: Your Google Gemini API key

## Production Deployment Platforms

### Vercel (Recommended - Easiest)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard:
   - `GEMINI_API_KEY`: Your API key
4. Deploy with a single click

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from command line
vercel
```

### Netlify

1. Push your code to GitHub
2. Connect your repository in Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Set environment variables in Netlify settings
6. Deploy automatically on push

### AWS Amplify

1. Connect your GitHub repository
2. Configure build settings:
   - Build command: `npm run build`
   - Artifact directory: `dist`
3. Set environment variables
4. Deploy

### Cloudflare Pages

1. Connect your GitHub repository
2. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Set environment variables
4. Deploy with global CDN

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Post-Deployment Verification

After deploying, verify these critical functions:

1. **Landing Page Loads** ✓
   - Navigate to your domain
   - Check for no console errors (F12)
   - Verify styling is correct

2. **Authentication Flow** ✓
   - Test login with an email
   - Verify user session persists
   - Test logout functionality

3. **Content Rewriting** ✓
   - Select a voice preset
   - Enter sample text
   - Verify API calls to Gemini work
   - Check response appears correctly

4. **File Uploads** ✓
   - Test PDF upload (if tier supports it)
   - Verify file validation works

5. **Error Handling** ✓
   - Test with invalid API key (set GEMINI_API_KEY to "invalid")
   - Check error messages display gracefully
   - Verify error boundary catches crashes

6. **Performance** ✓
   - Check Network tab in DevTools
   - Verify bundle size (target: < 500KB gzipped)
   - Check for slow API calls

## Performance Optimization

### Bundle Analysis

```bash
# Check bundle size
npm run build

# Look at dist/assets/ for file sizes
ls -lah dist/assets/
```

Current optimizations:
- ✅ Code splitting (vendor, lucide, gemini, pdf)
- ✅ CSS splitting
- ✅ Minification and compression
- ✅ Console logs removed in production
- ✅ Source maps disabled

### Further Optimization (Optional)

1. **Enable Gzip on Your Host**
   - Most platforms do this automatically
   - Reduces transfer size by 60-70%

2. **Configure Cache Headers**
   ```
   # Static assets (1 year)
   /assets/* -> Cache-Control: public, max-age=31536000, immutable
   
   # HTML (no cache, always fresh)
   /*.html -> Cache-Control: public, max-age=0, must-revalidate
   ```

3. **Use a CDN**
   - Cloudflare (free)
   - CloudFront (AWS)
   - Bunny CDN (affordable)

## Monitoring & Maintenance

### Set Up Error Tracking

Install Sentry for production error monitoring:

```bash
npm install @sentry/react @sentry/tracing
```

Then in `index.tsx`:

```typescript
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: "your-sentry-dsn",
    environment: "production",
    tracesSampleRate: 0.1,
  });
}
```

### Monitor Key Metrics

- **API Usage**: Check Gemini API quota
- **Error Rate**: Monitor 5xx errors
- **Performance**: Track page load times
- **User Flow**: Monitor login success rate

### Regular Maintenance

- [ ] Check for dependency updates monthly: `npm audit`
- [ ] Update dependencies: `npm update`
- [ ] Review logs for errors
- [ ] Check API quota usage
- [ ] Monitor error tracking dashboard
- [ ] Test critical user flows weekly

## Troubleshooting

### Issue: "GEMINI_API_KEY is not configured"

**Solution**: 
1. Verify environment variable is set on your platform
2. Check the variable name is exactly `GEMINI_API_KEY`
3. Redeploy after setting the variable

### Issue: Content rewriting returns error

**Solution**:
1. Verify API key is valid: https://ai.google.dev/
2. Check API quota hasn't been exceeded
3. Verify request is under size limits (50KB draft, 20KB reference)
4. Check browser console for detailed error message

### Issue: Styling looks broken

**Solution**:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Check that Tailwind CSS loads from CDN
3. Verify no CORS issues in console
4. Check that index.html was deployed

### Issue: High bundle size

**Solution**:
1. Check code splitting is working: `npm run build`
2. Look for duplicate dependencies: `npm ls`
3. Remove unused packages: `npm prune`
4. Consider lazy loading large components

## Rollback Procedure

If something goes wrong in production:

1. **Immediate**: Revert to previous deployment
2. **Investigation**: Check error logs
3. **Fix**: Make code changes locally
4. **Test**: Run `npm run build && npm run preview`
5. **Redeploy**: Push to your platform

## Security Checklist for Production

- [ ] HTTPS is enforced (check with https://www.whynopadlock.com/)
- [ ] Environment variables are set securely
- [ ] No .env file is committed to git
- [ ] .gitignore includes sensitive files
- [ ] Error messages don't expose internal details
- [ ] API key isn't visible in network requests (check DevTools)
- [ ] CSP headers are configured
- [ ] Error tracking is set up

## Getting Help

- **Google Gemini Issues**: https://ai.google.dev/
- **Vite Questions**: https://vitejs.dev/guide/
- **React Documentation**: https://react.dev/
- **TypeScript Help**: https://www.typescriptlang.org/

## Success Criteria

You'll know your deployment is successful when:

✅ Domain loads without errors
✅ All pages render correctly
✅ Login/logout works
✅ Content rewriting works with Gemini API
✅ File uploads work (if enabled)
✅ No JavaScript errors in console
✅ Error boundary catches crashes gracefully
✅ Performance is acceptable (< 3s load time)

---

**Version**: 1.0.0
**Last Updated**: January 25, 2026
**Status**: Production Ready ✅

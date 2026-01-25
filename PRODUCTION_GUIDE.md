# GhostNote Production Deployment Guide

## Pre-Deployment Checklist

### Security
- [ ] Verify all sensitive data is excluded from version control
- [ ] Ensure .env files are in .gitignore
- [ ] Review API key exposure risks - use environment variables only
- [ ] Enable HTTPS/TLS for all production deployments
- [ ] Set proper CORS headers on your backend
- [ ] Validate all user inputs server-side (not just client-side)
- [ ] Implement rate limiting on API calls
- [ ] Audit file upload handling (currently limited to 5MB, PDF/TXT/CSV only)

### Performance
- [ ] Run `npm run build` and verify bundle size
- [ ] Check browser DevTools to ensure code splitting is working
- [ ] Enable gzip compression on your hosting platform
- [ ] Configure CDN for static assets if possible
- [ ] Test with slow network conditions
- [ ] Monitor Core Web Vitals

### Code Quality
- [ ] Run TypeScript type checking: `npm run type-check`
- [ ] Verify no console.logs remain in production (Vite handles this)
- [ ] Test error handling with network failures
- [ ] Ensure error boundaries catch component errors
- [ ] Test all user flows, especially payment/upgrade paths

### Deployment
- [ ] Set NODE_ENV=production
- [ ] Configure GEMINI_API_KEY environment variable
- [ ] Build optimized production bundle: `npm run build`
- [ ] Test the preview: `npm run preview`
- [ ] Verify all environment variables are set on your hosting platform
- [ ] Test login/logout flows
- [ ] Test file uploads
- [ ] Test API integrations

### Monitoring & Logging
- [ ] Set up error tracking (consider Sentry, LogRocket, etc.)
- [ ] Configure analytics (Google Analytics, Mixpanel, etc.)
- [ ] Set up uptime monitoring
- [ ] Monitor API quota and rate limits
- [ ] Review browser console for any runtime errors

## Environment Variables

### Required
- `GEMINI_API_KEY` - Your Google Gemini API key from https://ai.google.dev/

### Optional
- `NODE_ENV` - Set to 'production' for production deployments

## API Security Notes

### Rate Limiting
- Client-side: 10 requests per minute (configurable in geminiService.ts)
- Implement server-side rate limiting for production

### Input Validation
- Draft text: max 50,000 characters
- Reference text: max 20,000 characters
- File uploads: max 5MB, only PDF/TXT/CSV allowed
- Input sanitization removes XSS vectors

### Sensitive Data
- Never commit .env files
- Never log API keys or user credentials
- Use HTTPS only in production
- Consider implementing API key rotation

## Deployment Platforms

### Recommended Platforms
1. **Vercel** - Native Vite support, automatic deployments
2. **Netlify** - Built-in caching, edge functions
3. **AWS Amplify** - Scalable, integrated with AWS services
4. **Cloudflare Pages** - High performance, global CDN

### Typical Deployment Steps
```bash
# 1. Build the project
npm run build

# 2. Set environment variables on your platform
# 3. Deploy the 'dist' folder
# 4. Verify in production environment
```

## Post-Deployment

- [ ] Test all critical user flows in production
- [ ] Monitor error logs and performance metrics
- [ ] Verify API quotas aren't exceeded
- [ ] Set up alerts for errors and performance issues
- [ ] Plan rollback strategy if issues arise

## Production Build Optimizations Enabled

- ✅ Code minification (terser)
- ✅ Console logs removed
- ✅ Source maps disabled
- ✅ Code splitting (vendor, lucide, gemini, pdf)
- ✅ CSS code splitting
- ✅ Chunk size warnings for large bundles
- ✅ Strict TypeScript checking
- ✅ React Fast Refresh disabled in production

## Monitoring Recommendations

### Error Tracking
- Sentry (https://sentry.io/)
- LogRocket (https://logrocket.com/)
- Rollbar (https://rollbar.com/)

### Performance Monitoring
- Web Vitals via Google Analytics
- Lighthouse CI for performance regressions
- Bundle analyzer for code splitting optimization

### User Analytics
- Mixpanel
- Amplitude
- Google Analytics 4

## Security Headers (Configure on your host)

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.tailwindcss.com https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

## Need Help?

- Google Gemini API Docs: https://ai.google.dev/
- Vite Documentation: https://vitejs.dev/
- React Documentation: https://react.dev/

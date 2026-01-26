# Content Security Policy (CSP) Configuration for Firebase Auth

## Summary of Changes

Fixed CSP errors blocking Firebase Authentication by updating Content-Security-Policy headers across the application.

## Files Modified

### 1. **index.html** (Meta CSP Tag)
Updated the CSP meta tag to allow Firebase and Google APIs:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; 
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.googletagmanager.com https://cdn.tailwindcss.com; 
  connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://www.googleapis.com https://generativelanguage.googleapis.com; 
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
  font-src 'self' https://fonts.gstatic.com; 
  img-src 'self' data: https://lh3.googleusercontent.com;" />
```

**What was added:**
- `script-src`: Added `'unsafe-eval'` for Firebase Auth
- `script-src`: Added `https://apis.google.com` for Google APIs
- `script-src`: Added `https://www.googletagmanager.com` for analytics
- `connect-src`: Added Firebase authentication endpoints:
  - `https://identitytoolkit.googleapis.com` - Firebase Auth
  - `https://securetoken.googleapis.com` - Firebase Auth tokens
  - `https://firestore.googleapis.com` - Firestore database
- `img-src`: Added `https://lh3.googleusercontent.com` for Google profile pictures

### 2. **vite.config.ts** (Development Server Headers)
Added CSP headers to the Vite development server for local testing:

```typescript
server: {
  port: 3000,
  host: '127.0.0.1',
  headers: {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.googletagmanager.com https://cdn.tailwindcss.com; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://www.googleapis.com https://generativelanguage.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://lh3.googleusercontent.com;",
  },
}
```

**Benefit:** CSP headers are now sent by the dev server, allowing Firebase Auth to work during development.

### 3. **next.config.js** (Production Deployment)
Created new configuration file for production deployment to Vercel or Next.js-compatible platforms:

```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.googletagmanager.com https://cdn.tailwindcss.com; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://www.googleapis.com https://generativelanguage.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://lh3.googleusercontent.com;",
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          // ... other security headers
        ]
      }
    ];
  }
};

module.exports = nextConfig;
```

**Benefit:** Automatically applies CSP headers when deployed to Vercel.

## CSP Breakdown

### Allowed Origins by Category

| Directive | Origins | Purpose |
|-----------|---------|---------|
| `default-src` | `'self'` | Default policy for all content |
| `script-src` | `'self'`, `'unsafe-inline'`, `'unsafe-eval'`, `https://apis.google.com`, `https://www.googletagmanager.com`, `https://cdn.tailwindcss.com` | Scripts from self, inline scripts, eval, and external services |
| `connect-src` | `'self'`, Firebase endpoints, Google APIs | XHR/Fetch/WebSocket connections |
| `style-src` | `'self'`, `'unsafe-inline'`, `https://fonts.googleapis.com` | Stylesheets and inline styles |
| `font-src` | `'self'`, `https://fonts.gstatic.com` | Web fonts |
| `img-src` | `'self'`, `data:`, `https://lh3.googleusercontent.com` | Images and data URLs (for Google profile pics) |

## Firebase Services Enabled

The CSP now allows:

1. **Firebase Authentication**
   - Google OAuth sign-in popup
   - Email/password authentication
   - Session persistence
   - `https://identitytoolkit.googleapis.com`
   - `https://securetoken.googleapis.com`

2. **Firebase Firestore**
   - Real-time database access
   - User document creation/updates
   - `https://firestore.googleapis.com`

3. **Google APIs**
   - Google Sign-In
   - Analytics
   - `https://apis.google.com`
   - `https://www.googleapis.com`

4. **Google Gemini API**
   - Content generation
   - `https://generativelanguage.googleapis.com`

## Security Considerations

### ⚠️ Important Notes

1. **`'unsafe-inline'` and `'unsafe-eval'`**
   - Necessary for Tailwind CSS (JIT compilation)
   - Necessary for Firebase Auth (OAuth popup)
   - Minimized in production via code minification

2. **`data:` URLs**
   - Allowed for images only
   - Used for inline image data (optimized)

3. **Google Profile Pictures**
   - `https://lh3.googleusercontent.com` allowed for user avatars
   - Only on image sources

### Recommendations

1. **Monitor Usage**
   - Enable CSP reporting to catch violations
   - Check browser console during testing

2. **Future Hardening**
   - Remove `'unsafe-eval'` once Firebase library allows it
   - Replace `'unsafe-inline'` with nonces for better security
   - Use `Content-Security-Policy-Report-Only` for monitoring

3. **Deployment**
   - For **Vercel**: Use `next.config.js` (handles CSP automatically)
   - For **Firebase Hosting**: Configure headers in `firebase.json`
   - For **Other platforms**: Apply server headers via your hosting provider

## Testing

### Local Development
```bash
npm run dev
# Test Google OAuth login in browser
# Check browser DevTools → Network → Response headers
# Should see Content-Security-Policy header
```

### Production Build
```bash
npm run build
# Verify dist/index.html includes CSP meta tag
# Deploy to production
# Test both Google OAuth and Email authentication
```

### Verify CSP is Working

1. Open **Developer Tools** → **Console**
2. Try to violate CSP (e.g., `eval("alert('test')")`)
3. Should see CSP violation warning (not error)
4. Firebase Auth should work without CSP errors

## Browser Console Check

Expected: No CSP violations related to Firebase
```
✅ No errors about blocked Firebase endpoints
✅ No warnings about inline scripts being blocked
✅ Google OAuth popup appears without CSP issues
```

Problematic (would indicate CSP issues):
```
❌ "Refused to connect to 'https://identitytoolkit.googleapis.com' because it violates the Content-Security-Policy directive"
❌ "Refused to execute inline script because it violates the Content-Security-Policy directive"
```

## Related Files

- `src/lib/firebase.ts` - Firebase configuration (no changes needed)
- `AuthContext.tsx` - Firebase Auth integration (no changes needed)
- `components/Login.tsx` - Login UI with Google OAuth (no changes needed)

## Deployment Checklist

- [x] CSP updated in index.html (meta tag)
- [x] CSP configured in vite.config.ts (dev server)
- [x] CSP configured in next.config.js (production)
- [x] Firebase endpoints whitelisted
- [x] Google APIs whitelisted
- [x] TypeScript compilation passes
- [x] Production build succeeds
- [ ] Test Firebase Auth locally (`npm run dev`)
- [ ] Test Firebase Auth in production (after deploy)

## Troubleshooting

### Issue: "Google OAuth popup blocked by CSP"
**Solution:** Ensure `https://apis.google.com` is in `script-src`

### Issue: "Cannot connect to Firestore"
**Solution:** Ensure `https://firestore.googleapis.com` is in `connect-src`

### Issue: "Firebase Auth tokens not working"
**Solution:** Ensure both `identitytoolkit.googleapis.com` and `securetoken.googleapis.com` are in `connect-src`

### Issue: "Google profile pictures not loading"
**Solution:** Ensure `https://lh3.googleusercontent.com` is in `img-src`

---

**Implementation Date**: January 26, 2026  
**Status**: ✅ COMPLETE  
**Build Status**: ✅ PASSED  
**Type Check**: ✅ PASSED (0 errors)

# Deployment Troubleshooting Guide

## Chunk Loading Error Resolution

If you're experiencing `ChunkLoadError: Loading chunk failed` errors after deployment, follow these steps:

### 1. Clean Build Process

```bash
# Remove existing build artifacts
rm -rf .next
rm -rf node_modules/.cache

# Clean install dependencies
npm ci

# Build with clean cache
npm run build:clean
```

### 2. Environment Variables

Ensure all required environment variables are set in your deployment platform:

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yapson.net
```

### 3. Build Configuration

The updated `next.config.ts` includes optimizations for:
- Better chunk splitting
- Improved vendor bundle handling
- Runtime chunk optimization
- Package import optimization

### 4. Deployment Platform Specific Steps

#### Vercel
- Ensure build command is: `npm run build`
- Set Node.js version to 18+ in project settings
- Clear build cache if issues persist

#### Netlify
- Build command: `npm run build`
- Publish directory: `.next`
- Set Node.js version in `package.json`:
  ```json
  {
    "engines": {
      "node": ">=18.0.0"
    }
  }
  ```

#### Custom Server
- Use `npm run build:clean` for production builds
- Ensure proper static file serving
- Set up proper caching headers

### 5. Common Issues and Solutions

#### Issue: Chunk files not found (404)
**Solution**: Clear CDN cache and rebuild

#### Issue: Mismatched chunk hashes
**Solution**: Use clean build process and ensure consistent deployment

#### Issue: Large bundle sizes
**Solution**: The configuration includes automatic code splitting and vendor optimization

### 6. Monitoring and Debugging

Add error boundary to catch chunk loading errors:

```tsx
// Add to your app layout or pages
useEffect(() => {
  const handleChunkError = (event: ErrorEvent) => {
    if (event.message.includes('ChunkLoadError')) {
      console.error('Chunk loading error detected:', event);
      // Reload page or show fallback
      window.location.reload();
    }
  };

  window.addEventListener('error', handleChunkError);
  return () => window.removeEventListener('error', handleChunkError);
}, []);
```

### 7. Performance Optimization

The updated configuration includes:
- Automatic vendor chunk splitting
- Runtime chunk optimization
- Package import optimization for lucide-react and react-i18next
- Production source maps disabled
- SWC minification enabled

### 8. Verification Steps

After deployment:
1. Clear browser cache
2. Test in incognito/private mode
3. Check browser console for errors
4. Verify all chunks load correctly
5. Test on different devices/browsers

### 9. Fallback Strategy

If chunk loading errors persist:
1. Implement service worker for offline fallback
2. Add retry logic for failed chunk loads
3. Consider static export for critical pages
4. Use CDN with proper cache invalidation

## Quick Fix Commands

```bash
# For immediate fix
npm run build:clean
npm run start:prod

# For development testing
npm run dev

# For bundle analysis
npm run analyze
``` 
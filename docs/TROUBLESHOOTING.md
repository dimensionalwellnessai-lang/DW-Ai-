# Troubleshooting Guide

Common issues and solutions for DW.ai development.

## Build Issues

### "tsx: not found" Error

**Problem**: Getting `tsx: not found` when running npm scripts.

**Solution**:
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Vite Build Fails

**Problem**: Build fails with module resolution errors.

**Solution**:
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run build
```

### TypeScript Errors

**Problem**: Type checking fails with `npm run check`.

**Solution**:
1. Check the specific error messages
2. Ensure all dependencies are installed
3. Clear TypeScript cache:
   ```bash
   rm -rf node_modules/.cache
   npm run check
   ```

## Database Issues

### Cannot Connect to Database

**Problem**: `ECONNREFUSED` or database connection errors.

**Solution**:
1. Verify PostgreSQL is running:
   ```bash
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Check `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/dwai
   ```

3. Test connection:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

### Schema Push Fails

**Problem**: `npm run db:push` fails with schema errors.

**Solution**:
1. Check for conflicting migrations
2. Drop and recreate the database (⚠️ loses all data):
   ```bash
   psql -c "DROP DATABASE dwai"
   psql -c "CREATE DATABASE dwai"
   npm run db:push
   ```

## iOS Issues

### Xcode Not Found

**Problem**: Capacitor says Xcode is not installed.

**Solution**:
1. Install Xcode from Mac App Store
2. Open Xcode and accept license agreements
3. Install command line tools:
   ```bash
   xcode-select --install
   ```
4. Set active developer directory:
   ```bash
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   ```

### CocoaPods Install Fails

**Problem**: Pod install errors when syncing iOS.

**Solution**:
```bash
cd ios/App
pod repo update
pod install
cd ../..
```

### iOS Simulator Won't Start

**Problem**: Simulator doesn't launch when running `npm run ios`.

**Solution**:
1. Open Simulator manually:
   ```bash
   open -a Simulator
   ```
2. Check available simulators:
   ```bash
   xcrun simctl list devices
   ```
3. Reset simulator:
   - Open Simulator
   - Device > Erase All Content and Settings

### Build Failed in Xcode

**Problem**: App builds on web but fails in Xcode.

**Solution**:
1. Clean build folder: Product > Clean Build Folder (Cmd+Shift+K)
2. Delete derived data:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```
3. Re-sync:
   ```bash
   npm run sync:ios
   ```

## Android Issues

### Android Studio Not Found

**Problem**: Capacitor can't find Android Studio.

**Solution**:
1. Install Android Studio
2. Set environment variables in `~/.bashrc` or `~/.zshrc`:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
3. Reload shell:
   ```bash
   source ~/.bashrc  # or source ~/.zshrc
   ```

### Gradle Build Fails

**Problem**: Gradle sync or build errors.

**Solution**:
1. Clean Gradle cache:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```
2. Update Gradle wrapper:
   ```bash
   cd android
   ./gradlew wrapper --gradle-version=8.0
   cd ..
   ```

### Android Emulator Won't Start

**Problem**: Emulator doesn't launch.

**Solution**:
1. Open Android Studio
2. Tools > AVD Manager
3. Create a new Virtual Device if none exist
4. Start emulator from AVD Manager
5. Once running, try `npm run android` again

### App Crashes on Android

**Problem**: App opens then immediately crashes.

**Solution**:
1. Check logcat:
   ```bash
   adb logcat | grep -E "AndroidRuntime|DW-Ai"
   ```
2. Common fixes:
   - Clear app data on emulator
   - Re-sync: `npm run sync:android`
   - Rebuild: `cd android && ./gradlew clean build`

## Development Server Issues

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::5000`

**Solution**:
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=5001 npm run dev
```

### Hot Reload Not Working

**Problem**: Changes don't appear without manual refresh.

**Solution**:
1. Hard refresh browser: `Cmd+Shift+R` or `Ctrl+Shift+R`
2. Clear browser cache
3. Restart dev server:
   ```bash
   # Kill server
   pkill -f "tsx server"
   
   # Restart
   npm run dev
   ```

### WebSocket Connection Failed

**Problem**: Live reload WebSocket connection fails.

**Solution**:
1. Check firewall settings
2. Try localhost instead of 0.0.0.0
3. Restart dev server

## Mobile App Issues

### Changes Not Showing Up

**Problem**: Code changes don't appear in mobile app.

**Solution**:
1. Rebuild web app:
   ```bash
   npm run build
   ```
2. Re-sync to mobile:
   ```bash
   npm run sync:ios      # or
   npm run sync:android
   ```
3. Clean build in Xcode/Android Studio
4. Reinstall app on device/simulator

### Deep Links Not Working

**Problem**: Phone assistant deep links don't open the app.

**Solution**:
1. Check `capacitor.config.ts` has correct `appId`
2. iOS: Update URL schemes in `Info.plist`
3. Android: Update intent filters in `AndroidManifest.xml`
4. Rebuild and reinstall app

## State Management Issues

### Zustand Persist Not Working

**Problem**: State doesn't persist across page reloads.

**Solution**:
1. Check localStorage in browser DevTools
2. Clear localStorage if corrupted:
   ```javascript
   // In browser console
   localStorage.clear()
   ```
3. Check store configuration has `persist` middleware

### React Query Cache Issues

**Problem**: Stale data or cache not updating.

**Solution**:
1. Invalidate queries manually:
   ```typescript
   import { useQueryClient } from '@tanstack/react-query';
   
   const queryClient = useQueryClient();
   queryClient.invalidateQueries({ queryKey: ['key'] });
   ```
2. Clear all cache:
   ```typescript
   queryClient.clear();
   ```
3. Check DevTools (React Query tab)

## Test Issues

### Tests Failing

**Problem**: Tests fail with module resolution errors.

**Solution**:
1. Check test setup file exists: `client/src/test/setup.ts`
2. Verify vitest config in `vite.config.ts`
3. Install test dependencies:
   ```bash
   npm install -D @testing-library/react @testing-library/jest-dom jsdom
   ```

### "jsdom not found" Error

**Problem**: Vitest can't find jsdom environment.

**Solution**:
```bash
npm install -D jsdom
```

## Performance Issues

### App Slow to Load

**Problem**: Initial page load takes too long.

**Solution**:
1. Check bundle size:
   ```bash
   npm run build
   # Look for warnings about large chunks
   ```
2. Implement code splitting:
   ```typescript
   const Page = lazy(() => import('./pages/Page'));
   ```
3. Optimize images (use WebP)
4. Check network tab in DevTools

### Memory Leaks

**Problem**: Memory usage increases over time.

**Solution**:
1. Check for uncleaned event listeners
2. Use React DevTools Profiler
3. Cleanup useEffect hooks:
   ```typescript
   useEffect(() => {
     const handler = () => {};
     window.addEventListener('event', handler);
     return () => window.removeEventListener('event', handler);
   }, []);
   ```

## Deployment Issues

### Environment Variables Not Working

**Problem**: App can't access environment variables in production.

**Solution**:
1. Ensure variables are set in deployment platform
2. Restart app/service after changing variables
3. Check variable names (no typos)

### Mobile App Rejected by App Store

**Problem**: Apple/Google rejects app submission.

**Solution**:
1. Check rejection reason in App Store Connect / Play Console
2. Common issues:
   - Missing privacy policy
   - Missing required permissions descriptions
   - Crash on launch
   - Broken features
3. See [DEPLOYMENT.md](./DEPLOYMENT.md) for app store guidelines

## Getting Help

If you're still stuck:

1. **Check Existing Issues** - Search [GitHub Issues](https://github.com/dimensionalwellnessai-lang/DW-Ai-/issues)
2. **Check Documentation** - Read [SETUP.md](./SETUP.md) and [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Check Logs** - Look at browser console, server logs, and Xcode/Android Studio logs
4. **Create New Issue** - If problem persists, open a new GitHub issue with:
   - Error message
   - Steps to reproduce
   - Environment (OS, Node version, etc.)
   - Logs/screenshots

## Quick Fixes Summary

```bash
# Nuclear option - fresh install
rm -rf node_modules package-lock.json
npm install

# Clear all caches
rm -rf node_modules/.vite node_modules/.cache dist

# Rebuild everything
npm run build

# Reset database (⚠️ loses data)
npm run db:push

# Re-sync mobile
npm run sync:ios
npm run sync:android
```

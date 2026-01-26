# Troubleshooting: Changes Not Showing Up

If you've made changes to the code but don't see them reflected in the Mac simulator or Replit web app, follow these steps:

## Quick Fixes (Try These First)

### 1. Hard Refresh Browser
- **Chrome/Edge**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Safari**: `Cmd+Option+R`

### 2. Clear Browser Cache
- Open Developer Tools (`F12` or `Cmd+Option+I`)
- Right-click the refresh button
- Select "Empty Cache and Hard Reload"

### 3. Restart Development Server
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## For Replit Specifically

### Option A: Quick Restart
1. Click "Stop" button in Replit
2. Click "Run" button again
3. Wait for server to fully start
4. Hard refresh browser

### Option B: Full Clean Build
```bash
# In Replit shell:
./script/fresh-build.sh
npm run dev
```

### Option C: Nuclear Option (Complete Reset)
```bash
# Stop the server first
rm -rf node_modules dist
npm install
npm run build
npm run dev
```

## For Mac Simulator (iOS)

### Option A: Clean and Rebuild
```bash
# 1. Stop simulator
# 2. Clean Capacitor sync
npm run sync:ios

# 3. In Xcode:
# Product > Clean Build Folder (Cmd+Shift+K)
# Product > Build (Cmd+B)
# Product > Run (Cmd+R)
```

### Option B: Clear Derived Data
```bash
# Stop Xcode and simulator first
rm -rf ~/Library/Developer/Xcode/DerivedData/*
npm run sync:ios
# Open and run from Xcode
```

### Option C: Complete Reset
```bash
# 1. Remove iOS build
rm -rf ios/App/build

# 2. Rebuild web assets
npm run build

# 3. Sync to iOS
npm run sync:ios

# 4. Open in Xcode and run
open ios/App/App.xcworkspace
```

## For Android Simulator

### Quick Fix
```bash
cd android
./gradlew clean
cd ..
npm run sync:android
cd android
./gradlew assembleDebug
```

## Verify Changes Are in Code

Before troubleshooting deployment, verify changes are actually in the codebase:

```bash
# Search for specific text you expect to see:
grep -r "Your text here" client/src/

# Check a specific file:
cat client/src/pages/welcome.tsx | grep "Meet DW"

# View recent changes:
git log --oneline -10
git diff HEAD~1 HEAD
```

## Common Issues and Solutions

### Issue 1: "Old version still showing"
**Cause**: Browser/app cache
**Solution**: Hard refresh + clear cache (see Quick Fixes above)

### Issue 2: "Changes in code but not in app"
**Cause**: Build not completed or server not restarted
**Solution**: 
```bash
npm run build
# Then restart dev server
```

### Issue 3: "Different content on web vs. simulator"
**Cause**: Web and native use different builds
**Solution**: 
```bash
# Rebuild everything:
npm run build
npm run sync:ios  # or sync:android
```

### Issue 4: "Environment variables not loading"
**Cause**: Missing or incorrect .env file
**Solution**:
```bash
# Check .env file exists:
ls -la .env

# If missing, copy from example:
cp .env.example .env
# Then edit .env with your values
```

## Debugging Tools

### Check Build Output
```bash
npm run build 2>&1 | tee build.log
# Check build.log for errors
```

### Check Running Processes
```bash
# See what's running:
lsof -i :5000  # Backend
lsof -i :5173  # Vite dev server
```

### View Console Errors
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for red error messages
4. Check Network tab for failed requests

## Still Not Working?

If you've tried everything above and changes still aren't showing:

1. **Verify Git Branch**
   ```bash
   git branch  # Make sure you're on the right branch
   git status  # Check for uncommitted changes
   ```

2. **Check File Timestamps**
   ```bash
   ls -lt client/src/pages/welcome.tsx
   # Verify the file was actually modified recently
   ```

3. **Test in Incognito/Private Window**
   - This eliminates all cache issues
   - If it works here, it's definitely a cache problem

4. **Check Package Version**
   ```bash
   npm list react vite
   # Ensure you have compatible versions
   ```

## Prevention Tips

- **Always run `npm run build` after making changes** (for production)
- **Use `npm run dev` for development** (hot reload works)
- **Commit changes frequently** to track what's working
- **Test in multiple environments** (browser, simulator, device)
- **Clear cache regularly** when developing

## Need More Help?

If none of these solutions work, provide:
- What you changed (file names, specific text)
- What you expect to see
- What you actually see
- Environment (Replit web, Mac simulator, Android, etc.)
- Any error messages from console or logs

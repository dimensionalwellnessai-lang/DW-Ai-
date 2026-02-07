# Local Development Setup

## Prerequisites

- **Node.js** 22 or higher ([Download](https://nodejs.org/))
- **PostgreSQL** database (local or cloud)
- **Xcode** (for iOS development, macOS only)
- **Android Studio** (for Android development)

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/dimensionalwellnessai-lang/DW-Ai-.git
cd DW-Ai-
```

### 2. Install Dependencies

```bash
npm install
```

This will install all dependencies for both the web app and mobile platforms.

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Configure the following required environment variables in `.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dwai

# Session
SESSION_SECRET=your-random-session-secret-here

# AI Integration (OpenAI-compatible API)
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
AI_INTEGRATIONS_OPENAI_API_KEY=your-openai-api-key

# Email (for password reset)
RESEND_API_KEY=your-resend-api-key
```

On Replit, these are automatically configured via the Secrets tab.

### 4. Database Setup

Push the database schema to your PostgreSQL database:

```bash
npm run db:push
```

Optionally, seed demo data:

```bash
npm run seed:demo
```

### 5. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5000`

## Mobile Development

### iOS Setup (macOS only)

1. **Install Xcode** from the Mac App Store
2. **Install Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```
3. **Install CocoaPods**:
   ```bash
   sudo gem install cocoapods
   ```
4. **Sync and open iOS project**:
   ```bash
   npm run ios
   ```

This will:
- Build the web app
- Sync assets to the iOS project
- Open the project in Xcode
- You can then run the app in the iOS Simulator

### Android Setup

1. **Install Android Studio** ([Download](https://developer.android.com/studio))
2. **Install Android SDK Platform 34** (via Android Studio SDK Manager)
3. **Set up environment variables** (add to `.bashrc` or `.zshrc`):
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
   # or
   export ANDROID_HOME=$HOME/Android/Sdk  # Linux
   
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
4. **Sync and open Android project**:
   ```bash
   npm run android
   ```

This will:
- Build the web app
- Sync assets to the Android project
- Open the project in Android Studio
- You can then run the app in an Android Emulator

## Available Scripts

### Development
- `npm run dev` - Start development server (web app)
- `npm run build` - Build production bundle
- `npm start` - Run production server
- `npm run check` - Run TypeScript type checking

### Mobile
- `npm run ios` - Build and open iOS in Xcode
- `npm run android` - Build and open Android in Android Studio
- `npm run sync:ios` - Sync web build to iOS (without opening Xcode)
- `npm run sync:android` - Sync web build to Android (without opening Android Studio)

### Testing
- `npm test` - Run tests with Vitest
- `npm run test:ui` - Run tests with UI

### Database
- `npm run db:push` - Push schema changes to database
- `npm run seed:demo` - Seed demo data

### Build for Production
- `npm run build:ios` - Build iOS app for App Store
- `npm run build:android` - Build Android app for Play Store

## Troubleshooting

### Database Connection Issues

If you get database connection errors:
1. Verify PostgreSQL is running
2. Check your `DATABASE_URL` in `.env`
3. Ensure the database exists

### Build Errors

If the build fails:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist
npm run build
```

### iOS Simulator Not Starting

1. Open Xcode and go to **Xcode > Preferences > Locations**
2. Ensure Command Line Tools is set
3. Try opening the simulator directly:
   ```bash
   open -a Simulator
   ```

### Android Emulator Not Starting

1. Open Android Studio
2. Go to **Tools > AVD Manager**
3. Create a new Virtual Device if none exist
4. Start the emulator from AVD Manager

### Changes Not Showing Up

If your changes aren't visible:
1. **Hard refresh browser**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
2. **Rebuild**: `npm run build`
3. **Restart dev server**: Stop and run `npm run dev` again
4. **For mobile**: Re-sync with `npm run sync:ios` or `npm run sync:android`

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more solutions.

## Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the code structure
- Read [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions
- Check [ENHANCED_FEATURES.md](./ENHANCED_FEATURES.md) for feature documentation

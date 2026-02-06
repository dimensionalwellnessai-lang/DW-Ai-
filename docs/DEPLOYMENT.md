# Deployment Guide

Complete guide for deploying DW.ai to production, App Store, and Play Store.

## Web Application Deployment

### Prerequisites
- PostgreSQL database (hosted)
- Node.js hosting platform (Replit, Heroku, Railway, etc.)
- Environment variables configured

### Environment Variables

Required for production:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Session Security
SESSION_SECRET=long-random-string-at-least-32-chars

# AI Integration
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...

# Email Service (Resend)
RESEND_API_KEY=re_...

# Optional: Analytics, Error Tracking
SENTRY_DSN=https://...
```

### Deployment Steps

#### Option 1: Replit (Recommended for Quick Deploy)

1. **Fork/Import Repository** to Replit
2. **Configure Secrets** in Replit Secrets tab
3. **Run Database Migration**:
   ```bash
   npm run db:push
   ```
4. **Build and Start**:
   ```bash
   npm run build
   npm start
   ```
5. Replit automatically assigns a public URL

#### Option 2: Railway

1. **Create New Project** on Railway
2. **Connect GitHub Repository**
3. **Add PostgreSQL Database** (Railway addon)
4. **Set Environment Variables** in Railway dashboard
5. **Configure Build Command**:
   ```
   npm run build
   ```
6. **Configure Start Command**:
   ```
   npm start
   ```
7. Railway deploys automatically on push

#### Option 3: Heroku

1. **Create Heroku App**:
   ```bash
   heroku create dwai-app
   ```
2. **Add PostgreSQL Addon**:
   ```bash
   heroku addons:create heroku-postgresql:essential-0
   ```
3. **Set Environment Variables**:
   ```bash
   heroku config:set SESSION_SECRET="your-secret"
   heroku config:set AI_INTEGRATIONS_OPENAI_API_KEY="sk-..."
   ```
4. **Deploy**:
   ```bash
   git push heroku main
   ```
5. **Run Migrations**:
   ```bash
   heroku run npm run db:push
   ```

#### Option 4: DigitalOcean/VPS

1. **Provision Ubuntu Server** (20.04 or later)
2. **Install Node.js and PostgreSQL**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs postgresql
   ```
3. **Clone Repository**:
   ```bash
   git clone https://github.com/dimensionalwellnessai-lang/DW-Ai-.git
   cd DW-Ai-
   npm install
   ```
4. **Set Environment Variables** in `.env` file
5. **Build**:
   ```bash
   npm run build
   ```
6. **Set Up PM2** (process manager):
   ```bash
   npm install -g pm2
   pm2 start npm --name "dwai" -- start
   pm2 save
   pm2 startup
   ```
7. **Configure Nginx** as reverse proxy
8. **Set Up SSL** with Let's Encrypt

## iOS App Store Deployment

### Prerequisites
- Apple Developer Account ($99/year)
- macOS with Xcode installed
- App Store Connect access
- Valid provisioning profiles and certificates

### Preparation

1. **Update App Information**:
   - Edit `capacitor.config.ts`:
     ```typescript
     {
       appId: 'com.yourcompany.dwai',  // Your bundle ID
       appName: 'DW.ai',
     }
     ```
   - Update `ios/App/App/Info.plist` with:
     - App name
     - Privacy permission descriptions
     - URL schemes

2. **App Icon and Splash Screen**:
   - Add app icon: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   - Add splash screen: `ios/App/App/Assets.xcassets/Splash.imageset/`

3. **Build Configuration**:
   - Open Xcode: `npm run ios`
   - Select target "App"
   - Set version and build number
   - Configure signing:
     - Signing & Capabilities
     - Team: Select your Apple Developer team
     - Signing Certificate: Automatic

### Building for App Store

1. **Build Web App**:
   ```bash
   npm run build
   ```

2. **Sync to iOS**:
   ```bash
   npx cap sync ios
   ```

3. **Open in Xcode**:
   ```bash
   npx cap open ios
   ```

4. **Archive Build**:
   - Select "Any iOS Device" as build target
   - Product > Archive
   - Wait for build to complete

5. **Upload to App Store Connect**:
   - Window > Organizer
   - Select your archive
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Follow wizard to upload

### App Store Connect Configuration

1. **Create App Listing**:
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - My Apps > + > New App
   - Fill in:
     - Platform: iOS
     - Name: DW.ai
     - Primary Language: English
     - Bundle ID: (from capacitor.config.ts)
     - SKU: (unique identifier)

2. **App Information**:
   - Privacy Policy URL
   - Category: Health & Fitness
   - Subtitle
   - Keywords

3. **Pricing and Availability**:
   - Price: Free (or set price)
   - Availability: All countries (or specific)

4. **Screenshots**:
   - Prepare screenshots for:
     - 6.7" (iPhone 14 Pro Max)
     - 6.5" (iPhone 11 Pro Max)
     - 5.5" (iPhone 8 Plus)
   - Use Xcode Simulator to capture

5. **App Review Information**:
   - Contact information
   - Demo account (if login required)
   - Notes for reviewer

6. **Submit for Review**:
   - Add build from TestFlight
   - Answer export compliance questions
   - Submit

### TestFlight Beta Testing

Before full release:
1. Select build in App Store Connect
2. Enable TestFlight testing
3. Add internal testers (Apple Developer team)
4. Add external testers (beta users)
5. Get feedback before public release

## Android Play Store Deployment

### Prerequisites
- Google Play Developer Account ($25 one-time)
- Android Studio installed
- Signing key created

### Preparation

1. **Update App Information**:
   - Edit `capacitor.config.ts` (same as iOS)
   - Edit `android/app/src/main/res/values/strings.xml`:
     ```xml
     <string name="app_name">DW.ai</string>
     <string name="custom_url_scheme">dwai</string>
     ```

2. **Create Signing Key**:
   ```bash
   keytool -genkey -v -keystore dwai-release-key.jks \
     -alias dwai -keyalg RSA -keysize 2048 -validity 10000
   ```
   
   Store this key securely! You'll need it for all future updates.

3. **Configure Gradle for Signing**:
   - Edit `android/app/build.gradle`:
     ```gradle
     android {
       signingConfigs {
         release {
           storeFile file('../../dwai-release-key.jks')
           storePassword 'your-store-password'
           keyAlias 'dwai'
           keyPassword 'your-key-password'
         }
       }
       buildTypes {
         release {
           signingConfig signingConfigs.release
           minifyEnabled true
           proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
         }
       }
     }
     ```

4. **App Icon and Splash**:
   - Add icon: `android/app/src/main/res/mipmap-*/ic_launcher.png`
   - Add splash: `android/app/src/main/res/drawable/splash.png`

### Building for Play Store

1. **Build Web App**:
   ```bash
   npm run build
   ```

2. **Sync to Android**:
   ```bash
   npx cap sync android
   ```

3. **Build Release AAB**:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

4. **Locate Build**:
   ```
   android/app/build/outputs/bundle/release/app-release.aab
   ```

### Play Console Configuration

1. **Create App**:
   - Go to [Google Play Console](https://play.google.com/console)
   - Create app
   - Fill in details:
     - App name: DW.ai
     - Default language: English
     - App or game: App
     - Free or paid: Free

2. **Store Listing**:
   - Short description (80 chars)
   - Full description (4000 chars)
   - Screenshots (at least 2):
     - Phone: 16:9 ratio
     - 7-inch tablet (optional)
     - 10-inch tablet (optional)
   - High-res icon: 512x512 PNG
   - Feature graphic: 1024x500 PNG
   - App category: Health & Fitness
   - Content rating questionnaire
   - Privacy policy URL

3. **App Content**:
   - Privacy policy
   - Data safety form
   - Target audience and content
   - News apps declaration (if applicable)

4. **Pricing & Distribution**:
   - Countries: All (or specific)
   - Pricing: Free
   - Contains ads: No (or Yes)

5. **Upload Release**:
   - Go to Production > Create new release
   - Upload AAB file
   - Release name: "1.0.0"
   - Release notes
   - Save and review
   - Submit for review

### Internal Testing (Optional)

Before production release:
1. Create internal testing track
2. Upload AAB
3. Add test users (email addresses)
4. Share testing link
5. Get feedback

### Staged Rollout (Recommended)

1. Use staged rollout feature
2. Start with 10% of users
3. Monitor crash reports and reviews
4. Gradually increase to 100%

## Post-Deployment

### Monitor

- **Web**: Check server logs, error tracking (Sentry)
- **iOS**: Monitor TestFlight feedback, App Store reviews, Xcode Organizer crash reports
- **Android**: Monitor Play Console vitals, crash reports, reviews

### Update Process

#### Web Updates
1. Make changes
2. Run tests
3. Build: `npm run build`
4. Deploy to hosting platform
5. Run migrations if needed: `npm run db:push`

#### iOS Updates
1. Increment version/build number in Xcode
2. Build, archive, and upload (same process as initial)
3. Submit for review in App Store Connect

#### Android Updates
1. Increment `versionCode` and `versionName` in `android/app/build.gradle`
2. Build AAB: `./gradlew bundleRelease`
3. Upload to Play Console
4. Submit for review

### Version Numbers

Follow semantic versioning:
- **Major**: 1.0.0 → 2.0.0 (breaking changes)
- **Minor**: 1.0.0 → 1.1.0 (new features)
- **Patch**: 1.0.0 → 1.0.1 (bug fixes)

iOS and Android version numbers should match.

## Automated Deployment (CI/CD)

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test
      # Deploy to your hosting platform
      
  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - run: npx cap sync ios
      - run: xcodebuild -workspace ios/App/App.xcworkspace ...
      # Upload to TestFlight
      
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - run: npx cap sync android
      - run: cd android && ./gradlew bundleRelease
      # Upload to Play Console
```

## Checklist

### Before First Deploy
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] SSL certificate configured (web)
- [ ] App icons created
- [ ] Screenshots prepared
- [ ] Privacy policy published
- [ ] Demo account created (if needed)
- [ ] Error tracking set up

### Before Each Update
- [ ] Version number incremented
- [ ] Changelog updated
- [ ] Tests passing
- [ ] Build successful
- [ ] Manual testing complete
- [ ] Release notes written

### After Deploy
- [ ] Monitor error rates
- [ ] Check crash reports
- [ ] Read user reviews
- [ ] Update documentation
- [ ] Announce release

## Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Android Design Guidelines](https://developer.android.com/design)

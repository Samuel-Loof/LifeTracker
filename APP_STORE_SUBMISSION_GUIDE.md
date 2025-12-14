# App Store Submission Guide for LifeTrack3r

This guide will walk you through submitting LifeTrack3r to both the Apple App Store and Google Play Store.

## Prerequisites

1. **Expo Account**: Make sure you're logged in to Expo
   ```bash
   npx expo login
   ```

2. **EAS CLI**: Install/update EAS CLI
   ```bash
   npm install -g eas-cli
   ```

3. **Apple Developer Account** (for iOS): $99/year
   - Sign up at: https://developer.apple.com/programs/
   - You'll need your Apple ID, Team ID, and App Store Connect access

4. **Google Play Console Account** (for Android): $25 one-time fee
   - Sign up at: https://play.google.com/console
   - You'll need a Google account

## Step 1: Update Configuration

### iOS Configuration in eas.json

Before building, update the iOS submit configuration in `eas.json`:

1. Open `eas.json`
2. Replace the placeholder values in the `submit.production.ios` section:
   - `appleId`: Your Apple ID email
   - `ascAppId`: Your App Store Connect App ID (you'll get this after creating the app in App Store Connect)
   - `appleTeamId`: Your Apple Developer Team ID (found in Apple Developer account)

### Android Configuration

For Android, you'll need a Google Service Account JSON file:
1. Go to Google Play Console → Setup → API access
2. Create a service account
3. Download the JSON key file
4. Save it as `google-service-account.json` in your project root
5. **IMPORTANT**: Add `google-service-account.json` to `.gitignore` (already done)

## Step 2: Build Production Apps

### Build iOS App

```bash
eas build --platform ios --profile production
```

This will:
- Create an iOS build
- Upload it to EAS servers
- Take 15-30 minutes

### Build Android App

```bash
eas build --platform android --profile production
```

This will:
- Create an Android App Bundle (.aab)
- Upload it to EAS servers
- Take 10-20 minutes

## Step 3: App Store Connect Setup (iOS)

### 3.1 Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - **Platform**: iOS
   - **Name**: LifeTrack3r
   - **Primary Language**: English (or your choice)
   - **Bundle ID**: Select `com.discosam.LifeTrack3r` (create it in Apple Developer if needed)
   - **SKU**: A unique identifier (e.g., `lifetrack3r-001`)
   - **User Access**: Full Access

### 3.2 App Information

Fill in all required fields:
- **Privacy Policy URL**: Required! Create a privacy policy page and host it online
- **Category**: Health & Fitness
- **Subtitle**: Brief description (30 characters max)
- **Description**: Full app description
- **Keywords**: Relevant keywords (100 characters max)
- **Support URL**: Your support website/email
- **Marketing URL**: (Optional) Your marketing website

### 3.3 App Store Listing

Upload screenshots:
- **iPhone 6.7" Display** (iPhone 14 Pro Max, etc.): 1290 x 2796 pixels
- **iPhone 6.5" Display** (iPhone 11 Pro Max, etc.): 1242 x 2688 pixels
- **iPhone 5.5" Display** (iPhone 8 Plus, etc.): 1242 x 2208 pixels
- **iPad Pro 12.9"**: 2048 x 2732 pixels
- **App Preview Videos** (Optional but recommended)

### 3.4 Pricing and Availability

- Set price (Free or Paid)
- Select countries/regions
- Set availability date

### 3.5 App Privacy

Answer privacy questions:
- Data collection practices
- Third-party data sharing
- Advertising tracking

**Note**: Your app uses:
- Camera (for barcode scanning)
- Notifications (for reminders)
- No user data is collected or shared

## Step 4: Google Play Console Setup (Android)

### 4.1 Create App

1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in:
   - **App name**: LifeTrack3r
   - **Default language**: English
   - **App or game**: App
   - **Free or paid**: Choose your option

### 4.2 Store Listing

Fill in:
- **Short description**: 80 characters max
- **Full description**: 4000 characters max
- **App icon**: 512 x 512 pixels
- **Feature graphic**: 1024 x 500 pixels
- **Screenshots**: At least 2 required
  - Phone: 16:9 or 9:16 aspect ratio
  - Tablet: 16:9 or 9:16 aspect ratio
- **Privacy Policy URL**: Required!

### 4.3 Content Rating

Complete the content rating questionnaire:
- Your app is likely rated "Everyone" (no objectionable content)

### 4.4 App Access

- Indicate if app requires sign-in (your app doesn't)
- Explain any restricted features

### 4.5 Data Safety

Answer questions about:
- Data collection (your app doesn't collect user data)
- Data sharing (your app doesn't share data)
- Security practices

## Step 5: Submit Apps

### Submit iOS App

1. Update `eas.json` with your App Store Connect details (if not done already)
2. Run:
   ```bash
   eas submit --platform ios --profile production
   ```
3. Follow prompts to authenticate
4. The build will be uploaded to App Store Connect

### Submit Android App

1. Ensure `google-service-account.json` is in project root
2. Run:
   ```bash
   eas submit --platform android --profile production
   ```
3. The build will be uploaded to Google Play Console

## Step 6: Final Steps in Stores

### iOS (App Store Connect)

1. Go to your app in App Store Connect
2. Click the build you just submitted
3. Fill in "What's New in This Version"
4. Answer any export compliance questions
5. Click "Submit for Review"

**Review Time**: Typically 24-48 hours

### Android (Google Play Console)

1. Go to your app in Google Play Console
2. Navigate to "Production" → "Create new release"
3. Select the uploaded build
4. Fill in "Release notes"
5. Review and roll out

**Review Time**: Typically 1-7 days

## Important Notes

### Privacy Policy

**You MUST create a privacy policy** before submitting. It should cover:
- What data you collect (if any)
- How you use the data
- Third-party services (OpenFoodFacts API, API Ninjas)
- User rights

You can:
- Create a simple page on GitHub Pages
- Use a privacy policy generator
- Host on your own website

### API Keys

⚠️ **Security Note**: There's a hardcoded API key in `app/components/screens/AddExerciseScreen.tsx`. For production:
1. Move it to environment variables
2. Use `expo-constants` to access it
3. Never commit API keys to version control

### Version Updates

When updating your app:
1. Increment version in `app.json`:
   - `version`: "1.0.1" (user-facing)
   - iOS `buildNumber`: "2" (increment each build)
   - Android `versionCode`: 2 (increment each build)
2. Build new production versions
3. Submit updates through the same process

## Troubleshooting

### iOS Build Issues

- **Missing Bundle Identifier**: Create it in Apple Developer Portal
- **Code Signing Errors**: Ensure your Apple Developer account is active
- **Missing Provisioning Profile**: EAS will create this automatically

### Android Build Issues

- **Service Account Errors**: Verify JSON file path and permissions
- **Package Name Conflicts**: Ensure `com.discosam.LifeTrack3r` is unique

### Submission Issues

- **Authentication Failed**: Re-authenticate with `eas login`
- **Build Not Found**: Wait for build to complete, check status with `eas build:list`

## Useful Commands

```bash
# Check build status
eas build:list

# View build details
eas build:view [BUILD_ID]

# Check submission status
eas submit:list

# Update EAS CLI
npm install -g eas-cli@latest
```

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)

## Checklist Before Submission

- [ ] Updated `app.json` with correct bundle identifier
- [ ] Updated `eas.json` with Apple ID and Team ID (iOS)
- [ ] Created Google Service Account JSON (Android)
- [ ] Created and hosted privacy policy
- [ ] Prepared app screenshots for both platforms
- [ ] Written app description and keywords
- [ ] Tested app thoroughly on physical devices
- [ ] Removed any test/debug code
- [ ] Moved API keys to environment variables (recommended)
- [ ] Built production versions successfully
- [ ] Submitted to both stores
- [ ] Completed all store listing requirements

Good luck with your app launch! 🚀


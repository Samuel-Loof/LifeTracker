# Google Play Store Submission Guide for LifeTrack3r

This guide will walk you through submitting LifeTrack3r to the Google Play Store.

## Prerequisites

1. **Expo Account**: Make sure you're logged in to Expo
   ```bash
   npx expo login
   ```

2. **EAS CLI**: Install/update EAS CLI
   ```bash
   npm install -g eas-cli
   ```

3. **Google Play Console Account**: $25 one-time registration fee
   - Sign up at: https://play.google.com/console
   - You'll need a Google account
   - Pay the $25 registration fee (one-time, not yearly)

## Step 1: Set Up Google Play Console

### 1.1 Create Your Developer Account

1. Go to https://play.google.com/console
2. Sign in with your Google account
3. Pay the $25 registration fee (one-time payment)
4. Complete your developer profile:
   - Developer name (this will be visible to users)
   - Contact email
   - Phone number
   - Address

### 1.2 Create Your App

1. In Google Play Console, click **"Create app"**
2. Fill in the required information:
   - **App name**: LifeTrack3r
   - **Default language**: English (or your preferred language)
   - **App or game**: App
   - **Free or paid**: Choose (Free is recommended to start)
   - **Declarations**: Check the boxes that apply
3. Click **"Create app"**

## Step 2: Set Up Google Service Account (Required for EAS Submit)

To automatically submit your app, you need to create a service account:

### 2.1 Create Service Account in Google Cloud

1. Go to https://console.cloud.google.com
2. Create a new project (or select existing):
   - Click "Select a project" → "New Project"
   - Name it "LifeTrack3r" or similar
   - Click "Create"

3. Enable Google Play Android Developer API:
   - In the project, go to "APIs & Services" → "Library"
   - Search for "Google Play Android Developer API"
   - Click on it and click "Enable"

### 2.2 Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in:
   - **Service account name**: `eas-submit` (or any name)
   - **Service account ID**: Auto-generated
   - Click "Create and Continue"
4. Skip the optional steps (click "Continue" then "Done")

### 2.3 Create and Download Key

1. Click on the service account you just created
2. Go to the "Keys" tab
3. Click "Add Key" → "Create new key"
4. Select "JSON" format
5. Click "Create" - this will download a JSON file
6. **Save this file as `google-service-account.json` in your project root**

### 2.4 Link Service Account to Play Console

1. Go back to Google Play Console
2. Go to **Setup** → **API access** (in the left sidebar)
3. Under "Service accounts", click **"Link service account"**
4. Enter the email address from your service account (found in the JSON file, looks like `eas-submit@your-project.iam.gserviceaccount.com`)
5. Click **"Grant access"**
6. Grant the following permissions:
   - ✅ **View app information and download bulk reports**
   - ✅ **Manage production releases**
   - ✅ **Manage testing track releases** (optional but recommended)
7. Click **"Invite user"**

## Step 3: Build Your Android App

Now you're ready to build your production app:

```bash
eas build --platform android --profile production
```

This will:
- Create an Android App Bundle (.aab) - required format for Google Play
- Upload it to EAS servers
- Take approximately 10-20 minutes
- You can monitor progress in the terminal or at https://expo.dev

**Note**: Make sure `google-service-account.json` is in your project root before submitting.

## Step 4: Complete Store Listing in Google Play Console

While your app is building, prepare your store listing:

### 4.1 App Details

Go to **Store presence** → **Store listing** and fill in:

- **App name**: LifeTrack3r (50 characters max)
- **Short description**: Brief tagline (80 characters max)
  - Example: "Track your nutrition, habits, and fitness goals all in one place"
- **Full description**: Detailed description (4000 characters max)
  - Describe features, benefits, what makes your app unique
  - Use line breaks for readability
  - Include keywords naturally

### 4.2 Graphics

Upload required graphics:

1. **App icon**: 
   - Size: 512 x 512 pixels
   - Format: PNG (32-bit with alpha)
   - Your file: `./assets/adaptive-icon.png` (check if it's 512x512)

2. **Feature graphic**:
   - Size: 1024 x 500 pixels
   - Format: JPG or PNG (24-bit)
   - This appears at the top of your Play Store listing
   - Create a promotional banner with your app name/logo

3. **Screenshots** (at least 2 required, up to 8):
   - **Phone screenshots**: 
     - Minimum: 2 screenshots
     - Aspect ratio: 16:9 or 9:16
     - Recommended: 1080 x 1920 pixels (portrait) or 1920 x 1080 (landscape)
   - **Tablet screenshots** (optional but recommended):
     - Aspect ratio: 16:9 or 9:16
     - Recommended: 1200 x 1920 pixels

**Tip**: Take screenshots on a real device or use an Android emulator. Show your app's best features!

### 4.3 Privacy Policy

**This is REQUIRED!** You must provide a privacy policy URL.

Options:
1. **GitHub Pages** (free):
   - Create a `privacy-policy.html` file
   - Host it on GitHub Pages
   - Get URL like: `https://yourusername.github.io/privacy-policy.html`

2. **Privacy Policy Generator**:
   - Use a free generator like: https://www.freeprivacypolicy.com/
   - Download the HTML
   - Host it somewhere (GitHub Pages, your website, etc.)

3. **Your own website**: If you have one

**What to include in privacy policy:**
- What data you collect (your app doesn't collect user data, but mention camera usage)
- How you use the data
- Third-party services (OpenFoodFacts API, API Ninjas)
- User rights
- Contact information

### 4.4 Categorization

- **App category**: Health & Fitness
- **Tags**: Add relevant tags (e.g., nutrition, fitness, health tracking)

### 4.5 Contact Details

- **Email address**: Your support email
- **Phone number**: (Optional)
- **Website**: (Optional but recommended)

## Step 5: Complete App Content

### 5.1 Content Rating

1. Go to **Policy** → **App content**
2. Click **"Start questionnaire"**
3. Answer questions honestly:
   - Your app is likely rated **"Everyone"** (no violence, mature content, etc.)
   - Questions about data collection, user-generated content, etc.
4. Submit for rating (usually instant for simple apps)

### 5.2 Data Safety

1. Go to **Policy** → **Data safety**
2. Answer questions about:
   - **Data collection**: Your app doesn't collect personal data
   - **Data sharing**: Your app doesn't share data
   - **Data security**: Data is stored locally on device
   - **Permissions**: 
     - Camera (for barcode scanning)
     - Notifications (for reminders)
3. Be accurate - Google reviews this

### 5.3 Target Audience

- **Target audience**: Select appropriate age range
- **Content guidelines**: Confirm your app follows policies

## Step 6: Submit Your App

### 6.1 Automatic Submission (Recommended)

Once your build is complete and you have `google-service-account.json` in place:

```bash
eas submit --platform android --profile production
```

This will:
- Upload your app bundle to Google Play Console
- Create a new release in the "Internal testing" track (as configured in `eas.json`)

### 6.2 Manual Submission (Alternative)

If you prefer to upload manually:

1. Download your build from EAS:
   ```bash
   eas build:list
   eas build:download [BUILD_ID]
   ```

2. In Google Play Console:
   - Go to **Release** → **Production** (or **Testing** → **Internal testing**)
   - Click **"Create new release"**
   - Upload the `.aab` file
   - Fill in **"Release notes"** (what's new in this version)
   - Click **"Save"** then **"Review release"**

## Step 7: Review and Publish

### 7.1 Review Your Release

1. Go to **Release** → **Production** (or your chosen track)
2. Review all the information:
   - App bundle version
   - Release notes
   - Store listing
3. Click **"Start rollout to Production"** (or your track)

### 7.2 Google Review Process

- Google will review your app (typically 1-7 days)
- They check for:
  - Policy compliance
  - Content guidelines
  - Technical requirements
  - Data safety accuracy

### 7.3 Publishing

Once approved:
- Your app will be published to Google Play Store
- It will be available for download worldwide (or in selected countries)
- You'll receive an email notification

## Step 8: Post-Launch

### 8.1 Monitor Your App

- Check **Statistics** for downloads, ratings, reviews
- Respond to user reviews
- Monitor **Crashes & ANRs** (Application Not Responding)

### 8.2 Update Your App

When you want to release an update:

1. Update version in `app.json`:
   ```json
   "version": "1.0.1",
   "android": {
     "versionCode": 2
   }
   ```

2. Build new version:
   ```bash
   eas build --platform android --profile production
   ```

3. Submit update:
   ```bash
   eas submit --platform android --profile production
   ```

## Troubleshooting

### Build Issues

- **"No credentials found"**: Make sure you're logged in with `npx expo login`
- **Build fails**: Check the build logs in the terminal or at expo.dev
- **Version conflicts**: Increment `versionCode` in `app.json`

### Submission Issues

- **"Service account not found"**: 
  - Verify `google-service-account.json` is in project root
  - Check the file path in `eas.json` matches
  - Ensure service account is linked in Play Console

- **"Permission denied"**: 
  - Verify service account has correct permissions in Play Console
  - Re-link the service account if needed

- **"Package name already exists"**: 
  - Your package name `com.discosam.LifeTrack3r` must be unique
  - If taken, change it in `app.json` (requires new build)

### Store Listing Issues

- **"Privacy policy required"**: You must provide a valid, accessible URL
- **"Screenshots required"**: Upload at least 2 phone screenshots
- **"Content rating incomplete"**: Complete the content rating questionnaire

## Quick Reference Commands

```bash
# Login to Expo
npx expo login

# Check if logged in
npx expo whoami

# Build Android app
eas build --platform android --profile production

# Check build status
eas build:list

# View build details
eas build:view [BUILD_ID]

# Submit to Play Store
eas submit --platform android --profile production

# Check submission status
eas submit:list

# Update EAS CLI
npm install -g eas-cli@latest
```

## Pre-Submission Checklist

Before submitting, make sure you have:

- [ ] Google Play Console account created ($25 paid)
- [ ] App created in Play Console
- [ ] Google Service Account created and linked
- [ ] `google-service-account.json` file in project root
- [ ] Privacy policy created and hosted online
- [ ] App icon (512x512) ready
- [ ] Feature graphic (1024x500) ready
- [ ] At least 2 phone screenshots ready
- [ ] App description written
- [ ] Content rating questionnaire completed
- [ ] Data safety form completed
- [ ] Production build completed successfully
- [ ] Tested app on physical Android device
- [ ] Removed any test/debug code
- [ ] Reviewed all store listing information

## Resources

- [Google Play Console](https://play.google.com/console)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/android/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)
- [Android App Bundle Guide](https://developer.android.com/guide/app-bundle)

Good luck with your Google Play Store launch! 🚀



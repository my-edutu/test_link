# LinguaLink AI - EAS Build Guide

## Prerequisites

Before building with EAS, ensure you have:

1. **Node.js 20.x** or later installed
2. **EAS CLI** installed globally: `npm install -g eas-cli`
3. **Expo account** - Login with: `eas login`
4. **EAS project configured** - Project ID: `83d27f8b-1ac3-47eb-984f-84808ed6e229`

## Build Profiles

### Development Build
For local testing with development client:
```bash
eas build --platform android --profile development
```
- Output: APK for internal testing
- Includes dev tools and debugging features
- Uses debug signing

### Preview Build
For internal testing with production-like behavior:
```bash
eas build --platform android --profile preview
```
- Output: APK for internal distribution
- Production code but unsigned for store

### Production Build
For Google Play Store submission:
```bash
eas build --platform android --profile production
```
- Output: AAB (Android App Bundle)
- Requires production signing credentials
- Auto-increments version code

## Required EAS Secrets

Configure these secrets before production build using `eas secret:create`:

### Required Secrets
```bash
# Supabase Configuration
eas secret:create EXPO_PUBLIC_SUPABASE_URL --value "your-supabase-url"
eas secret:create EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key"

# Clerk Authentication
eas secret:create EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "your-clerk-key"

# LiveKit (for live streaming)
eas secret:create LIVEKIT_URL --value "wss://your-livekit-url"
eas secret:create LIVEKIT_API_KEY --value "your-api-key"
eas secret:create LIVEKIT_API_SECRET --value "your-api-secret"

# Analytics (optional but recommended)
eas secret:create EXPO_PUBLIC_POSTHOG_API_KEY --value "your-posthog-key"

# Payment Gateway
eas secret:create PAYSTACK_PUBLIC_KEY --value "your-paystack-public-key"
eas secret:create PAYSTACK_SECRET_KEY --value "your-paystack-secret-key"
```

## Production Signing Setup

### Generate Production Keystore
```bash
keytool -genkey -v -keystore lingualink-prod.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias lingualink-prod
```

### Configure Credentials with EAS
```bash
eas credentials
# Select: Android
# Select: production profile
# Choose: Add new keystore
# Upload your keystore file
```

**IMPORTANT**: Back up your keystore securely. If lost, you cannot update your app on Play Store.

## Pre-Build Checklist

Before triggering a production build:

- [ ] All secrets configured in EAS dashboard
- [ ] Production keystore uploaded and configured
- [ ] `google-services.json` present in project root
- [ ] All environment variables verified
- [ ] Version number incremented if needed
- [ ] Tested preview build successfully

## Build Configuration Summary

### app.json Settings
- **Package**: `com.lingualink.com`
- **Version**: `1.0.0`
- **Runtime Version**: `1.0.0`
- **New Architecture**: Enabled
- **Edge-to-Edge**: Enabled

### Android Configuration
- **Min SDK**: Defined by Expo SDK 54
- **Target SDK**: Latest stable
- **Hermes**: Enabled
- **ProGuard**: Enabled for release builds
- **Resource Shrinking**: Enabled

### Native Modules
The following native modules require EAS build (won't work in Expo Go):
- `@livekit/react-native` - WebRTC for live streaming
- `expo-dev-client` - Development client
- Native camera/microphone access

## Common Build Issues & Solutions

### Issue: Missing google-services.json
```
Error: google-services.json not found
```
**Solution**: Ensure `google-services.json` is in project root and `.easignore` has `!google-services.json`

### Issue: Keystore Not Found
```
Error: No keystore found for release build
```
**Solution**: Run `eas credentials` to configure Android signing

### Issue: Native Module Errors
```
Error: Cannot find module 'xxx'
```
**Solution**: Clear cache and rebuild:
```bash
eas build --platform android --profile development --clear-cache
```

### Issue: ProGuard Errors
```
Error: ClassNotFoundException after minification
```
**Solution**: Add keep rules to `android/app/proguard-rules.pro`

### Issue: OTA Updates Failing
```
Error: Update signature verification failed
```
**Solution**: Verify project ID matches in:
- `app.json` > `extra.eas.projectId`
- `app.json` > `updates.url`
- `AndroidManifest.xml` > `EXPO_UPDATE_URL`

## Post-Build Testing

After successful build:

1. **Install and test** on physical device
2. **Verify all features**:
   - Authentication flow
   - Voice recording
   - Live streaming
   - Push notifications
   - Payment flow
   - Deep linking
3. **Test OTA updates**: Push an update with `eas update`
4. **Monitor crash reports** via Firebase Crashlytics

## Submitting to Play Store

```bash
# Automatic submission (after production build)
eas submit --platform android --profile production

# Or submit existing build
eas submit --platform android --latest
```

### First Submission Checklist
- [ ] Play Console account set up
- [ ] App listing created
- [ ] Privacy policy URL
- [ ] Content rating questionnaire completed
- [ ] Target audience defined
- [ ] App screenshots and graphics

## CI/CD Integration (Optional)

For automated builds, add to your CI config:

```yaml
# GitHub Actions example
- name: Setup EAS
  uses: expo/expo-github-action@v8
  with:
    eas-version: latest
    token: ${{ secrets.EXPO_TOKEN }}

- name: Build
  run: eas build --platform android --profile production --non-interactive
```

## Useful Commands

```bash
# Check build status
eas build:list

# View build logs
eas build:view

# Cancel running build
eas build:cancel

# Update OTA
eas update --branch production --message "Bug fixes"

# Check credentials
eas credentials

# View project info
eas project:info
```

## Support

- Expo documentation: https://docs.expo.dev/build/introduction/
- EAS Build reference: https://docs.expo.dev/eas/json/
- Troubleshooting: https://docs.expo.dev/build/troubleshooting/

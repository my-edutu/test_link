---
description: Build the application for distribution using EAS Build
---

# Build for Distribution (Android APK / iOS Ad Hoc)

To create a shareable link that clients can use to download and install the app (APK for Android), follow these steps:

## Prerequisites
- Ensure you are logged in to EAS: `eas login`
- Ensure you have no uncommitted changes (or commited them) if you want a clean build.

## Build Commands

### Android (APK)
This generates a standalone APK file that can be installed on any Android device.
```bash
eas build -p android --profile preview
```
- **Output:** A QR code and a link to the build page where you can download the `.apk` file.

### iOS (Ad Hoc / Internal)
This generates an IPA file that can be installed on **specific registered devices**.
**Note:** You must register the client's device UDID in your Apple Developer account and run `eas device:create` before building.
```bash
eas build -p ios --profile preview
```
- **Output:** A link to install the app on registered devices.

### Troubleshooting
- If the build fails locally, run with `--local` to debug, though this requires setting up the Android/iOS environment locally.
- Check `eas.json` to modify build profiles if needed.

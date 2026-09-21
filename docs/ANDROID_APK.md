# Android APK (Capacitor) — EduMind

This repo ships a **Capacitor scaffold** so a school/IT partner can wrap the live Vercel web app as an Android APK. A prebuilt `.apk` binary is **not** committed (Android SDK was not available in the CI/agent environment).

## Prerequisites

- Node.js 20+
- Android Studio (or Android SDK + platform-tools)
- JDK 17+
- `ANDROID_HOME` / `ANDROID_SDK_ROOT` set

## One-time setup

```bash
cd frontend
npm install
npm run build
npx cap add android   # creates frontend/android (gitignored if huge)
npx cap sync android
npx cap open android  # opens Android Studio
```

The Capacitor config (`frontend/capacitor.config.json`) points `server.url` at the live frontend:

`https://edumind-student-growth.vercel.app`

For a fully offline-packaged shell, remove `server.url` so the APK loads the built `dist/` assets instead, then re-run `npm run build && npx cap sync android`.

## Build a release APK / AAB

In Android Studio: **Build → Generate Signed Bundle / APK**.

Or CLI (after `sdkmanager` / Gradle are ready):

```bash
cd frontend/android
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release-unsigned.apk
```

Sign with your school/partner keystore before Play Store or MDM distribution.

## Notes

- Prefer **PWA Add to Home Screen** for pilots (see `docs/MOBILE_INSTALL_GUIDE.md`) — no store review.
- Backend cold starts on Render free tier may make the first API call slow inside the WebView.
- Google Drive media may open in the system browser when in-app playback is blocked.

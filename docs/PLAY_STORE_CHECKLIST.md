# EduMind Google Play Store checklist

Package / application ID: `com.edumind.studentgrowth`  
App name: EduMind  
Privacy policy (live web): https://edumind-student-growth-platform.vercel.app/privacy  
Terms: https://edumind-student-growth-platform.vercel.app/terms  
API (HTTPS): https://edumind-backend-69e4.onrender.com  
Web: https://edumind-student-growth-platform.vercel.app  

Native project: `frontend/android/` (Capacitor 7, `targetSdkVersion` / `compileSdkVersion` **35**, `minSdkVersion` **23**).  
Version: `versionCode` **1**, `versionName` **1.0.0**.

## What this repo already prepares

- Bundled Capacitor WebView (no remote `server.url` — the previous config pointed at a dead Vercel host).
- Cleartext disabled + `network_security_config.xml` for Render / Vercel / Supabase / Mux HTTPS.
- Camera, microphone, and media-read permissions for Shorts / learning-log capture.
- Deep links: `https://edumind-student-growth-platform.vercel.app/*` and `edumind://app`.
- Release signing via `frontend/android/keystore.properties` (see `keystore.properties.example`).
- CI workflow ``docs/ci/android-play.yml` (copy to `.github/workflows/android-play.yml` once the GitHub PAT has `workflow` scope, or add via the GitHub UI)`: debug APK always; signed AAB when keystore secrets exist.
- npm scripts: `android:apk`, `android:aab`, `android:sync`.

## Play Console gaps (user / ops)

| Item | Status | Notes |
|------|--------|-------|
| Google Play Console developer account | User | One-time registration + fee |
| Create app listing (name, short/full description) | User | en-IN copy |
| Signed upload keystore | User | Create once; store offline + as GH secrets |
| Upload signed **AAB** (not APK) | Us after secrets | `bundleRelease` / CI artifact |
| Privacy policy URL | Partial | Page exists; still marked pilot placeholder — legal review recommended |
| Data safety form | User | Camera, mic, photos/videos, account info, learning activity |
| Content rating questionnaire | User | IARC; education / social features |
| Target audience / Kids policy | User | Minors in schools → Families / supervised accounts; may need Play Families answers |
| Feature graphic | User | **1024 × 500** PNG/JPEG |
| Phone screenshots | User | min 2; **16:9 or 9:16**, between **320px and 3840px** on each side |
| Tablet screenshots (optional) | User | 7" and 10" if claiming tablet support |
| High-res icon | Partial | Need **512 × 512** PNG for Play (PWA has 512; export clean branding) |
| App signing by Google Play | User | Prefer Play App Signing; upload key ≠ app signing key |
| Digital Asset Links for App Links | User/Us | Host `/.well-known/assetlinks.json` on Vercel after SHA-256 cert fingerprint known |
| Store listing contact email / website | User | |
| GitHub Actions secrets `VITE_*` | User | Match production Vercel env |
| GitHub Actions keystore secrets | User | `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` |

## Blocked elsewhere (not required for first Play upload)

- Drive OAuth on Render (`GOOGLE_OAUTH_*`) — user secrets.
- WhatsApp PR #28 — Meta / Gupshup keys.

## Local commands

```bash
cd frontend
export VITE_API_BASE_URL=https://edumind-backend-69e4.onrender.com
export VITE_SUPABASE_URL=...
export VITE_SUPABASE_ANON_KEY=...
npm ci
npm run android:apk          # debug APK
# After keystore.properties exists:
npm run android:aab          # signed release AAB for Play
```

## Signing (one-time, on a trusted machine)

```bash
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias edumind
# Copy to frontend/android/upload-keystore.jks and fill keystore.properties from the example.
# Also base64 the jks into GitHub secret ANDROID_KEYSTORE_BASE64 for CI.
```

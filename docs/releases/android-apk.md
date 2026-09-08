# Android APK release preparation

Status: native Android project and automated build workflow prepared; no verified signed APK or live student service.

Capacitor packages the existing React app as Android assets. AI remains off.
The native app does not register the web service worker, so bundled updates
are not replaced by an old web cache. App ID: com.kedarnath.edumind.

Before a usable APK can be distributed:

1. Confirm and activate the intended Supabase project; deploy the student API.
2. Configure frontend VITE_API_BASE_URL (HTTPS), VITE_SUPABASE_URL and
   VITE_SUPABASE_ANON_KEY in the build environment. Never include database
   passwords, service-role keys, Google refresh tokens or signing secrets.
3. Add https://localhost to the student API's configured CORS_ORIGINS for the
   packaged Android client. Keep authentication and record authorization enabled.
4. Install the Android toolchain required by the pinned Capacitor version.
   From frontend, run npm ci, npm run build, npx cap sync android using the committed native project. Keep the generated native project under version
   control when establishing the release build; do not regenerate customizations.
5. Open with npx cap open android and build a signed release APK in Android
   Studio. The owner must retain the release keystore securely for all updates.
   Do not commit the keystore or its passwords. Increment versionCode for updates.
6. Test sign-in, account activation, shared-phone sign-out, learning saves,
   revision completion and offline/reconnect on a real Android phone. Email
   confirmation can finish in the browser; verify subsequent sign-in in the APK.
7. Publish only the verified signed APK and its SHA-256 checksum on the app's
   download page. Keep the APK signing identity stable for future updates.

Current blockers: Render access is not connected, intended Supabase target is
unconfirmed, and Android SDK/Gradle are not available in this workspace. Google
Drive upload integration is still unimplemented. Do not label a generated shell
as a functioning student release. No payment or production change was made.

User setup: connect the hosting account, confirm the database target, and retain
the signing key through secure tooling. No coding is required from the owner.

## Automated build and owner setup

Android build runs compilation checks on the release branch and PR. These checks
produce no downloadable student APK. For a signed build, merge the reviewed
workflow to the default branch, configure the four VITE variables listed above
(including VITE_PUBLIC_APP_URL) in GitHub Actions repository variables, and add
ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS and
ANDROID_KEY_PASSWORD as Actions secrets using secure account tooling. Retain an
offline backup of the keystore. Never paste these values into a chat or commit.
Run Android build manually; its artifact contains the signed APK and checksum.
The workflow refuses a release without deployed HTTPS configuration or signing
credentials. A successful build still needs live account and phone acceptance.

Password recovery now has /forgot-password and /reset-password screens. Set
VITE_PUBLIC_APP_URL to the deployed frontend HTTPS origin (also in APK builds),
and allow that origin's /reset-password URL in Supabase Auth redirect settings.
Configure SMTP and test a recovery email. APK recovery finishes in the browser;
the student returns to the APK and signs in with the new password.

Verified cloud status remains: edumind-ai-learning is INACTIVE, and its purpose
must be confirmed before changing it. No Render connector is available here.

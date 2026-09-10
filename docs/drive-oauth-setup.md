# EduMind Drive uploads via OAuth (personal Gmail)

Service accounts have **no Drive storage**. For `mamanikedarnath97@gmail.com` My Drive folders, use OAuth.

## 1. Google Cloud Console
1. Open the same GCP project as EduMind Drive.
2. Enable **Google Drive API**.
3. APIs & Services → Credentials → **Create OAuth client ID** → Application type **Desktop app**.
4. Copy Client ID and Client Secret.

## 2. Get a refresh token
Use [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/):
1. Gear icon → **Use your own OAuth credentials** → paste Client ID/Secret.
2. Select scope `https://www.googleapis.com/auth/drive`.
3. Authorize with **mamanikedarnath97@gmail.com**.
4. Exchange authorization code for tokens → copy **Refresh token**.

## 3. Render env (`edumind-backend`)
```
GOOGLE_DRIVE_ENABLED=true
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REFRESH_TOKEN=...
DRIVE_PROOFS_FOLDER_ID=...
DRIVE_DOCUMENTS_FOLDER_ID=...
```
Keep folder IDs pointing at your EduMind folders. You can leave `GOOGLE_SERVICE_ACCOUNT_JSON` set; OAuth is preferred when all three OAuth vars are present.

## 4. Redeploy and test
Student → Upload proof. Files should appear under your My Drive folders owned by your Gmail.

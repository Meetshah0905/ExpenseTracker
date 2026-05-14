# DriveBackedFinance

Mobile-first personal finance PWA for iOS Safari. Google Drive is the permanent database; browser storage is not used as the source of truth.

## Run Locally

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`.

## Environment Variables

Create `.env`:

```env
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GEMINI_API_KEY=your-gemini-api-key
```

`VITE_GOOGLE_CLIENT_ID` is public browser configuration. `GEMINI_API_KEY` must stay server-side and is used only by `/api/extract-transaction`.

## Google Drive Setup

1. Go to Google Cloud Console.
2. Create or choose a project.
3. Enable Google Drive API.
4. Configure OAuth consent screen.
5. Create an OAuth Client ID for Web application.
6. Add authorized JavaScript origin: `http://localhost:5173`.
7. Put the client ID in `VITE_GOOGLE_CLIENT_ID`.

The app requests only:

```text
https://www.googleapis.com/auth/drive.appdata
```

The app stores `finance-app-data.json` in Drive `appDataFolder`.

## Gemini AI Photo Import

AI extraction is handled through backend/serverless routes:

- `GET /api/health`
- `POST /api/extract-transaction`

The frontend compresses the selected image, uploads it to the backend, and receives structured transaction JSON. The user must review and save manually. Gemini results are never auto-saved.

For production, deploy the API routes to Vercel or adapt `src/server/geminiExtraction.ts` to another serverless platform. Do not put `GEMINI_API_KEY` in frontend code.

## Data Storage Rules

- Finance data is not stored in `localStorage`, cookies, or `sessionStorage`.
- Browser memory can hold the current session only.
- If the user refreshes before connecting Drive, unsynced memory data may be gone.
- Drive is the source of truth.
- JSON export/import is available in Settings for backup and recovery.

## iOS Safari Notes

- Add to Home Screen is supported through the PWA manifest.
- Service worker caches only the app shell in production.
- Daily snapshots are created when the app opens/syncs or data changes, not by relying on background jobs.

## Verification

```powershell
npm test
npm run build
```

If tests fail after changing environment or dependencies, restart the dev server so Vite reloads API middleware.

## Known Limitations

- Browser OAuth cannot store refresh tokens; reconnect may be needed after token expiry.
- Gemini extraction needs a backend API and `GEMINI_API_KEY`.
- The app uses Drive `appDataFolder`, so the database file is hidden from normal Drive UI.

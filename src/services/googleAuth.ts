const DRIVE_APPDATA_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
};

type TokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
  callback: (response: TokenResponse) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

let tokenClient: TokenClient | null = null;
let accessToken: string | null = null;
let expiresAt = 0;
let lastAuthError = "";

export function initGoogleAuth() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Missing VITE_GOOGLE_CLIENT_ID");
  if (!window.google?.accounts?.oauth2) throw new Error("Google Identity Services has not loaded yet");

  tokenClient =
    tokenClient ??
    window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_APPDATA_SCOPE,
      callback: () => undefined
    });
}

export async function requestAccessToken(prompt: "" | "consent" = "") {
  initGoogleAuth();
  if (accessToken && Date.now() < expiresAt - 60_000) return accessToken;

  return new Promise<string>((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error("Google auth is not initialized"));
      return;
    }

    tokenClient.callback = (response) => {
      if (response.error || !response.access_token) {
        lastAuthError = response.error || "Google Drive authorization failed";
        reject(new Error(lastAuthError));
        return;
      }
      accessToken = response.access_token;
      expiresAt = Date.now() + (response.expires_in ?? 3600) * 1000;
      lastAuthError = "";
      resolve(response.access_token);
    };

    tokenClient.requestAccessToken({ prompt });
  });
}

export function clearAccessToken() {
  accessToken = null;
  expiresAt = 0;
}

export function getGoogleAuthDebug() {
  return {
    clientIdConfigured: Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID),
    tokenAvailable: Boolean(accessToken),
    tokenExpiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    tokenExpired: Boolean(accessToken && Date.now() >= expiresAt - 60_000),
    lastAuthError
  };
}

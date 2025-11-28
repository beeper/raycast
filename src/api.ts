import BeeperDesktop from "@beeper/desktop-api";
import type { AppOpenParams } from "@beeper/desktop-api/resources/app";
import { closeMainWindow, getPreferenceValues, OAuth, showHUD } from "@raycast/api";
import { OAuthService, usePromise, getAccessToken } from "@raycast/utils";
import { t } from "./locales";

interface Preferences {
  baseURL?: string;
}

let clientInstance: BeeperDesktop | null = null;
let lastBaseURL: string | null = null;
let lastAccessToken: string | null = null;

const getPreferences = () => getPreferenceValues<Preferences>();

const createOAuthClient = () =>
  new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "Beeper Desktop",
    providerIcon: "extension-icon.png",
    providerId: "beeper-desktop-api",
    description: "Connect to your local Beeper Desktop app",
  });

const getBaseURL = () => {
  const preferences = getPreferences();
  return preferences.baseURL || "http://localhost:23373";
};

export function createBeeperOAuth() {
  const baseURL = getBaseURL();

  return new OAuthService({
    client: createOAuthClient(),
    clientId: "raycast-beeper-extension",
    scope: "read write",
    authorizeUrl: `${baseURL}/oauth/authorize`,
    tokenUrl: `${baseURL}/oauth/token`,
    refreshTokenUrl: `${baseURL}/oauth/token`,
    bodyEncoding: "url-encoded",
    onAuthorize: ({ token }) => {
      // Reset client when new token is obtained
      clientInstance = null;
      lastAccessToken = token;
    },
  });
}

/**
 * Returns a cached BeeperDesktop client, creating a new instance when the configured base URL or access token has changed.
 *
 * @returns A BeeperDesktop client configured with the current base URL and access token.
 */
export function getBeeperDesktop(): BeeperDesktop {
  const baseURL = getBaseURL();
  const { token: accessToken } = getAccessToken();

  if (!clientInstance || lastBaseURL !== baseURL || lastAccessToken !== accessToken) {
    clientInstance = new BeeperDesktop({
      accessToken,
      baseURL: baseURL,
      logLevel: "debug",
    });
    lastBaseURL = baseURL;
    lastAccessToken = accessToken;
  }

  return clientInstance;
}

/**
 * Execute an asynchronous operation using the current BeeperDesktop client and return its managed result.
 *
 * @param fn - Function that receives the current BeeperDesktop client and returns a promise for the desired value
 * @param deps - Optional React dependency list that controls when the operation is re-run
 * @returns The value produced by `fn` when executed with the current BeeperDesktop client; loading and error state are managed by the hook
 */
export function useBeeperDesktop<T>(fn: (client: BeeperDesktop) => Promise<T>, deps?: React.DependencyList) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - usePromise type overload issue with optional deps
  return usePromise(async () => fn(getBeeperDesktop()), deps);
}

export const focusApp = async (params: AppOpenParams = {}) => {
  const translations = t();
  try {
    await getBeeperDesktop().app.open(params);
    await closeMainWindow();
    await showHUD(translations.commands.focusApp.successMessage);
  } catch (error) {
    console.error("Failed to focus Beeper Desktop:", error);
    await showHUD(translations.commands.focusApp.errorMessage);
  }
};
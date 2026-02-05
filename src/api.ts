import BeeperDesktop from "@beeper/desktop-api";
import { closeMainWindow, getPreferenceValues, OAuth, showHUD } from "@raycast/api";
import { OAuthService, usePromise, getAccessToken } from "@raycast/utils";

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

export function useBeeperDesktop<T>(
  fn: (client: BeeperDesktop) => Promise<T>,
  dependencies?: React.DependencyList,
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return usePromise(async () => fn(getBeeperDesktop()), dependencies || []);
}

export const focusApp = async (params: BeeperDesktop.OpenParams = {}) => {
  try {
    await getBeeperDesktop().open(params);
    await closeMainWindow();
    await showHUD("Beeper Desktop focused");
  } catch (error) {
    console.error("Failed to focus Beeper Desktop:", error);
    await showHUD("Failed to focus Beeper Desktop");
  }
};

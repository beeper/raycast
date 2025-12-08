import { Icon, Image } from "@raycast/api";

/**
 * Maps network identifiers to their corresponding icon asset filenames.
 * These filenames are relative to the extension's assets directory.
 */
const NETWORK_ICON_MAP: Record<string, string> = {
  slack: "slack.svg",
  whatsapp: "whatsapp.svg",
  telegram: "telegram.svg",
  discord: "discord.svg",
  instagram: "instagram.svg",
  facebook: "facebook.svg",
  facebookmessenger: "messenger.svg",
  messenger: "messenger.svg",
  signal: "signal.svg",
  imessage: "imessage.svg",
  twitter: "twitter.svg",
  email: "email.svg",
  googlemessages: "google-messages.svg",
};

/**
 * Returns the icon for a messaging network.
 * Falls back to a generic message icon if the network is not recognized.
 *
 * @param network - The network name (case-insensitive, spaces/slashes/dashes are ignored)
 * @returns The corresponding network icon image
 */
export function getNetworkIcon(network: string): Image.ImageLike {
  const networkLower = network.toLowerCase().replace(/[/\s-]/g, "");
  const iconFilename = NETWORK_ICON_MAP[networkLower];

  if (iconFilename) {
    // Return an Image.Source object pointing to the asset file
    return { source: iconFilename };
  }

  return Icon.Message;
}

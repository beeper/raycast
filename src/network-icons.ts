import { Icon, Image } from "@raycast/api";

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
 * Selects an icon image that represents a messaging network.
 *
 * @param network - The network name or identifier (case-insensitive; spaces, slashes, and dashes are ignored)
 * @returns The corresponding network icon image, or a generic message icon if the network is not recognized
 */
export function getNetworkIcon(network: string): Image.ImageLike {
  const networkLower = network.toLowerCase().replace(/[/\s-]/g, "");
  return NETWORK_ICON_MAP[networkLower] || Icon.Message;
}

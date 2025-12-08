import { Image, Icon } from "@raycast/api";
import { safeAvatarPath } from "./avatar";
import { getNetworkIcon } from "./networkIcons";

/**
 * Returns chat icon - contact avatar for DMs, network icon for groups.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getChatIcon(chat: any): Image.ImageLike {
  if (!chat) return Icon.Bubble;

  // For 1:1 chats, try to get the other person's avatar
  if (chat.type !== "group" && chat.participants?.items && Array.isArray(chat.participants.items)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const otherParticipant = chat.participants.items.find((p: any) => !p.isSelf);
    if (otherParticipant?.imgURL) {
      const validatedPath = safeAvatarPath(otherParticipant.imgURL);
      if (validatedPath) {
        return { source: validatedPath, mask: Image.Mask.Circle };
      }
    }
  }
  return getNetworkIcon(chat.network);
}

import { Toast, showToast } from "@raycast/api";
import BeeperDesktop from "@beeper/desktop-api";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { formatReactionsShort } from "./reactions";

export const parseDate = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const getMessageID = (message: BeeperDesktop.Message & { messageID?: string }) =>
  message.messageID ?? message.id;

export const getSenderDisplayName = (message: BeeperDesktop.Message): string =>
  message.senderName || (message.isSender ? "You" : "Unknown");

/** Build a preview string for a message, considering text, attachments, and reactions. */
export const getMessagePreview = (message: BeeperDesktop.Message): string => {
  const text = message.text?.trim();
  if (text && text.length > 0) return text;
  const reactions = formatReactionsShort(message.reactions);
  if (reactions) return `Reacted ${reactions}`;
  if (message.attachments && message.attachments.length > 0) return "Attachment";
  return "Message";
};

export const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Show an animated toast, run `fn`, then update to success or failure. */
export async function withToast<T>(
  fn: () => Promise<T>,
  messages: { loading: string; success: string; failure: string },
): Promise<T | undefined> {
  const toast = await showToast({ style: Toast.Style.Animated, title: messages.loading });
  try {
    const result = await fn();
    toast.style = Toast.Style.Success;
    toast.title = messages.success;
    return result;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = messages.failure;
    toast.message = getErrorMessage(err);
    return undefined;
  }
}

export const getBeeperAppPath = () => {
  const candidates = ["/Applications/Beeper Desktop.app", join(homedir(), "Applications", "Beeper Desktop.app")];
  return candidates.find((path) => existsSync(path));
};

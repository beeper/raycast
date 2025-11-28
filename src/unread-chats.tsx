import { ActionPanel, Action, List, Icon, Image } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useBeeperDesktop, createBeeperOAuth, focusApp } from "./api";
import { t } from "./locales";

/**
 * Selects an icon representing a messaging network.
 *
 * The provided network name is normalized by lowercasing and removing spaces, slashes, and dashes before lookup.
 *
 * @param network - Network name (e.g., "Slack", "facebook-messenger", "Google Messages")
 * @returns The SVG filename for a known network (e.g., `"slack.svg"`, `"messenger.svg"`) or `Icon.Message` when no match exists
 */
function getNetworkIcon(network: string): Image.ImageLike {
  const networkLower = network.toLowerCase().replace(/[/\s-]/g, "");

  const iconMap: Record<string, string> = {
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

  return iconMap[networkLower] || Icon.Message;
}

/**
 * Render a Raycast list of Beeper chats that currently have unread messages.
 *
 * Displays unread chats sorted by unread count (highest first). Each list item shows the chat icon, title,
 * network, unread count, pin/mute indicators, and last activity date when available. Actions are provided to
 * open the chat in Beeper and to copy the chat ID. An empty view is shown when there are no unread chats.
 *
 * @returns A Raycast `List` element containing unread chat items with accessories and actions
 */
function UnreadChatsCommand() {
  const translations = t();
  const { data: chats = [], isLoading } = useBeeperDesktop(async (client) => {
    const allChats = [];
    for await (const chat of client.chats.search({})) {
      // Filter only chats with unread messages
      if (chat.unreadCount > 0) {
        allChats.push(chat);
      }
    }
    // Sort by unread count (highest first)
    return allChats.sort((a, b) => b.unreadCount - a.unreadCount);
  }, []);

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={translations.commands.unreadChats.searchPlaceholder}
      navigationTitle={`${translations.commands.unreadChats.navigationTitle}${totalUnread > 0 ? translations.commands.unreadChats.totalCount(totalUnread) : ""}`}
    >
      {chats.map((chat) => (
        <List.Item
          key={chat.id}
          icon={getNetworkIcon(chat.network)}
          title={chat.title || translations.common.unnamedChat}
          subtitle={chat.network}
          accessories={[
            {
              text: translations.commands.unreadChats.unreadCount(chat.unreadCount),
              icon: Icon.Bubble,
            },
            ...(chat.isPinned ? [{ icon: Icon.Pin }] : []),
            ...(chat.isMuted ? [{ icon: Icon.SpeakerOff }] : []),
            ...(chat.lastActivity ? [{ date: new Date(chat.lastActivity) }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title={translations.common.openInBeeper}
                icon={Icon.Window}
                onAction={() => focusApp({ chatID: chat.id })}
              />
              <Action.CopyToClipboard title={translations.common.copyChatId} content={chat.id} />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && chats.length === 0 && (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title={translations.commands.unreadChats.emptyTitle}
          description={translations.commands.unreadChats.emptyDescription}
        />
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(UnreadChatsCommand);
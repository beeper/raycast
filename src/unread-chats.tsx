import { ActionPanel, Action, List, Icon, Image } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useBeeperDesktop, createBeeperOAuth, focusApp } from "./api";
import { t } from "./locales";
import { getChatIcon } from "./utils/chatIcon";

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
  const {
    data: chats = [],
    isLoading,
    error,
  } = useBeeperDesktop(async (client) => {
    const allChats = [];
    let cursor: string | null = null;
    let hasMore = true;
    const MAX_PAGES = 20; // Safety limit to prevent infinite loops
    let pageCount = 0;

    // Use API's native unreadOnly filter instead of client-side filtering
    while (hasMore && pageCount < MAX_PAGES) {
      const searchParams = cursor
        ? { unreadOnly: true, limit: 50, cursor, direction: "older" as const }
        : { unreadOnly: true, limit: 50 };

      const page = await client.chats.search(searchParams);
      allChats.push(...page.items);

      cursor = page.oldestCursor;
      hasMore = page.hasMore;
      pageCount++;
    }

    // Sort by unread count (highest first)
    return allChats.sort((a, b) => b.unreadCount - a.unreadCount);
  });

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={translations.commands.unreadChats.searchPlaceholder}
      navigationTitle={`${translations.commands.unreadChats.navigationTitle}${totalUnread > 0 ? translations.commands.unreadChats.totalCount(totalUnread) : ""}`}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={translations.commands.unreadChats.errorTitle}
          description={translations.commands.unreadChats.errorDescription}
        />
      ) : !isLoading && chats.length === 0 ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title={translations.commands.unreadChats.emptyTitle}
          description={translations.commands.unreadChats.emptyDescription}
        />
      ) : (
        chats.map((chat) => (
          <List.Item
            key={chat.id}
            icon={getChatIcon(chat)}
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
        ))
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(UnreadChatsCommand);

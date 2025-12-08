import { useState } from "react";
import { ActionPanel, Detail, List, Action, Icon, Image, showToast, Toast } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useBeeperDesktop, getBeeperDesktop, createBeeperOAuth, focusApp } from "./api";
import { t } from "./locales";
import { getChatIcon } from "./utils/chatIcon";

/**
 * Render a searchable list of Beeper chats with actions to open the chat in Beeper, view details, and copy the chat ID.
 *
 * The list is populated from Beeper Desktop search results filtered by the search bar; each item shows network-specific icon, title (or a localized unnamed fallback), type, and last activity when available.
 *
 * @returns A Raycast List component populated with chat items and an empty state when no chats are found.
 */
function ListChatsCommand() {
  const translations = t();
  const [searchText, setSearchText] = useState("");
  const [chats, setChats] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { isLoading } = useBeeperDesktop(
    async (client, query) => {
      // Reset state when search changes
      setChats([]);
      setCursor(null);
      setHasMore(true);

      const searchParams = query ? { query, limit: 50 } : { limit: 50 };
      const page = await client.chats.search(searchParams);
      
      setChats(page.items);
      setCursor(page.oldestCursor);
      setHasMore(page.hasMore);

      return page.items;
    },
    [searchText],
  );

  const loadMore = async () => {
    if (!hasMore || isLoadingMore || !cursor) return;

    setIsLoadingMore(true);
    try {
      const client = getBeeperDesktop();
      const searchParams = searchText 
        ? { query: searchText, limit: 50, cursor, direction: "older" as const }
        : { limit: 50, cursor, direction: "older" as const };
      
      const page = await client.chats.search(searchParams);
      
      setChats((prev) => [...prev, ...page.items]);
      setCursor(page.oldestCursor);
      setHasMore(page.hasMore);
    } catch (error) {
      console.error("Failed to load more chats:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: translations.commands.listChats.loadMoreError || "Failed to Load More Chats",
        message: translations.commands.listChats.loadMoreErrorMessage || "Please try again",
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={translations.commands.listChats.searchPlaceholder}
      onSearchTextChange={setSearchText}
      throttle
    >
      {chats.map((chat) => (
        <List.Item
          key={chat.id}
          icon={getChatIcon(chat)}
          title={chat.title || translations.common.unnamedChat}
          subtitle={chat.network}
          accessories={[{ text: chat.type }, ...(chat.lastActivity ? [{ date: new Date(chat.lastActivity) }] : [])]}
          actions={
            <ActionPanel>
              <Action
                title={translations.common.openInBeeper}
                icon={Icon.Window}
                onAction={() => focusApp({ chatID: chat.id })}
              />
              <Action.Push
                title={translations.common.showDetails}
                icon={Icon.Info}
                target={
                  <Detail
                    markdown={`# ${chat.title || translations.common.unnamedChat}

**${translations.common.details.id}:** ${chat.id}
**${translations.common.details.accountId}:** ${chat.accountID}
**${translations.common.details.network}:** ${chat.network}
**${translations.common.details.type}:** ${chat.type}
**${translations.common.details.unreadCount}:** ${chat.unreadCount}
**${translations.common.details.isPinned}:** ${chat.isPinned ? translations.common.yes : translations.common.no}
**${translations.common.details.isMuted}:** ${chat.isMuted ? translations.common.yes : translations.common.no}
**${translations.common.details.isArchived}:** ${chat.isArchived ? translations.common.yes : translations.common.no}
**${translations.common.details.lastActivity}:** ${chat.lastActivity || translations.common.details.na}`}
                  />
                }
              />
              <Action.CopyToClipboard title={translations.common.copyChatId} content={chat.id} />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && hasMore && chats.length > 0 && (
        <List.Item
          key="load-more"
          icon={Icon.ArrowDown}
          title={isLoadingMore ? translations.commands.listChats.loading : translations.commands.listChats.loadMoreChats}
          actions={
            <ActionPanel>
              <Action title={translations.commands.listChats.loadMoreAction} icon={Icon.ArrowDown} onAction={loadMore} />
            </ActionPanel>
          }
        />
      )}
      {!isLoading && chats.length === 0 && (
        <List.EmptyView
          icon={Icon.Message}
          title={translations.commands.listChats.emptyTitle}
          description={translations.commands.listChats.emptyDescription}
        />
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(ListChatsCommand);

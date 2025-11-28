import { ActionPanel, Action, List, Icon} from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { useBeeperDesktop, createBeeperOAuth, focusApp } from "./api";
import { t } from "./locales";
import { getNetworkIcon } from "./network-icons";

/**
 * Render a search interface that finds and displays Beeper chats matching the user's query.
 *
 * Shows an initial empty view when the search box is empty, performs a client-side search as the
 * user types, and renders matching chats with network icons, unread/pinned/muted accessories, and
 * actions to open the chat in Beeper or copy its ID.
 *
 * @returns The List JSX element presenting the search bar, results, and appropriate empty states.
 */
function SearchChatsCommand() {
  const translations = t();
  const [searchText, setSearchText] = useState("");
  const { data: chats = [], isLoading } = useBeeperDesktop(
    async (client) => {
      if (!searchText) {
        return [];
      }
      const allChats = [];
      for await (const chat of client.chats.search({ query: searchText })) {
        allChats.push(chat);
      }
      return allChats;
    },
    [searchText],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={translations.commands.searchChats.searchPlaceholder}
      onSearchTextChange={setSearchText}
      throttle
    >
      {searchText === ""
        ? (
            <List.EmptyView
              icon={Icon.MagnifyingGlass}
              title={translations.commands.searchChats.emptyTitle}
              description={translations.commands.searchChats.emptyDescription}
            />
          )
        : !isLoading && chats.length === 0
        ? (
            <List.EmptyView
              icon={Icon.Message}
              title={translations.commands.searchChats.noResultsTitle}
              description={translations.commands.searchChats.noResultsDescription}
            />
          )
        : (
            chats.map((chat) => (
              <List.Item
                key={chat.id}
                icon={getNetworkIcon(chat.network)}
                title={chat.title || translations.common.unnamedChat}
                subtitle={chat.network}
                accessories={[
                  ...(chat.unreadCount > 0
                    ? [{ text: translations.commands.unreadChats.unreadCount(chat.unreadCount) }]
                    : []),
                  ...(chat.isPinned ? [{ icon: Icon.Pin }] : []),
                  ...(chat.isMuted ? [{ icon: Icon.SpeakerOff }] : []),
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

export default withAccessToken(createBeeperOAuth())(SearchChatsCommand);
import { List, Icon} from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { createBeeperOAuth, focusApp } from "./api";
import { t } from "./locales";
import { ChatListItem } from "./components/ChatListItem";
import { useChatSearch } from "./hooks/useChatSearch";

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
  const { data: chats = [], isLoading } = useChatSearch(searchText);

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
              <ChatListItem
                key={chat.id}
                chat={{
                  ...chat,
                  onOpen: () => focusApp({ chatID: chat.id }),
                }}
                translations={translations}
                accessories={[
                  ...(chat.unreadCount > 0
                    ? [{ text: translations.common.unreadCount(chat.unreadCount) }]
                    : []),
                  ...(chat.isPinned ? [{ icon: Icon.Pin }] : []),
                  ...(chat.isMuted ? [{ icon: Icon.SpeakerOff }] : []),
                ]}
                showDetails={false}
              />
            ))
          )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(SearchChatsCommand);
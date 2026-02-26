import { List, Icon } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { useState, useMemo } from "react";
import { createBeeperOAuth, focusApp, listAccounts } from "./api";
import { t } from "./locales";
import { ChatListItem } from "./components/ChatListItem";
import { useChatSearch } from "./hooks/useChatSearch";

/**
 * Returns raw avatar URL for 1:1 chats, undefined for groups.
 * Note: The URL is not sanitized here - ChatListItem handles sanitization via safeAvatarPath.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAvatarUrl(chat: any): string | undefined {
  // Only show avatar for 1:1 chats, not groups
  if (chat.type !== "group" && chat.participants?.items && Array.isArray(chat.participants.items)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const otherParticipant = chat.participants.items.find((p: any) => !p.isSelf);
    return otherParticipant?.imgURL;
  }
  return undefined;
}

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
  const { data: accounts = [] } = useCachedPromise(listAccounts, [], { keepPreviousData: true });
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.accountID, a])), [accounts]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={translations.commands.searchChats.searchPlaceholder}
      onSearchTextChange={setSearchText}
      throttle
    >
      {searchText === "" ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={translations.commands.searchChats.emptyTitle}
          description={translations.commands.searchChats.emptyDescription}
        />
      ) : !isLoading && chats.length === 0 ? (
        <List.EmptyView
          icon={Icon.Message}
          title={translations.commands.searchChats.noResultsTitle}
          description={translations.commands.searchChats.noResultsDescription}
        />
      ) : (
        chats.map((chat) => {
          const account = accountMap.get(chat.accountID);
          const accountLabel = account
            ? `${account.network || translations.commands.contacts.accountFallback} • ${
                account.user?.fullName ||
                account.user?.username ||
                account.user?.email ||
                account.user?.phoneNumber ||
                account.accountID
              }`
            : undefined;
          return (
            <ChatListItem
              key={chat.id}
              chat={{
                ...chat,
                avatarUrl: getAvatarUrl(chat),
                onOpen: () => focusApp({ chatID: chat.id }),
              }}
              translations={translations}
              accessories={[
                ...(accountLabel ? [{ tag: accountLabel }] : []),
                ...(chat.unreadCount > 0 ? [{ text: translations.common.unreadCount(chat.unreadCount) }] : []),
                ...(chat.isPinned ? [{ icon: Icon.Pin }] : []),
                ...(chat.isMuted ? [{ icon: Icon.SpeakerOff }] : []),
              ]}
              showDetails={false}
            />
          );
        })
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(SearchChatsCommand);

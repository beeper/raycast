import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { createBeeperOAuth, focusApp, searchAll } from "./api";
import { t } from "./locales";
import { getChatIcon } from "./utils/chatIcon";
import { getMessageID, parseDate } from "./utils";

function SearchAllCommand() {
  const translations = t();
  const sa = translations.commands.searchAll;

  const [searchText, setSearchText] = useState("");
  const trimmedQuery = searchText.trim();

  const { data, isLoading } = useCachedPromise(
    async (query: string) => {
      if (!query) return null;
      return searchAll({ query });
    },
    [trimmedQuery],
    { keepPreviousData: true },
  );

  // Merge chats + in_groups, deduplicate by id
  const chatMap = new Map<string, (typeof chats)[0]>();
  const chats = [...(data?.results?.chats ?? []), ...(data?.results?.in_groups ?? [])];
  for (const chat of chats) chatMap.set(chat.id, chat);
  const uniqueChats = Array.from(chatMap.values());

  const messages = data?.results?.messages?.items ?? [];

  const hasResults = uniqueChats.length > 0 || messages.length > 0;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={sa.navigationTitle}
      searchBarPlaceholder={sa.searchPlaceholder}
      onSearchTextChange={setSearchText}
      throttle
    >
      {!trimmedQuery && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title={sa.emptyTitle} description={sa.emptyDescription} />
      )}

      {trimmedQuery && !isLoading && !hasResults && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title={sa.noResultsTitle} description={sa.noResultsDescription} />
      )}

      {uniqueChats.length > 0 && (
        <List.Section title={sa.chatsSection} subtitle={String(uniqueChats.length)}>
          {uniqueChats.map((chat) => (
            <List.Item
              key={chat.id}
              icon={getChatIcon(chat)}
              title={chat.title || translations.common.unnamedChat}
              subtitle={chat.network}
              accessories={[
                ...(chat.unreadCount > 0 ? [{ text: translations.common.unreadCount(chat.unreadCount) }] : []),
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
        </List.Section>
      )}

      {messages.length > 0 && (
        <List.Section title={sa.messagesSection} subtitle={String(messages.length)}>
          {messages.map((message) => {
            const timestamp = parseDate(message.timestamp);
            const messageID = getMessageID(message);
            const text = message.text?.trim();
            const preview = text ? text : "Attachment";
            const sender = message.senderName || (message.isSender ? "You" : "Unknown");

            return (
              <List.Item
                key={message.id}
                icon={message.isSender ? { source: Icon.Person, tintColor: Color.Blue } : Icon.Message}
                title={preview}
                subtitle={sender}
                accessories={[...(timestamp ? [{ date: timestamp }] : [])]}
                actions={
                  <ActionPanel>
                    <Action
                      title={translations.common.openInBeeper}
                      icon={Icon.Window}
                      onAction={() => focusApp({ chatID: message.chatID, messageID })}
                    />
                    {message.text && (
                      <Action.CopyToClipboard
                        title={translations.common.copyMessageText}
                        content={message.text}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(SearchAllCommand);

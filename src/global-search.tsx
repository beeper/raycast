import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useState } from "react";
import type { BeeperDesktop } from "@beeper/desktop-api";
import { useBeeperDesktop, createBeeperOAuth, focusApp } from "./api";

function GlobalSearchCommand() {
  const [searchText, setSearchText] = useState("");

  const { data: searchResults, isLoading } = useBeeperDesktop(
    async (client) => {
      if (!searchText || searchText.length < 2) {
        return null;
      }

      const result = await client.search({ query: searchText });
      return result.results;
    },
    [searchText],
  );

  const chatsSection = searchResults?.chats || [];
  const inGroupsSection = searchResults?.in_groups || [];
  const messagesData = searchResults?.messages;
  const messages = messagesData?.items || [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Global search across chats and messages..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {chatsSection.length > 0 && (
        <List.Section title="Chats" subtitle={`${chatsSection.length} results`}>
          {chatsSection.map((chat) => (
            <List.Item
              key={`chat-${chat.id}`}
              icon={{
                source: chat.type === "group" ? Icon.TwoPeople : Icon.Person,
                tintColor: chat.unreadCount > 0 ? Color.Blue : Color.SecondaryText,
              }}
              title={chat.title || "Unnamed Chat"}
              subtitle={chat.network}
              accessories={[
                ...(chat.unreadCount > 0 ? [{ text: `${chat.unreadCount} unread` }] : []),
                ...(chat.isPinned ? [{ icon: Icon.Pin }] : []),
                ...(chat.isMuted ? [{ icon: Icon.SpeakerOff }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Chat in Beeper"
                    icon={Icon.Window}
                    onAction={() => focusApp({ chatID: chat.id })}
                  />
                  <Action.CopyToClipboard title="Copy Chat ID" content={chat.id} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {inGroupsSection.length > 0 && (
        <List.Section title="Groups (by participant match)" subtitle={`${inGroupsSection.length} results`}>
          {inGroupsSection.map((chat) => (
            <List.Item
              key={`group-${chat.id}`}
              icon={{ source: Icon.TwoPeople, tintColor: Color.Purple }}
              title={chat.title || "Unnamed Group"}
              subtitle={chat.network}
              accessories={[
                { text: `${chat.participants.total} members` },
                ...(chat.unreadCount > 0 ? [{ text: `${chat.unreadCount} unread` }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Group in Beeper"
                    icon={Icon.Window}
                    onAction={() => focusApp({ chatID: chat.id })}
                  />
                  <Action.CopyToClipboard title="Copy Chat ID" content={chat.id} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {messages.length > 0 && (
        <List.Section
          title="Messages"
          subtitle={`${messages.length} results${messagesData?.hasMore ? " (showing first page)" : ""}`}
        >
          {messages.map((message) => {
            const senderName = message.sender?.fullName || message.sender?.username || "Unknown";
            const messageText = message.text || "[No text content]";
            const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleString() : "";
            const chat = messagesData?.chats?.[message.chatID];
            const chatTitle = chat?.title || "Unknown Chat";

            return (
              <List.Item
                key={`message-${message.id}`}
                icon={{ source: Icon.Message, tintColor: Color.Orange }}
                title={messageText.substring(0, 80)}
                subtitle={`${senderName} in ${chatTitle}`}
                accessories={[...(timestamp ? [{ text: timestamp }] : [])]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Open Message in Beeper"
                      icon={Icon.Window}
                      onAction={() => focusApp({ chatID: message.chatID, messageID: message.id })}
                    />
                    <Action.CopyToClipboard title="Copy Message Text" content={messageText} />
                    <Action.CopyToClipboard
                      title="Copy Message ID"
                      content={message.id}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {!isLoading &&
        searchText.length >= 2 &&
        chatsSection.length === 0 &&
        inGroupsSection.length === 0 &&
        messages.length === 0 && (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="No results found"
            description="Try a different search query"
          />
        )}

      {!isLoading && searchText.length < 2 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Global Search"
          description="Type at least 2 characters to search across chats and messages"
        />
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(GlobalSearchCommand);

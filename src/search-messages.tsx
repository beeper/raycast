import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useState } from "react";
import type { BeeperDesktop } from "@beeper/desktop-api";
import { useBeeperDesktop, createBeeperOAuth, focusApp } from "./api";

function SearchMessagesCommand() {
  const [searchText, setSearchText] = useState("");
  const [chatTypeFilter, setChatTypeFilter] = useState<"all" | "single" | "group">("all");
  const [senderFilter, setSenderFilter] = useState<"all" | "me" | "others">("all");

  const { data: messages = [], isLoading } = useBeeperDesktop(async (client) => {
    if (!searchText) return [];

    const params: BeeperDesktop.MessageSearchParams = {
      query: searchText,
      limit: 50,
    };

    if (chatTypeFilter !== "all") {
      params.chatType = chatTypeFilter;
    }

    if (senderFilter !== "all") {
      params.sender = senderFilter;
    }

    const result = await client.messages.search(params);
    // Collect all items from the cursor
    const items = [];
    for await (const item of result) {
      items.push(item);
    }
    return items;
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search messages..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={chatTypeFilter} onChange={(value) => setChatTypeFilter(value as any)}>
          <List.Dropdown.Item title="All Chats" value="all" />
          <List.Dropdown.Item title="Direct Messages" value="single" />
          <List.Dropdown.Item title="Group Chats" value="group" />
        </List.Dropdown>
      }
    >
      {messages.map((message) => {
        const senderName = message.sender?.fullName || message.sender?.username || "Unknown";
        const messageText = message.text || "[No text content]";
        const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleString() : "";

        return (
          <List.Item
            key={message.id}
            icon={{ source: Icon.Message, tintColor: Color.Blue }}
            title={messageText.substring(0, 100)}
            subtitle={senderName}
            accessories={[
              ...(timestamp ? [{ text: timestamp }] : []),
              ...(message.chatID ? [{ icon: Icon.Bubble }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Open Chat in Beeper"
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
      {!isLoading && messages.length === 0 && searchText && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No messages found"
          description="Try a different search query"
        />
      )}
      {!isLoading && !searchText && (
        <List.EmptyView icon={Icon.Message} title="Search Messages" description="Start typing to search messages" />
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(SearchMessagesCommand);

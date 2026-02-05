import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useState } from "react";
import type { BeeperDesktop } from "@beeper/desktop-api";
import { useBeeperDesktop, createBeeperOAuth, focusApp } from "./api";

function FindChatCommand() {
  const [searchText, setSearchText] = useState("");
  const [chatTypeFilter, setChatTypeFilter] = useState<"any" | "single" | "group">("any");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data: chats = [], isLoading } = useBeeperDesktop(
    async (client) => {
      if (!searchText) return [];

      const params: BeeperDesktop.ChatSearchParams = {
        query: searchText,
        limit: 50,
      };

      if (chatTypeFilter !== "any") {
        params.type = chatTypeFilter;
      }

      if (unreadOnly) {
        params.unreadOnly = true;
      }

      const result = await client.chats.search(params);
      // Collect all items from the cursor
      const items = [];
      for await (const item of result) {
        items.push(item);
      }
      return items;
    },
    [searchText, chatTypeFilter, unreadOnly],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search chats..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={chatTypeFilter} onChange={(value) => setChatTypeFilter(value as any)}>
          <List.Dropdown.Item title="All Chats" value="any" />
          <List.Dropdown.Item title="Direct Messages" value="single" />
          <List.Dropdown.Item title="Group Chats" value="group" />
        </List.Dropdown>
      }
    >
      {chats.map((chat) => (
        <List.Item
          key={chat.id}
          icon={{
            source: chat.type === "group" ? Icon.TwoPeople : Icon.Person,
            tintColor: chat.unreadCount > 0 ? Color.Blue : Color.SecondaryText,
          }}
          title={chat.title || "Unnamed Chat"}
          subtitle={chat.network}
          accessories={[
            ...(chat.unreadCount > 0 ? [{ text: `${chat.unreadCount} unread`, icon: Icon.Circle }] : []),
            ...(chat.isPinned ? [{ icon: Icon.Pin, tooltip: "Pinned" }] : []),
            ...(chat.isMuted ? [{ icon: Icon.SpeakerOff, tooltip: "Muted" }] : []),
            ...(chat.isArchived ? [{ icon: Icon.Box, tooltip: "Archived" }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action title="Open Chat in Beeper" icon={Icon.Window} onAction={() => focusApp({ chatID: chat.id })} />
              <Action.CopyToClipboard title="Copy Chat ID" content={chat.id} />
              <Action
                title={unreadOnly ? "Show All Chats" : "Show Only Unread"}
                icon={unreadOnly ? Icon.Eye : Icon.EyeDisabled}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
                onAction={() => setUnreadOnly(!unreadOnly)}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && chats.length === 0 && searchText && (
        <List.EmptyView
          icon={Icon.Message}
          title="No chats found"
          description="Try changing your search or filters"
        />
      )}
      {!isLoading && !searchText && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Find Chats" description="Start typing to search for chats" />
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(FindChatCommand);

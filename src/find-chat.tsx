import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { useBeeperDesktop, createBeeperOAuth, focusApp } from "./api";

function FindChatCommand() {
  const [searchText, setSearchText] = useState("");
  const { data: chats = [], isLoading } = useBeeperDesktop(async (client) => {
    const params = searchText.trim() === "" ? {} : { query: searchText };
    const result = await client.chats.search(params);
    return result.items || [];
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search chats..." onSearchTextChange={setSearchText} throttle>
      {chats.map((chat) => (
        <List.Item
          key={chat.id}
          icon={Icon.Message}
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
      {!isLoading && chats.length === 0 && (
        <List.EmptyView
          icon={Icon.Message}
          title="No chats found"
          description="Try changing your search or ensure Beeper Desktop is running"
        />
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(FindChatCommand);

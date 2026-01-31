import { useState } from "react";
import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useBeeperDesktop, createBeeperOAuth } from "./api";

function SearchChatsCommand() {
  const [searchText, setSearchText] = useState("");
  const { data: chats = [], isLoading } = useBeeperDesktop(async (client) => {
    const result = await client.chats.search({ query: searchText });
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
          accessories={[{ text: chat.type }, chat.lastActivity ? { date: new Date(chat.lastActivity) } : {}].filter(
            Boolean,
          )}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                target={
                  <Detail
                    markdown={`# ${chat.title}

**ID:** ${chat.id}
**Account ID:** ${chat.accountID}
**Network:** ${chat.network}
**Type:** ${chat.type}
**Unread Count:** ${chat.unreadCount}
**Pinned:** ${chat.isPinned ? "Yes" : "No"}
**Muted:** ${chat.isMuted ? "Yes" : "No"}
**Archived:** ${chat.isArchived ? "Yes" : "No"}
**Last Activity:** ${chat.lastActivity || "N/A"}

${chat.lastActivity ? `**Last Activity:** ${chat.lastActivity}` : "No activity yet"}`}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && chats.length === 0 && (
        <List.EmptyView
          icon={Icon.Message}
          title="No chats found"
          description="Try adjusting your search or make sure Beeper Desktop is running"
        />
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(SearchChatsCommand);

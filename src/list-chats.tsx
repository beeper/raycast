import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useBeeperDesktop, createBeeperOAuth, focusApp } from "./api";

function ListChatsCommand() {
  const {
    data: chats,
    isLoading,
    revalidate,
  } = useBeeperDesktop(async (client) => {
    const result = await client.chats.search();
    console.log("Fetched accounts:", JSON.stringify(result, null, 2));
    return result.items || [];
  });

  return (
    <List isLoading={isLoading} navigationTitle="Beeper Chats">
      {(chats || []).map((chat) => (
        <List.Item
          key={chat.id}
          icon={Icon.Person}
          title={chat.title || "Unnamed Chat"}
          subtitle={chat.network}
          accessories={[
            ...(chat.unreadCount > 0 ? [{ text: `${chat.unreadCount} unread` }] : []),
            ...(chat.isPinned ? [{ icon: Icon.Pin }] : []),
            ...(chat.isMuted ? [{ icon: Icon.SpeakerOff }] : []),
            ...(chat.isArchived ? [{ icon: Icon.AddPerson }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                target={
                  <Detail
                    markdown={`# ${chat.title || "Chat"}

**Chat ID:** ${chat.id}
**Account ID:** ${chat.accountID}
**Network:** ${chat.network}
**Type:** ${chat.type}
**Unread Count:** ${chat.unreadCount}
**Pinned:** ${chat.isPinned ? "Yes" : "No"}
**Muted:** ${chat.isMuted ? "Yes" : "No"}
**Archived:** ${chat.isArchived ? "Yes" : "No"}
**Last Activity:** ${chat.lastActivity || "N/A"}
`}
                  />
                }
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => revalidate()}
              />
              <Action
                title="Focus Beeper Desktop"
                icon={Icon.Window}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={() => focusApp()}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && (!chats || chats.length === 0) && (
        <List.EmptyView
          icon={Icon.Person}
          title="No chats found"
          description="Make sure Beeper Desktop is running and you're authenticated"
        />
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(ListChatsCommand);

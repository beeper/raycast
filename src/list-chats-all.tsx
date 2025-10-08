import { ActionPanel, List, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useState } from "react";
import type { BeeperDesktop } from "@beeper/desktop-api";
import { useBeeperDesktop, createBeeperOAuth, focusApp, getBeeperDesktop } from "./api";

function ListChatsAllCommand() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [accountFilter, setAccountFilter] = useState<string>("all");

  const {
    data: chats = [],
    isLoading,
    error,
  } = useBeeperDesktop(
    async (client) => {
      const params: BeeperDesktop.ChatListParams = {
        limit: 100,
      };

      if (accountFilter !== "all") {
        params.accountIDs = [accountFilter];
      }

      const result = await client.chats.list(params);
      return result.data;
    },
    [refreshTrigger, accountFilter],
  );

  const { data: accounts = [] } = useBeeperDesktop(async (client) => {
    const result = await client.accounts.list();
    return result;
  });

  const archiveChat = async (chatID: string, archived: boolean) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: archived ? "Archiving chat..." : "Unarchiving chat...",
    });

    try {
      await getBeeperDesktop().chats.archive(chatID, { archived });

      toast.style = Toast.Style.Success;
      toast.title = archived ? "Chat archived" : "Chat unarchived";

      setRefreshTrigger((n) => n + 1);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = archived ? "Failed to archive chat" : "Failed to unarchive chat";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search chats..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Account" value={accountFilter} onChange={setAccountFilter}>
          <List.Dropdown.Item title="All Accounts" value="all" />
          {accounts.map((account) => (
            <List.Dropdown.Item
              key={account.accountID}
              title={account.user?.fullName || account.network || account.accountID}
              value={account.accountID}
            />
          ))}
        </List.Dropdown>
      }
    >
      {chats.map((chat) => {
        const lastMessage = "preview" in chat ? chat.preview : null;
        const lastMessageText = lastMessage?.text || "No messages";
        const lastActivity = chat.lastActivity ? new Date(chat.lastActivity).toLocaleString() : "";

        return (
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
              ...(lastActivity ? [{ text: lastActivity }] : []),
            ]}
            detail={
              <List.Item.Detail
                markdown={lastMessageText}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Chat ID" text={chat.id} />
                    <List.Item.Detail.Metadata.Label title="Network" text={chat.network} />
                    <List.Item.Detail.Metadata.Label title="Type" text={chat.type} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Participants"
                      text={`${chat.participants.total} (showing ${chat.participants.items.length})`}
                    />
                    {chat.participants.items.slice(0, 5).map((participant, idx) => (
                      <List.Item.Detail.Metadata.Label
                        key={idx}
                        title={`  ${participant.fullName || participant.username || "Unknown"}`}
                        text={participant.email || ""}
                      />
                    ))}
                    {chat.participants.hasMore && (
                      <List.Item.Detail.Metadata.Label title="  ..." text="and more" />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action title="Open Chat in Beeper" icon={Icon.Window} onAction={() => focusApp({ chatID: chat.id })} />
                <Action.CopyToClipboard title="Copy Chat ID" content={chat.id} />
                {chat.isArchived ? (
                  <Action
                    title="Unarchive Chat"
                    icon={Icon.Tray}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    onAction={() => archiveChat(chat.id, false)}
                  />
                ) : (
                  <Action
                    title="Archive Chat"
                    icon={Icon.Box}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    onAction={() => archiveChat(chat.id, true)}
                  />
                )}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => setRefreshTrigger((n) => n + 1)}
                />
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && chats.length === 0 && (
        <List.EmptyView
          icon={error ? Icon.Warning : Icon.Message}
          title={error ? "Failed to Load Chats" : "No chats found"}
          description={
            error
              ? "Could not load chats. Make sure Beeper Desktop is running and the API is enabled."
              : "Make sure Beeper Desktop is running and you have some chats"
          }
        />
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(ListChatsAllCommand);

import { ActionPanel, Action, List, Icon, showToast, Toast } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { archiveChat, createBeeperOAuth, focusApp, useBeeperDesktop } from "./api";
import { ComposeMessageForm } from "./chat";
import { t } from "./locales";
import { getChatIcon } from "./utils/chatIcon";

function UnreadChatsCommand() {
  const translations = t();
  const u = translations.commands.unreadChats;

  const {
    data: chats = [],
    isLoading,
    error,
    revalidate,
  } = useBeeperDesktop(async (client) => {
    const allChats = [];
    let cursor: string | null = null;
    let hasMore = true;
    const MAX_PAGES = 20;
    let pageCount = 0;

    while (hasMore && pageCount < MAX_PAGES) {
      const searchParams = cursor
        ? { unreadOnly: true, limit: 50, cursor, direction: "older" as const }
        : { unreadOnly: true, limit: 50 };

      const page = await client.chats.search(searchParams);
      allChats.push(...page.items);

      cursor = page.oldestCursor;
      hasMore = page.hasMore;
      pageCount++;
    }

    return allChats.sort((a, b) => b.unreadCount - a.unreadCount);
  });

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  const handleArchive = async (chatID: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: u.archiveAction });
    try {
      await archiveChat(chatID, true);
      toast.style = Toast.Style.Success;
      toast.title = u.archiveSuccess;
      revalidate();
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = u.archiveError;
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={u.searchPlaceholder}
      navigationTitle={`${u.navigationTitle}${totalUnread > 0 ? u.totalCount(totalUnread) : ""}`}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={u.errorTitle}
          description={u.errorDescription}
        />
      ) : !isLoading && chats.length === 0 ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title={u.emptyTitle}
          description={u.emptyDescription}
        />
      ) : (
        chats.map((chat) => (
          <List.Item
            key={chat.id}
            icon={getChatIcon(chat)}
            title={chat.title || translations.common.unnamedChat}
            subtitle={chat.network}
            accessories={[
              { text: u.unreadCount(chat.unreadCount), icon: Icon.Bubble },
              ...(chat.isPinned ? [{ icon: Icon.Pin }] : []),
              ...(chat.isMuted ? [{ icon: Icon.SpeakerOff }] : []),
              ...(chat.lastActivity ? [{ date: new Date(chat.lastActivity) }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={translations.common.openInBeeper}
                  icon={Icon.Window}
                  onAction={() => focusApp({ chatID: chat.id })}
                />
                <Action.Push
                  title={u.quickReplyAction}
                  icon={Icon.Reply}
                  target={<ComposeMessageForm chat={chat} />}
                />
                <Action
                  title={u.archiveAction}
                  icon={Icon.Tray}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  onAction={() => handleArchive(chat.id)}
                />
                <Action.CopyToClipboard title={translations.common.copyChatId} content={chat.id} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(UnreadChatsCommand);

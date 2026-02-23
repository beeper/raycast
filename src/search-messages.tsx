import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise, useCachedState, withAccessToken } from "@raycast/utils";
import BeeperDesktop from "@beeper/desktop-api";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createBeeperOAuth,
  focusApp,
  listChatMessages,
  retrieveChat,
  getRaycastFocusLink,
  searchChats,
  searchMessages,
  useBeeperDesktop,
} from "./api";
import { ChatThread, ComposeMessageForm, toApiInbox, type ChatFilters, type InboxFilter, type ChatTypeFilter } from "./chat";

type SenderFilter = "any" | "me" | "others";

interface MessageFilters extends ChatFilters {
  sender: SenderFilter;
}

type SearchMessagesLaunchContext = {
  chatID?: string;
  query?: string;
  sender?: SenderFilter;
};

const defaultFilters: MessageFilters = {
  inbox: "inbox",
  type: "any",
  unreadOnly: false,
  sender: "any",
  includeMuted: true,
};

const parseDate = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const getMessageID = (message: BeeperDesktop.Message & { messageID?: string }) => message.messageID ?? message.id;

/** Compact emoji-only summary like "👍 ❤️". */
const formatReactionsShort = (reactions?: BeeperDesktop.Reaction[]): string | undefined => {
  if (!reactions || reactions.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const r of reactions) {
    counts.set(r.reactionKey, (counts.get(r.reactionKey) ?? 0) + 1);
  }
  return [...counts.entries()].map(([key, n]) => (n > 1 ? `${key}${n}` : key)).join(" ");
};

/** Detailed summary grouped by sender like "Alice 👍❤️, Bob 😂". */
const formatReactionsDetailed = (
  reactions?: BeeperDesktop.Reaction[],
  nameMap?: Map<string, string>,
): { text: string; entries: { name: string; emojis: string }[] } | undefined => {
  if (!reactions || reactions.length === 0) return undefined;
  const bySender = new Map<string, string[]>();
  for (const r of reactions) {
    const key = r.participantID;
    const list = bySender.get(key) ?? [];
    list.push(r.reactionKey);
    bySender.set(key, list);
  }
  const entries = [...bySender.entries()].map(([id, emojis]) => ({
    name: nameMap?.get(id) ?? id,
    emojis: emojis.join(""),
  }));
  return {
    text: entries.map((e) => `${e.emojis} ${e.name}`).join(", "),
    entries,
  };
};

const getBeeperAppPath = () => {
  const candidates = ["/Applications/Beeper Desktop.app", join(homedir(), "Applications", "Beeper Desktop.app")];
  return candidates.find((path) => existsSync(path));
};

function SearchMessagesCommand(props: LaunchProps<{ launchContext?: SearchMessagesLaunchContext }>) {
  const initialQuery = props.launchContext?.query ?? "";
  const [searchText, setSearchText] = useState(initialQuery);
  const [rawFilters, setFilters] = useCachedState<MessageFilters>("messages:filters:v2", defaultFilters);
  const filters = { ...defaultFilters, ...rawFilters };
  const [isShowingDetail, setIsShowingDetail] = useCachedState<boolean>("messages:showing-detail", false);
  const [dateAfter, setDateAfter] = useCachedState<string | undefined>("messages:date-after", undefined);
  const [dateBefore, setDateBefore] = useCachedState<string | undefined>("messages:date-before", undefined);
  const chatIDFilter = props.launchContext?.chatID;
  const beeperAppPath = getBeeperAppPath();
  const appliedContext = useRef(false);

  useEffect(() => {
    if (appliedContext.current) return;
    if (!props.launchContext) return;
    appliedContext.current = true;
    setFilters((prev) => ({
      ...prev,
      sender: props.launchContext?.sender ?? prev.sender,
    }));
    if (props.launchContext.query) {
      setSearchText(props.launchContext.query);
    }
  }, [props.launchContext, setFilters]);

  const trimmedQuery = searchText.trim();

  // Always resolve chat IDs through searchChats so message results stay consistent
  // with what Recent Chats shows for the same filters.
  const chatFilterParams = useMemo(
    () => ({
      inbox: toApiInbox(filters.inbox),
      type: filters.type !== "any" ? (filters.type as "single" | "group") : undefined,
      includeMuted: filters.includeMuted,
      unreadOnly: filters.unreadOnly || undefined,
    }),
    [filters.inbox, filters.type, filters.includeMuted, filters.unreadOnly],
  );

  const { data: inboxChatIDs, isLoading: isLoadingChats } = useCachedPromise(
    async (params: typeof chatFilterParams) => {
      const ids: string[] = [];
      let cursor: string | null | undefined;
      for (let page = 0; page < 5 && ids.length < 200; page++) {
        const result = await searchChats({
          ...params,
          cursor,
          direction: cursor ? "before" : undefined,
        });
        ids.push(...result.items.map((c) => c.id));
        if (!result.hasMore || !result.oldestCursor || result.items.length === 0) break;
        cursor = result.oldestCursor;
      }
      return ids;
    },
    [chatFilterParams],
    { keepPreviousData: true },
  );

  const resolvedChatIDs = chatIDFilter ? [chatIDFilter] : inboxChatIDs;

  const messageParams = useMemo(() => {
    const next: Parameters<typeof searchMessages>[0] = {
      includeMuted: filters.includeMuted,
      chatType: filters.type !== "any" ? filters.type : undefined,
      sender: filters.sender !== "any" ? filters.sender : undefined,
      query: trimmedQuery.length > 0 ? trimmedQuery : undefined,
      chatIDs: resolvedChatIDs,
      dateAfter,
      dateBefore,
      limit: 20,
    };

    return next;
  }, [resolvedChatIDs, dateAfter, dateBefore, filters.includeMuted, filters.sender, filters.type, trimmedQuery]);

  // Don't fetch messages until chat IDs are resolved
  const canFetchMessages = chatIDFilter ? true : inboxChatIDs !== undefined && inboxChatIDs.length > 0;

  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    revalidate,
    error,
  } = useCachedPromise(
    async (input: Parameters<typeof searchMessages>[0]) => {
      const maxMessages = 60;
      const allItems: BeeperDesktop.Message[] = [];
      let cursor: string | null | undefined;

      while (allItems.length < maxMessages) {
        const result = await searchMessages({ ...input, cursor, direction: cursor ? "before" : undefined });
        const items = result.items ?? [];
        allItems.push(...items);
        if (!result.hasMore || !result.oldestCursor || items.length === 0) break;
        cursor = result.oldestCursor;
      }

      return allItems;
    },
    [messageParams],
    { execute: canFetchMessages, keepPreviousData: true },
  );

  const isLoading = isLoadingChats || isLoadingMessages;

  const chatIDs = useMemo(() => Array.from(new Set(messages.map((message) => message.chatID))), [messages]);
  const { data: chatMeta = {} } = useCachedPromise(
    async (ids: string[]) => {
      if (ids.length === 0) return {};
      const entries = await Promise.all(
        ids.slice(0, 20).map(async (chatID) => {
          try {
            const chat = await retrieveChat(chatID, { maxParticipantCount: 0 });
            return [chatID, { title: chat.title || chatID, localChatID: chat.localChatID }] as const;
          } catch {
            return [chatID, { title: chatID }] as const;
          }
        }),
      );
      return Object.fromEntries(entries);
    },
    [chatIDs],
    { keepPreviousData: true, execute: chatIDs.length > 0 },
  );

  // Enrich search results with reactions from the chat messages endpoint
  const messageIDs = useMemo(() => new Set(messages.map((m) => m.id)), [messages]);
  const { data: reactionsMap = {} } = useCachedPromise(
    async (ids: string[], msgIDs: Set<string>) => {
      if (ids.length === 0) return {};
      const map: Record<string, BeeperDesktop.Reaction[]> = {};
      await Promise.all(
        ids.slice(0, 20).map(async (chatID) => {
          try {
            const result = await listChatMessages(chatID);
            for (const msg of result.items ?? []) {
              if (msg.reactions?.length && msgIDs.has(msg.id)) {
                map[msg.id] = msg.reactions;
              }
            }
          } catch {
            // ignore – reactions are best-effort
          }
        }),
      );
      return map;
    },
    [chatIDs, messageIDs],
    { keepPreviousData: true, execute: chatIDs.length > 0 },
  );

  const updateFilters = (partial: Partial<MessageFilters>) =>
    setFilters((prev) => ({
      ...prev,
      ...partial,
    }));

  const inboxDropdown = (
    <List.Dropdown
      tooltip="Inbox"
      value={filters.inbox}
      onChange={(value) => setFilters((prev) => ({ ...prev, inbox: value as InboxFilter }))}
    >
      <List.Dropdown.Item title="All" value="all" />
      <List.Dropdown.Item title="Inbox" value="inbox" />
      <List.Dropdown.Item title="Low Priority" value="low-priority" />
      <List.Dropdown.Item title="Archive" value="archive" />
    </List.Dropdown>
  );

  // Build a participant name lookup from message senders
  const nameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const msg of messages) {
      if (msg.senderName) map.set(msg.senderID, msg.senderName);
    }
    return map;
  }, [messages]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Recent Messages"
      searchBarPlaceholder="Search recent messages"
      onSearchTextChange={setSearchText}
      searchBarAccessory={inboxDropdown}
      isShowingDetail={isShowingDetail}
      throttle
    >
      {messages
        .filter((m) => !!(m.text?.trim()) || (m.attachments && m.attachments.length > 0))
        .map((message) => {
          const text = message.text?.trim();
          const preview = text && text.length > 0 ? text : "Attachment";
          const enrichedReactions = reactionsMap[message.id] ?? message.reactions;
          const reactionsShort = formatReactionsShort(enrichedReactions);
          const reactionsDetailed = formatReactionsDetailed(enrichedReactions, nameMap);
          const timestamp = parseDate(message.timestamp);
          const chatInfo = (chatMeta as Record<string, { title?: string; localChatID?: string }>)[message.chatID];
          const chatTitle = chatInfo?.title;
          const sender = message.senderName || (message.isSender ? "You" : "Unknown");
          const subtitle = chatTitle ? `${chatTitle} • ${sender}` : sender;
          const messageID = getMessageID(message);
          const messageLink = getRaycastFocusLink({ chatID: message.chatID, messageID });

          return (
            <List.Item
              key={message.id}
              icon={message.isSender ? { source: Icon.Person, tintColor: Color.Blue } : Icon.Message}
              title={preview}
              subtitle={subtitle}
              detail={
                isShowingDetail ? (
                  <List.Item.Detail
                    markdown={`**${sender}**\n\n${message.text || "—"}`}
                    metadata={
                      <List.Item.Detail.Metadata>
                        {reactionsDetailed && (
                          <List.Item.Detail.Metadata.TagList title="Reactions">
                            {reactionsDetailed.entries.map((e) => (
                              <List.Item.Detail.Metadata.TagList.Item key={e.name} text={`${e.emojis} ${e.name}`} />
                            ))}
                          </List.Item.Detail.Metadata.TagList>
                        )}
                        <List.Item.Detail.Metadata.Label title="Message ID" text={messageID} />
                        <List.Item.Detail.Metadata.Label title="Chat ID" text={message.chatID} />
                        <List.Item.Detail.Metadata.Label title="Timestamp" text={message.timestamp || "N/A"} />
                        {message.isSender && (
                          <List.Item.Detail.Metadata.TagList title="Status">
                            <List.Item.Detail.Metadata.TagList.Item text="Sent by Me" color={Color.Blue} />
                          </List.Item.Detail.Metadata.TagList>
                        )}
                      </List.Item.Detail.Metadata>
                    }
                  />
                ) : null
              }
              accessories={[
                ...(reactionsShort ? [{ tag: { value: reactionsShort, color: Color.SecondaryText } }] : []),
                ...(timestamp ? [{ date: timestamp }] : []),
              ]}
              actions={
                <MessageSearchActions
                  message={message}
                  messageID={messageID}
                  messageLink={messageLink}
                  chatTitle={chatTitle}
                  onRefresh={revalidate}
                  filters={filters}
                  updateFilters={updateFilters}
                  isShowingDetail={isShowingDetail}
                  onToggleDetail={() => setIsShowingDetail((prev) => !prev)}
                  dateAfter={dateAfter}
                  dateBefore={dateBefore}
                  setDateAfter={setDateAfter}
                  setDateBefore={setDateBefore}
                />
              }
            />
          );
        })}
      {!isLoading && messages.length === 0 && (
        <List.EmptyView
          icon={error ? Icon.Warning : Icon.MagnifyingGlass}
          title={error ? "Failed to Load Messages" : "No Messages Found"}
          description={
            error
              ? "Make sure Beeper Desktop is running and the API is enabled."
              : "Try adjusting your filters or search query."
          }
          actions={
            error ? (
              <ActionPanel>
                {beeperAppPath && <Action.Open title="Open Beeper" target={beeperAppPath} />}
                <Action
                  title="Open Extension Preferences"
                  icon={Icon.Gear}
                  onAction={() => openExtensionPreferences()}
                />
              </ActionPanel>
            ) : null
          }
        />
      )}
    </List>
  );
}

function MessageSearchActions({
  message,
  messageID,
  messageLink,
  chatTitle,
  onRefresh,
  filters,
  updateFilters,
  isShowingDetail,
  onToggleDetail,
  dateAfter,
  dateBefore,
  setDateAfter,
  setDateBefore,
}: {
  message: BeeperDesktop.Message;
  messageID: string;
  messageLink?: string;
  chatTitle?: string;
  onRefresh: () => void;
  filters: MessageFilters;
  updateFilters: (partial: Partial<MessageFilters>) => void;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  dateAfter?: string;
  dateBefore?: string;
  setDateAfter: (value?: string) => void;
  setDateBefore: (value?: string) => void;
}) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Open">
        <Action
          title="Open in Beeper"
          icon={Icon.Window}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => focusApp({ chatID: message.chatID, messageID: messageID })}
        />
        <Action title="Open Chat in Beeper" icon={Icon.Message} onAction={() => focusApp({ chatID: message.chatID })} />
        {messageLink && (
          <Action.CreateQuicklink
            title="Create Message Quicklink"
            quicklink={{ link: messageLink, name: `Message in ${chatTitle || "Beeper"}` }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Message">
        <Action.Push
          title="Open Chat"
          icon={Icon.Message}
          target={<ChatThreadById chatID={message.chatID} fallbackTitle={chatTitle} />}
        />
        <Action.Push
          title="Reply to Message"
          icon={Icon.ArrowDown}
          target={<ComposeMessageById chatID={message.chatID} replyToMessageID={messageID} />}
        />
        <Action
          title={isShowingDetail ? "Hide Previews" : "Show Previews"}
          icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onAction={onToggleDetail}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        {message.text && <Action.CopyToClipboard title="Copy Message Text" content={message.text} />}
        {message.text && <Action.Paste title="Paste Message Text" content={message.text} />}
        {message.text && (
          <Action.CreateSnippet
            title="Save Message as Snippet"
            snippet={{ text: message.text, name: message.text.slice(0, 50) }}
          />
        )}
        <Action.CopyToClipboard title="Copy Message ID" content={messageID} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Tools">
        <Action.Push title="Show Details" icon={Icon.Info} target={<MessageDetail message={message} />} />
        <Action
          title="Refresh Search"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRefresh}
        />
      </ActionPanel.Section>
      <ActionPanel.Submenu title="Filters" icon={Icon.Filter}>
        <Action
          title={`Unread Only: ${filters.unreadOnly ? "On" : "Off"}`}
          icon={filters.unreadOnly ? Icon.Checkmark : Icon.Circle}
          onAction={() => updateFilters({ unreadOnly: !filters.unreadOnly })}
        />
        <Action
          title={`Include Muted: ${filters.includeMuted ? "On" : "Off"}`}
          icon={filters.includeMuted ? Icon.Checkmark : Icon.Circle}
          onAction={() => updateFilters({ includeMuted: !filters.includeMuted })}
        />
        <Action title="Sender: Any" onAction={() => updateFilters({ sender: "any" })} />
        <Action title="Sender: Me" onAction={() => updateFilters({ sender: "me" })} />
        <Action title="Sender: Others" onAction={() => updateFilters({ sender: "others" })} />
        <Action title="Type: Any" onAction={() => updateFilters({ type: "any" })} />
        <Action title="Type: Direct Messages" onAction={() => updateFilters({ type: "single" })} />
        <Action title="Type: Group Chats" onAction={() => updateFilters({ type: "group" })} />
        <Action.PickDate
          title={dateAfter ? `After: ${dateAfter}` : "Filter After…"}
          type={Action.PickDate.Type.Date}
          onChange={(date) => setDateAfter(date ? date.toISOString() : undefined)}
        />
        <Action.PickDate
          title={dateBefore ? `Before: ${dateBefore}` : "Filter Before…"}
          type={Action.PickDate.Type.Date}
          onChange={(date) => setDateBefore(date ? date.toISOString() : undefined)}
        />
        {(dateAfter || dateBefore) && (
          <Action
            title="Clear Date Filters"
            icon={Icon.XMarkCircle}
            onAction={() => {
              setDateAfter(undefined);
              setDateBefore(undefined);
            }}
          />
        )}
      </ActionPanel.Submenu>
    </ActionPanel>
  );
}

function ChatThreadById({ chatID, fallbackTitle }: { chatID: string; fallbackTitle?: string }) {
  const {
    data: chat,
    isLoading,
    error,
  } = useBeeperDesktop(async () => {
    return retrieveChat(chatID, { maxParticipantCount: 0 });
  });

  if (isLoading) {
    return <List isLoading navigationTitle={fallbackTitle || "Chat"} />;
  }

  if (!chat || error) {
    return <Detail markdown="Failed to load chat details." />;
  }

  return <ChatThread chat={chat} />;
}

function ComposeMessageById({ chatID, replyToMessageID }: { chatID: string; replyToMessageID?: string }) {
  const {
    data: chat,
    isLoading,
    error,
  } = useBeeperDesktop(async () => {
    return retrieveChat(chatID, { maxParticipantCount: 0 });
  });

  if (isLoading) {
    return <Detail isLoading markdown="Loading chat…" />;
  }

  if (!chat || error) {
    return <Detail markdown="Failed to load chat details." />;
  }

  return <ComposeMessageForm chat={chat} replyToMessageID={replyToMessageID} />;
}

function MessageDetail({ message }: { message: BeeperDesktop.Message }) {
  const messageID = getMessageID(message);
  return (
    <Detail
      markdown={`# Message from ${message.senderName || (message.isSender ? "You" : "Unknown")}\n\n**Message ID:** ${
        messageID
      }\n**Timestamp:** ${message.timestamp || "N/A"}\n**Text:**\n${message.text || "—"}\n`}
    />
  );
}

export default withAccessToken(createBeeperOAuth())(SearchMessagesCommand);

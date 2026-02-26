import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useLocalStorage, withAccessToken } from "@raycast/utils";
import Fuse from "fuse.js";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildSearchFields,
  ChatIndexState,
  ComposeMessageForm,
  defaultIndexState,
  IndexedChat,
  summarizeChatForIndex,
} from "./chat";
import { createBeeperOAuth, searchChats } from "./api";
import { t } from "./locales";
import { parseDate } from "./utils";

const CHAT_INDEX_KEY = "chat:index:v2";

function SendMessageCommand() {
  const translations = t();
  const sm = translations.commands.sendMessage;

  const [searchText, setSearchText] = useState("");
  const { value: indexState = defaultIndexState, setValue: setIndexState } = useLocalStorage<ChatIndexState>(
    CHAT_INDEX_KEY,
    defaultIndexState,
  );
  const refreshDone = useRef(false);
  const indexRef = useRef(indexState);
  indexRef.current = indexState;

  // Background refresh on mount — updates the index without blocking the UI
  useEffect(() => {
    if (refreshDone.current) return;
    refreshDone.current = true;

    searchChats({ includeMuted: true, type: "any" })
      .then((result) => {
        if (result.items.length === 0) return;
        const newItems: IndexedChat[] = result.items.map((chat) => ({
          chat: summarizeChatForIndex(chat),
          inbox: chat.isArchived ? ("archive" as const) : ("inbox" as const),
          searchFields: buildSearchFields(chat),
        }));
        const base = indexRef.current ?? defaultIndexState;
        const map = new Map<string, IndexedChat>();
        for (const item of base.items) map.set(item.chat.id, item);
        for (const item of newItems) map.set(item.chat.id, item);
        void setIndexState({ ...base, items: Array.from(map.values()), updatedAt: Date.now() });
      })
      .catch(() => {
        // Silently ignore — existing index remains usable
      });
  }, []);

  const allChats = indexState.items;

  const fuse = useMemo(
    () =>
      new Fuse(allChats, {
        keys: ["searchFields.title", "searchFields.network", "searchFields.participants"],
        ignoreDiacritics: true,
        includeScore: true,
        ignoreLocation: true,
        threshold: 0.3,
      }),
    [allChats],
  );

  const trimmedQuery = searchText.trim();

  const chats = useMemo(() => {
    if (!trimmedQuery) return allChats.map((item) => item.chat);
    return fuse.search(trimmedQuery).map((result) => result.item.chat);
  }, [allChats, fuse, trimmedQuery]);

  return (
    <List
      isLoading={indexState === defaultIndexState && allChats.length === 0}
      navigationTitle={sm.navigationTitle}
      searchBarPlaceholder={sm.searchPlaceholder}
      onSearchTextChange={setSearchText}
      throttle
    >
      {chats.map((chat) => {
        const lastActivity = parseDate(chat.lastActivity);
        return (
          <List.Item
            key={chat.id}
            icon={chat.type === "group" ? Icon.TwoPeople : Icon.Person}
            title={chat.title || translations.common.unnamedChat}
            subtitle={chat.network}
            accessories={[
              ...(chat.unreadCount > 0 ? [{ text: translations.common.unreadCount(chat.unreadCount) }] : []),
              ...(lastActivity ? [{ date: lastActivity }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title={sm.composeAction}
                  icon={Icon.Pencil}
                  target={<ComposeMessageForm chat={chat} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
      {allChats.length > 0 && chats.length === 0 && (
        <List.EmptyView icon={Icon.Message} title={sm.noChatsFound} description={sm.noChatsDescription} />
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(SendMessageCommand);

import { List, Icon, ActionPanel, Action, Image } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { createBeeperOAuth, focusApp } from "./api";
import { t } from "./locales";
import { useMessageSearch } from "./hooks/useMessageSearch";
import { getChatIcon } from "./utils/chatIcon";

function SearchMessagesCommand() {
  const translations = t();
  const [searchText, setSearchText] = useState("");
  const { data: messages = [], isLoading } = useMessageSearch(searchText);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={translations.commands.searchMessages.searchPlaceholder}
      onSearchTextChange={setSearchText}
      throttle
    >
      {searchText === "" ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={translations.commands.searchMessages.emptyTitle}
          description={translations.commands.searchMessages.emptyDescription}
        />
      ) : !isLoading && messages.length === 0 ? (
        <List.EmptyView
          icon={Icon.Message}
          title={translations.commands.searchMessages.noResultsTitle}
          description={translations.commands.searchMessages.noResultsDescription}
        />
      ) : (
        messages.map((message) => (
          <List.Item
            key={message.id}
            icon={getChatIcon(message.chat)}
            title={
              message.senderName
                ? `${message.senderName}: ${message.text}`
                : message.text || translations.common.unknownMessage
            }
            subtitle={message.chat?.title || translations.common.unnamedChat}
            accessories={[{ date: new Date(message.timestamp) }]}
            actions={
              <ActionPanel>
                <Action
                  title={translations.common.openInBeeper}
                  icon={Icon.Window}
                  onAction={() => {
                    const sortKey = message.sortKey != null ? String(message.sortKey) : undefined;
                    focusApp(
                      sortKey !== undefined
                        ? { chatID: message.chatID, messageSortKey: sortKey }
                        : { chatID: message.chatID }
                    );
                  }}
                />
                <Action.CopyToClipboard title={translations.common.copyMessageText} content={message.text || ""} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(SearchMessagesCommand);

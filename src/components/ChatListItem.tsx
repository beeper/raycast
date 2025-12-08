import { List, ActionPanel, Action, Icon } from "@raycast/api";
import type { ReactNode } from "react";
import { Translations } from "../locales/en";
import { getChatIcon } from "../utils/chatIcon";

interface Chat {
  id: string;
  network: string;
  type?: string;
  participants?: {
    items?: Array<{ isSelf?: boolean; imgURL?: string }>;
  };
  title?: string;
  avatarUrl?: string;
  onOpen?: () => void;
  detailsTarget?: ReactNode;
}

interface ChatListItemProps {
  chat: Chat;
  translations: Translations;
  accessories?: List.Item.Props["accessories"];
  showDetails?: boolean;
}

export function ChatListItem({ chat, translations, accessories = [], showDetails = false }: ChatListItemProps) {
  return (
    <List.Item
      key={chat.id}
      icon={getChatIcon(chat)}
      title={chat.title || translations.common.unnamedChat}
      subtitle={chat.network}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title={translations.common.openInBeeper} icon={Icon.Window} onAction={() => chat.onOpen?.()} />
          {showDetails && chat.detailsTarget && (
            <Action.Push title={translations.common.showDetails} icon={Icon.Info} target={chat.detailsTarget} />
          )}
          <Action.CopyToClipboard title={translations.common.copyChatId} content={chat.id} />
        </ActionPanel>
      }
    />
  );
}

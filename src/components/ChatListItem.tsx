import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { getNetworkIcon } from "../network-icons";
import { Translations } from "../locales/en";

interface Chat {
  id: string;
  network: string;
  title?: string;
  onOpen?: () => void;
  detailsTarget?: React.ReactNode;
}

interface ChatListItemProps {
  chat: Chat;
  translations: Translations;
  accessories?: Array<{ text?: string; icon?: any; date?: Date }>;
  showDetails?: boolean;
}

export function ChatListItem({ chat, translations, accessories = [], showDetails = false }: ChatListItemProps) {
  return (
    <List.Item
      key={chat.id}
      icon={getNetworkIcon(chat.network)}
      title={chat.title || translations.common.unnamedChat}
      subtitle={chat.network}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title={translations.common.openInBeeper}
            icon={Icon.Window}
            onAction={() => chat.onOpen?.()}
          />
          {showDetails && chat.detailsTarget && (
            <Action.Push
              title={translations.common.showDetails}
              icon={Icon.Info}
              target={chat.detailsTarget}
            />
          )}
          <Action.CopyToClipboard title={translations.common.copyChatId} content={chat.id} />
        </ActionPanel>
      }
    />
  );
}

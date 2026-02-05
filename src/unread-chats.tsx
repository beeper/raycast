import { withAccessToken } from "@raycast/utils";
import { createBeeperOAuth } from "./api";
import { ChatListView } from "./chat";

function UnreadChatsCommand() {
  return (
    <ChatListView
      stateKey="chat:unread"
      navigationTitle="Unread Chats"
      searchPlaceholder="Search unread chats"
      defaultFilters={{
        inbox: "primary",
        type: "any",
        unreadOnly: true,
        includeMuted: true,
      }}
    />
  );
}

export default withAccessToken(createBeeperOAuth())(UnreadChatsCommand);

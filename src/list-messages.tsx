import { ActionPanel, List, Action, Icon, Color, Form, showToast, Toast } from "@raycast/api";
import { withAccessToken, useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import type { BeeperDesktop } from "@beeper/desktop-api";
import { useBeeperDesktop, createBeeperOAuth, focusApp, getBeeperDesktop } from "./api";

interface SendMessageFormValues {
  text: string;
  replyToMessageID?: string;
}

function SendMessageForm({ chatID, onSuccess }: { chatID: string; onSuccess: () => void }) {
  const { handleSubmit, itemProps } = useForm<SendMessageFormValues>({
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Sending message...",
      });

      try {
        await getBeeperDesktop().messages.send({
          chatID,
          text: values.text,
          replyToMessageID: values.replyToMessageID || undefined,
        });

        toast.style = Toast.Style.Success;
        toast.title = "Message sent successfully";
        onSuccess();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to send message";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
    validation: {
      text: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Message" placeholder="Type your message..." {...itemProps.text} />
      <Form.TextField
        title="Reply To Message ID"
        placeholder="Optional: Message ID to reply to"
        {...itemProps.replyToMessageID}
      />
    </Form>
  );
}

function ListMessagesCommand() {
  const [chatID, setChatID] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { data: messages = [], isLoading } = useBeeperDesktop(
    async (client) => {
      if (!chatID) return [];

      const result = await client.messages.list({ chatID, limit: 100 });
      // Collect all items from the cursor
      const items = [];
      for await (const item of result) {
        items.push(item);
      }
      return items;
    },
    [refreshTrigger],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter Chat ID..."
      onSearchTextChange={setChatID}
      throttle
      actions={
        !chatID ? undefined : (
          <ActionPanel>
            <Action.Push
              title="Send Message"
              icon={Icon.Pencil}
              target={<SendMessageForm chatID={chatID} onSuccess={() => setRefreshTrigger((n) => n + 1)} />}
            />
          </ActionPanel>
        )
      }
    >
      {messages.map((message) => {
        const senderName = message.sender?.fullName || message.sender?.username || "Unknown";
        const messageText = message.text || "[No text content]";
        const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleString() : "";
        const hasReactions = message.reactions && message.reactions.length > 0;

        return (
          <List.Item
            key={message.id}
            icon={{
              source: message.sender?.isSelf ? Icon.PersonCircle : Icon.Person,
              tintColor: message.sender?.isSelf ? Color.Blue : Color.Green,
            }}
            title={messageText.substring(0, 100)}
            subtitle={senderName}
            accessories={[
              ...(timestamp ? [{ text: timestamp }] : []),
              ...(hasReactions ? [{ icon: Icon.Heart }] : []),
              ...(message.attachments && message.attachments.length > 0
                ? [{ icon: Icon.Paperclip, text: `${message.attachments.length}` }]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Send Message"
                  icon={Icon.Pencil}
                  target={<SendMessageForm chatID={chatID} onSuccess={() => setRefreshTrigger((n) => n + 1)} />}
                />
                <Action
                  title="Open Message in Beeper"
                  icon={Icon.Window}
                  onAction={() => focusApp({ chatID, messageID: message.id })}
                />
                <Action.CopyToClipboard title="Copy Message Text" content={messageText} />
                <Action.CopyToClipboard
                  title="Copy Message ID"
                  content={message.id}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
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
      {!isLoading && messages.length === 0 && chatID && (
        <List.EmptyView icon={Icon.Message} title="No messages found" description="This chat may be empty" />
      )}
      {!isLoading && !chatID && (
        <List.EmptyView
          icon={Icon.Message}
          title="List Messages"
          description="Enter a Chat ID to view messages in that chat"
        />
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(ListMessagesCommand);

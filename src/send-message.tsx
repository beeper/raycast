import { ActionPanel, Action, Form, showToast, Toast, Icon, showHUD, closeMainWindow } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { useBeeperDesktop, createBeeperOAuth, getBeeperDesktop } from "./api";
import { t } from "./locales";

interface SendMessageFormValues {
  chatId: string;
  message: string;
}

/**
 * Renders a form to select a chat and send a message via the Beeper desktop client.
 *
 * The form displays a dropdown of chats (sorted by most recent activity) and a message textarea.
 * On submit it validates inputs, sends the message with the Beeper desktop client, closes the main window on success,
 * and shows success or failure feedback to the user.
 *
 * @returns The React element containing the send-message form.
 */
function SendMessageForm() {
  const translations = t();
  const [isLoading, setIsLoading] = useState(false);
  const { data: chats = [], isLoading: chatsLoading } = useBeeperDesktop(async (client) => {
    const allChats = [];
    for await (const chat of client.chats.search({})) {
      allChats.push(chat);
    }
    // Sort by last activity (most recent first)
    return allChats.sort((a, b) => {
      const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
      const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
      return bTime - aTime;
    });
  }, []);

  async function handleSubmit(values: SendMessageFormValues) {
    if (!values.chatId || !values.message) {
      await showToast({
        style: Toast.Style.Failure,
        title: translations.commands.sendMessage.missingInfoTitle,
        message: translations.commands.sendMessage.missingInfoMessage,
      });
      return;
    }

    setIsLoading(true);
    try {
      const client = getBeeperDesktop();
      await client.messages.send({
        chatID: values.chatId,
        text: values.message,
      });

      await closeMainWindow();
      await showHUD(translations.commands.sendMessage.successMessage);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: translations.commands.sendMessage.errorTitle,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={chatsLoading || isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={translations.commands.sendMessage.submitButton}
            icon={Icon.Envelope}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="chatId"
        title={translations.commands.sendMessage.chatLabel}
        placeholder={translations.commands.sendMessage.chatPlaceholder}
        storeValue
      >
        {chats.map((chat) => (
          <Form.Dropdown.Item
            key={chat.id}
            value={chat.id}
            title={chat.title || translations.common.unnamedChat}
            icon={Icon.Message}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="message"
        title={translations.commands.sendMessage.messageLabel}
        placeholder={translations.commands.sendMessage.messagePlaceholder}
        enableMarkdown={false}
      />
    </Form>
  );
}

export default withAccessToken(createBeeperOAuth())(SendMessageForm);
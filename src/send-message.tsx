import { ActionPanel, Form, Action, showToast, Toast, popToRoot } from "@raycast/api";
import { withAccessToken, useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import { getBeeperDesktop, createBeeperOAuth } from "./api";

interface SendMessageFormValues {
  chatID: string;
  text: string;
  replyToMessageID?: string;
}

function SendMessageCommand() {
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<SendMessageFormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Sending message...",
      });

      try {
        const result = await getBeeperDesktop().messages.send({
          chatID: values.chatID,
          text: values.text,
          replyToMessageID: values.replyToMessageID || undefined,
        });

        toast.style = Toast.Style.Success;
        toast.title = "Message sent successfully";
        toast.message = `Message ID: ${result.pendingMessageID}`;

        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to send message";
        toast.message = error instanceof Error ? error.message : String(error);
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      chatID: FormValidation.Required,
      text: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Chat ID"
        placeholder="!NCdzlIaMjZUmvmvyHU:beeper.com"
        info="The unique identifier of the chat where you want to send the message"
        {...itemProps.chatID}
      />
      <Form.TextArea
        title="Message"
        placeholder="Type your message here... (Markdown supported)"
        info="You can use Markdown formatting in your message"
        {...itemProps.text}
      />
      <Form.TextField
        title="Reply To Message ID"
        placeholder="Optional: Message ID to reply to"
        info="If you want to reply to a specific message, enter its ID here"
        {...itemProps.replyToMessageID}
      />
    </Form>
  );
}

export default withAccessToken(createBeeperOAuth())(SendMessageCommand);

import { ActionPanel, Form, Action, showToast, Toast, popToRoot, List, Icon } from "@raycast/api";
import { withAccessToken, useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import type { BeeperDesktop } from "@beeper/desktop-api";
import { useBeeperDesktop, getBeeperDesktop, createBeeperOAuth, focusApp } from "./api";

interface CreateChatFormValues {
  accountID: string;
  type: "single" | "group";
  participantIDs: string;
  title?: string;
  messageText?: string;
}

function SearchContactsStep({
  accountID,
  onSelect,
}: {
  accountID: string;
  onSelect: (participantID: string) => void;
}) {
  const [searchText, setSearchText] = useState("");

  const { data: contacts = [], isLoading } = useBeeperDesktop(async (client) => {
    if (!searchText || searchText.length < 2) return [];

    const result = await client.contacts.search({
      accountID,
      query: searchText,
    });

    return result.items;
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search contacts..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {contacts.map((contact) => (
        <List.Item
          key={contact.id}
          icon={Icon.Person}
          title={contact.fullName || contact.username || "Unknown"}
          subtitle={contact.email || contact.phoneNumber || contact.id}
          actions={
            <ActionPanel>
              <Action title="Select Contact" onAction={() => onSelect(contact.id)} />
              <Action.CopyToClipboard title="Copy Contact ID" content={contact.id} />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && contacts.length === 0 && searchText.length >= 2 && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No contacts found" description="Try a different search" />
      )}
      {!isLoading && searchText.length < 2 && (
        <List.EmptyView
          icon={Icon.Person}
          title="Search Contacts"
          description="Type at least 2 characters to search"
        />
      )}
    </List>
  );
}

function CreateChatCommand() {
  const [isLoading, setIsLoading] = useState(false);

  const { data: accounts = [] } = useBeeperDesktop(async (client) => {
    const result = await client.accounts.list();
    return result;
  });

  const { handleSubmit, itemProps, values } = useForm<CreateChatFormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating chat...",
      });

      try {
        // Parse participant IDs (comma or newline separated)
        const participantIDs = values.participantIDs
          .split(/[\n,]+/)
          .map((id) => id.trim())
          .filter((id) => id.length > 0);

        if (participantIDs.length === 0) {
          throw new Error("At least one participant ID is required");
        }

        if (values.type === "single" && participantIDs.length !== 1) {
          throw new Error("Single chats require exactly one participant ID");
        }

        const result = await getBeeperDesktop().chats.create({
          accountID: values.accountID,
          type: values.type,
          participantIDs,
          title: values.title || undefined,
          messageText: values.messageText || undefined,
        });

        toast.style = Toast.Style.Success;
        toast.title = "Chat created successfully";

        if (result.chatID) {
          toast.message = `Opening chat...`;
          await focusApp({ chatID: result.chatID });
        }

        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create chat";
        toast.message = error instanceof Error ? error.message : String(error);
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      accountID: FormValidation.Required,
      type: FormValidation.Required,
      participantIDs: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Chat" onSubmit={handleSubmit} />
          {values.accountID && (
            <Action.Push
              title="Search Contacts"
              icon={Icon.MagnifyingGlass}
              shortcut={{ modifiers: ["cmd"], key: "k" }}
              target={
                <SearchContactsStep
                  accountID={values.accountID}
                  onSelect={(participantID) => {
                    // This will be handled by the form state
                    console.log("Selected participant:", participantID);
                  }}
                />
              }
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Account" info="Select the account to create the chat on" {...itemProps.accountID}>
        {accounts.map((account) => (
          <Form.Dropdown.Item
            key={account.accountID}
            value={account.accountID}
            title={account.user?.fullName || account.network || account.accountID}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        title="Chat Type"
        info="Select whether to create a direct message (single) or group chat"
        {...itemProps.type}
      >
        <Form.Dropdown.Item value="single" title="Direct Message (Single)" />
        <Form.Dropdown.Item value="group" title="Group Chat" />
      </Form.Dropdown>

      <Form.TextArea
        title="Participant IDs"
        placeholder="Enter participant IDs (one per line or comma-separated)&#10;Use Cmd+K to search contacts"
        info={
          values.type === "single"
            ? "For single chats, enter exactly one participant ID"
            : "For group chats, enter multiple participant IDs"
        }
        {...itemProps.participantIDs}
      />

      {values.type === "group" && (
        <Form.TextField
          title="Group Title"
          placeholder="Optional: My Group Chat"
          info="Optional title for the group chat (ignored for most platforms in single chats)"
          {...itemProps.title}
        />
      )}

      <Form.TextArea
        title="First Message"
        placeholder="Optional: Hello!"
        info="Optional first message content (required on some platforms to create the chat)"
        {...itemProps.messageText}
      />
    </Form>
  );
}

export default withAccessToken(createBeeperOAuth())(CreateChatCommand);

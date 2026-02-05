import { ActionPanel, List, Action, Icon, Form, showToast, Toast } from "@raycast/api";
import { withAccessToken, useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import type { BeeperDesktop } from "@beeper/desktop-api";
import { useBeeperDesktop, getBeeperDesktop, createBeeperOAuth } from "./api";

interface SearchFormValues {
  accountID: string;
  query: string;
}

function SearchContactsCommand() {
  const [accountID, setAccountID] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: accounts = [] } = useBeeperDesktop(async (client) => {
    const result = await client.accounts.list();
    return result;
  });

  const { data: contacts = [], isLoading } = useBeeperDesktop(
    async (client) => {
      if (!accountID || !searchQuery || searchQuery.length < 2) return [];

      const result = await client.contacts.search({
        accountID,
        query: searchQuery,
      });

      return result.items;
    },
    [accountID, searchQuery],
  );

  const createChat = async (participantID: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating chat...",
    });

    try {
      const result = await getBeeperDesktop().chats.create({
        accountID,
        type: "single",
        participantIDs: [participantID],
      });

      toast.style = Toast.Style.Success;
      toast.title = "Chat created successfully";

      if (result.chatID) {
        toast.message = "Opening chat...";
        const client = getBeeperDesktop();
        await client.open({ chatID: result.chatID });
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create chat";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={accountID ? "Search contacts..." : "Select an account first..."}
      onSearchTextChange={setSearchQuery}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Account"
          value={accountID}
          onChange={setAccountID}
          storeValue
        >
          <List.Dropdown.Item title="Select an account..." value="" />
          {accounts.map((account) => (
            <List.Dropdown.Item
              key={account.accountID}
              title={account.user?.fullName || account.network || account.accountID}
              value={account.accountID}
            />
          ))}
        </List.Dropdown>
      }
    >
      {contacts.map((contact) => (
        <List.Item
          key={contact.id}
          icon={Icon.Person}
          title={contact.fullName || contact.username || "Unknown"}
          subtitle={contact.email || contact.phoneNumber || ""}
          accessories={[
            ...(contact.id ? [{ text: contact.id.substring(0, 20) + "..." }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action title="Create Chat" icon={Icon.Message} onAction={() => createChat(contact.id)} />
              <Action.CopyToClipboard title="Copy Contact ID" content={contact.id} />
              {contact.email && <Action.CopyToClipboard title="Copy Email" content={contact.email} />}
              {contact.phoneNumber && (
                <Action.CopyToClipboard title="Copy Phone Number" content={contact.phoneNumber} />
              )}
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && contacts.length === 0 && accountID && searchQuery.length >= 2 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No contacts found"
          description="Try a different search query"
        />
      )}
      {!isLoading && !accountID && (
        <List.EmptyView
          icon={Icon.Person}
          title="Search Contacts"
          description="Select an account from the dropdown to start searching"
        />
      )}
      {!isLoading && accountID && searchQuery.length < 2 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Contacts"
          description="Type at least 2 characters to search"
        />
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(SearchContactsCommand);

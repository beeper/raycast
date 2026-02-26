import { Action, ActionPanel, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createBeeperOAuth,
  createChat,
  focusApp,
  listAccounts,
  retrieveChat,
  searchChats,
  searchContacts,
} from "./api";
import { ChatThread } from "./chat";
import { t } from "./locales";
import { getBeeperAppPath } from "./utils";

const getContactSortName = (contact: {
  fullName?: string;
  username?: string;
  phoneNumber?: string;
  email?: string;
  id: string;
}) => (contact.fullName || contact.username || contact.phoneNumber || contact.email || contact.id || "").toLowerCase();

const sortContacts = <
  T extends { fullName?: string; username?: string; phoneNumber?: string; email?: string; id: string },
>(
  items: T[],
) =>
  [...items].sort((a, b) => {
    const aName = getContactSortName(a);
    const bName = getContactSortName(b);
    const aEmpty = !aName;
    const bEmpty = !bName;
    if (aEmpty && !bEmpty) return 1;
    if (!aEmpty && bEmpty) return -1;
    return aName.localeCompare(bName);
  });

export function ContactsView() {
  const translations = t();
  const c = translations.commands.contacts;

  const [query, setQuery] = useState("");
  const { data: accounts = [], isLoading: isLoadingAccounts } = useCachedPromise(listAccounts, [], {
    keepPreviousData: true,
  });
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const { push } = useNavigation();
  const beeperAppPath = getBeeperAppPath();

  useEffect(() => {
    if (accountFilter === "all" && accounts.length === 1) {
      setAccountFilter(accounts[0].accountID);
    }
  }, [accountFilter, accounts]);

  const shouldSearch = query.trim().length > 0 && accounts.length > 0;
  const accountMap = useMemo(() => new Map(accounts.map((account) => [account.accountID, account])), [accounts]);
  const accountsKey = useMemo(() => accounts.map((account) => account.accountID).join("|"), [accounts]);
  const lastPartialErrorKey = useRef<string | null>(null);

  const {
    data: contacts = [],
    isLoading,
    error,
  } = useCachedPromise(
    async (termInput: string, filter: string, accountsSnapshotKey: string) => {
      if (!shouldSearch) return [];
      const term = termInput.trim();
      if (!term) return [];

      if (filter === "all") {
        const results = await Promise.allSettled(
          accounts.map(async (account) => {
            const items = await searchContacts(account.accountID, term);
            return items.map((contact) => ({ ...contact, accountID: account.accountID }));
          }),
        );

        const fulfilled = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
        const rejected = results.filter((result) => result.status === "rejected");

        if (rejected.length === results.length && results.length > 0) {
          const reason = rejected[0].reason;
          throw reason instanceof Error ? reason : new Error(String(reason));
        }

        if (rejected.length > 0) {
          const toastKey = `${term}-${rejected.length}-${accountsSnapshotKey}`;
          if (lastPartialErrorKey.current !== toastKey) {
            lastPartialErrorKey.current = toastKey;
            await showToast({
              style: Toast.Style.Failure,
              title: c.partialErrorTitle,
              message: c.partialErrorMessage,
            });
          }
        }

        return sortContacts(fulfilled);
      }

      const items = await searchContacts(filter, term);
      return sortContacts(items.map((contact) => ({ ...contact, accountID: filter })));
    },
    [query, accountFilter, accountsKey],
    { keepPreviousData: true },
  );

  const dropdown = (
    <List.Dropdown
      tooltip={c.accountDropdownTooltip}
      value={accountFilter}
      onChange={(value) => setAccountFilter(value)}
      isLoading={isLoadingAccounts}
    >
      <List.Dropdown.Item key="all" value="all" title={c.allAccounts} />
      {accounts.map((account) => (
        <List.Dropdown.Item
          key={account.accountID}
          value={account.accountID}
          title={`${account.network || c.accountFallback} • ${
            account.user?.fullName ||
            account.user?.username ||
            account.user?.email ||
            account.user?.phoneNumber ||
            account.accountID
          }`}
        />
      ))}
    </List.Dropdown>
  );

  const emptyView = (() => {
    if (error && shouldSearch && !isLoading) {
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={c.searchFailedTitle}
          description={c.searchFailedDescription}
          actions={
            beeperAppPath ? (
              <ActionPanel>
                <Action.Open title={translations.common.openInBeeper} target={beeperAppPath} />
              </ActionPanel>
            ) : null
          }
        />
      );
    }
    if (!isLoading && contacts.length === 0) {
      return (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={shouldSearch ? c.noResultsTitle : c.typeToSearchTitle}
          description={shouldSearch ? c.noResultsDescription : c.typeToSearchDescription}
        />
      );
    }
    return null;
  })();

  return (
    <List
      isLoading={isLoading}
      navigationTitle={c.navigationTitle}
      searchBarPlaceholder={c.searchPlaceholder}
      searchBarAccessory={dropdown}
      onSearchTextChange={setQuery}
      throttle
    >
      {contacts.map((contact) => {
        const account = accountMap.get((contact as { accountID?: string }).accountID || "");
        const title = contact.fullName || contact.username || contact.id;
        const subtitle = contact.username && contact.fullName ? contact.username : contact.email || contact.phoneNumber;
        const accountLabel = account
          ? `${account.network || c.accountFallback} • ${
              account.user?.fullName ||
              account.user?.username ||
              account.user?.email ||
              account.user?.phoneNumber ||
              account.accountID
            }`
          : undefined;
        return (
          <List.Item
            key={`${contact.id}-${(contact as { accountID?: string }).accountID ?? "unknown"}`}
            icon={contact.isSelf ? Icon.Star : Icon.Person}
            title={title}
            subtitle={subtitle}
            accessories={accountLabel ? [{ text: accountLabel }] : []}
            actions={
              <ActionPanel>
                <Action
                  title={c.openChatAction}
                  icon={Icon.Message}
                  onAction={async () => {
                    const selectedAccountID = (contact as { accountID?: string }).accountID;
                    if (!selectedAccountID) return;
                    const toast = await showToast({ style: Toast.Style.Animated, title: c.openingChatToast });
                    try {
                      const contactName = contact.fullName || contact.username || contact.id;
                      const existing = await searchChats({
                        accountIDs: [selectedAccountID],
                        type: "single",
                        participantQuery: contactName,
                        includeMuted: true,
                      });

                      let matchedChat: typeof existing.items[0] | undefined;
                      for (const candidate of existing.items ?? []) {
                        const full = await retrieveChat(candidate.id, { maxParticipantCount: 10 });
                        const hasContact = full.participants?.items?.some(
                          (p) =>
                            p.id === contact.id ||
                            (contact.username && p.username && p.username === contact.username),
                        );
                        if (hasContact) {
                          matchedChat = full;
                          break;
                        }
                      }

                      if (matchedChat) {
                        toast.style = Toast.Style.Success;
                        toast.title = c.chatFoundToast;
                        push(<ChatThread chat={matchedChat} />);
                      } else {
                        toast.title = c.creatingChatToast;
                        const response = await createChat({
                          accountID: selectedAccountID,
                          participantIDs: [contact.id],
                          type: "single",
                        });
                        toast.style = Toast.Style.Success;
                        toast.title = c.chatCreatedToast;
                        const newChatID =
                          (response as { chatID?: string }).chatID || (response as { id?: string }).id || undefined;
                        if (newChatID) {
                          try {
                            const chat = await retrieveChat(newChatID, { maxParticipantCount: 0 });
                            push(<ChatThread chat={chat} />);
                          } catch {
                            // fallback: keep the list visible if chat load fails
                          }
                        }
                      }
                    } catch (error) {
                      toast.style = Toast.Style.Failure;
                      toast.title = c.openChatFailedToast;
                      toast.message = error instanceof Error ? error.message : translations.common.unknownError;
                    }
                  }}
                />
                <Action title={translations.common.openInBeeper} icon={Icon.Window} onAction={() => focusApp()} />
                <Action.CopyToClipboard title={c.copyParticipantId} content={contact.id} />
              </ActionPanel>
            }
          />
        );
      })}
      {emptyView}
    </List>
  );
}

function ContactsCommand() {
  return <ContactsView />;
}

export default withAccessToken(createBeeperOAuth())(ContactsCommand);

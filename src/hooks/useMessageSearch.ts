import { useBeeperDesktop } from "../api";

export function useMessageSearch(searchText: string) {
  return useBeeperDesktop(
    async (client, query) => {
      if (!query) return [];
      const allMessages = [];
      // Search for messages matching the query
      // We limit to a reasonable number or let the iterator handle it,
      // but for a simple list view, fetching the first batch is usually enough.
      // The API returns a PagePromise, so we can iterate.
      for await (const message of client.messages.search({ query })) {
        allMessages.push(message);
        if (allMessages.length >= 50) break;
      }

      // Deduplicate chat IDs
      const uniqueChatIDs = Array.from(new Set(allMessages.map((m) => m.chatID)));

      // Fetch chats with simple concurrency control (batch size of 5)
      const chatMap = new Map();
      const BATCH_SIZE = 5;

      for (let i = 0; i < uniqueChatIDs.length; i += BATCH_SIZE) {
        const batch = uniqueChatIDs.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (chatID) => {
            try {
              const chat = await client.chats.retrieve({ chatID });
              chatMap.set(chatID, chat);
            } catch (e) {
              console.warn(`Failed to load chat ${chatID}`, e);
            }
          }),
        );
      }

      // Map messages to include chat details
      return allMessages.map((message) => ({
        ...message,
        chat: chatMap.get(message.chatID) || null,
      }));
    },
    [searchText] as [string],
  );
}

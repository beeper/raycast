import { useBeeperDesktop } from "../api";

export function useChatSearch(searchText: string, includeEmpty = false) {
  return useBeeperDesktop(
    async (client) => {
      if (!searchText && !includeEmpty) return [];
      const allChats = [];
      const params = searchText ? { query: searchText } : {};
      for await (const chat of client.chats.search(params)) {
        allChats.push(chat);
      }
      return allChats;
    },
    [searchText, includeEmpty]
  );
}

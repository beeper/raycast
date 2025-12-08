import { useBeeperDesktop } from "../api";

export function useChatSearch(searchText: string, includeEmpty = false) {
  return useBeeperDesktop(
    async (client, query, includeEmptyResults) => {
      if (!query && !includeEmptyResults) return [];
      
      const allChats = [];
      let cursor: string | null = null;
      let hasMore = true;
      const MAX_PAGES = 10; // Safety limit: max 10 pages * 100 = 1000 results
      let pageCount = 0;

      // For search, load more results initially (100 per batch)
      // since users expect comprehensive results when searching
      while (hasMore && pageCount < MAX_PAGES) {
        const params = query 
          ? { query, limit: 100, ...(cursor ? { cursor, direction: "older" as const } : {}) }
          : { limit: 100, ...(cursor ? { cursor, direction: "older" as const } : {}) };
        
        const page = await client.chats.search(params);
        allChats.push(...page.items);
        
        cursor = page.oldestCursor;
        hasMore = page.hasMore;
        pageCount++;
        
        // Early exit if we have enough results
        if (allChats.length >= 200) break;
      }
      
      return allChats;
    },
    [searchText, includeEmpty] as [string, boolean],
  );
}

import BeeperDesktop from "@beeper/desktop-api";

/** Compact summary like "👍2 ❤️". */
export const formatReactionsShort = (reactions?: BeeperDesktop.Reaction[]): string | undefined => {
  if (!reactions || reactions.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const r of reactions) {
    counts.set(r.reactionKey, (counts.get(r.reactionKey) ?? 0) + 1);
  }
  return [...counts.entries()].map(([key, n]) => (n > 1 ? `${key}${n}` : key)).join(" ");
};

/** Detailed summary grouped by sender like "Alice 👍❤️, Bob 😂". */
export const formatReactionsDetailed = (
  reactions?: BeeperDesktop.Reaction[],
  nameMap?: Map<string, string>,
): { text: string; entries: { name: string; emojis: string }[] } | undefined => {
  if (!reactions || reactions.length === 0) return undefined;
  const bySender = new Map<string, string[]>();
  for (const r of reactions) {
    const key = r.participantID;
    const list = bySender.get(key) ?? [];
    list.push(r.reactionKey);
    bySender.set(key, list);
  }
  const entries = [...bySender.entries()].map(([id, emojis]) => ({
    name: nameMap?.get(id) ?? id,
    emojis: emojis.join(""),
  }));
  return {
    text: entries.map((e) => `${e.emojis} ${e.name}`).join(", "),
    entries,
  };
};

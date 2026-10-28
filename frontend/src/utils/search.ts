export type SearchItem<TPayload> = {
  id: string;
  title: string;
  subtitle?: string;
  keywords?: string[];
  payload: TPayload;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function searchItems<TPayload>(items: SearchItem<TPayload>[], query: string, limit = 8) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  return items
    .map((item) => {
      const haystack = normalize([item.title, item.subtitle, ...(item.keywords || [])].filter(Boolean).join(" "));
      const startsWith = haystack.startsWith(normalizedQuery);
      const includes = haystack.includes(normalizedQuery);

      if (!startsWith && !includes) return null;
      return { item, score: startsWith ? 2 : 1 };
    })
    .filter((result): result is { item: SearchItem<TPayload>; score: number } => Boolean(result))
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map((result) => result.item);
}

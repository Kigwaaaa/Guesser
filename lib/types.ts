/** Cached theme item fields returned from Supabase embeds. */
export type ThemeItemSummary = {
  id: string;
  name: string;
  image_url: string | null;
};

/**
 * Supabase embeds many-to-one FK relations as an object; some queries may return an array.
 */
export function parseThemeItemEmbed(
  embed: ThemeItemSummary | ThemeItemSummary[] | null | undefined
): ThemeItemSummary | null {
  if (!embed) return null;
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed;
}

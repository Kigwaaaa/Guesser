/**
 * Script: fetchWikidata.ts
 *
 * Usage:
 *   npx tsx scripts/fetchWikidata.ts --theme "Kenyan Artists"
 *   npx tsx scripts/fetchWikidata.ts --theme all
 *   npx tsx scripts/fetchWikidata.ts --list
 *
 * Runs SPARQL against Wikidata Query Service and upserts `name` + optional
 * `image_url` into the Supabase `theme_items` table.
 *
 * People / athletes: occupation wdt:P106, citizenship wdt:P27, image wdt:P18
 * Logos: instance type + logo wdt:P154
 * Sports: instance of wd:Q349 with logo (P154) or image (P18), plus manual fallback
 *
 * IMPORTANT: this script writes to Supabase using the SERVICE ROLE key
 * (supabaseAdmin below), which bypasses Row Level Security. That's
 * intentional and safe here because this script only ever runs locally
 * on your machine, never in the browser. Never import supabaseAdmin (or
 * the service role key) into any client-facing app code.
 */
import { config } from "dotenv";
config({ path: ".env" });

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SPARQL_PREFIXES = `
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>
`;

const LABEL_SERVICE = `
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
`;

// --- People ---

export const KENYAN_POLITICIANS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q5;
        wdt:P106 wd:Q82955;
        wdt:P27 wd:Q114;
        wikibase:sitelinks ?sitelinks.
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY DESC(?sitelinks)
LIMIT 50
`;

export const KENYAN_ARTISTS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q5;
        wdt:P106 wd:Q639669;
        wdt:P27 wd:Q114;
        wikibase:sitelinks ?sitelinks.
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY DESC(?sitelinks)
LIMIT 50
`;

export const KENYAN_BANDS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image ?logo WHERE {
  ?item wdt:P31 wd:Q215380;
        wdt:P495 wd:Q114.
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL { ?item wdt:P154 ?logo }
  ${LABEL_SERVICE}
}
ORDER BY ?itemLabel
LIMIT 200
`;

export const KENYAN_ACTORS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q5;
        wdt:P106 wd:Q33999;
        wdt:P27 wd:Q114;
        wikibase:sitelinks ?sitelinks.
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY DESC(?sitelinks)
LIMIT 50
`;

export const HOLLYWOOD_ACTORS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q5;
        wdt:P106 wd:Q33999;
        wdt:P27 wd:Q30;
        wikibase:sitelinks ?sitelinks.
  FILTER(?sitelinks > 40)
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY DESC(?sitelinks)
LIMIT 50
`;

export const UK_ACTORS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q5;
        wdt:P106 wd:Q33999;
        wdt:P27 wd:Q145;
        wikibase:sitelinks ?sitelinks.
  FILTER(?sitelinks > 40)
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY DESC(?sitelinks)
LIMIT 50
`;

export const USA_MUSICIANS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q5;
        wdt:P106 wd:Q639669;
        wdt:P27 wd:Q30;
        wikibase:sitelinks ?sitelinks.
  FILTER(?sitelinks > 40)
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY DESC(?sitelinks)
LIMIT 50
`;

export const USA_RAPPERS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q5;
        wdt:P106 wd:Q2252262;
        wdt:P27 wd:Q30;
        wikibase:sitelinks ?sitelinks.
  FILTER(?sitelinks > 40)
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY DESC(?sitelinks)
LIMIT 50
`;

export const UK_MUSICIANS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q5;
        wdt:P106 wd:Q639669;
        wdt:P27 wd:Q145;
        wikibase:sitelinks ?sitelinks.
  FILTER(?sitelinks > 40)
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY DESC(?sitelinks)
LIMIT 50
`;

export const UK_RAPPERS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q5;
        wdt:P106 wd:Q2252262;
        wdt:P27 wd:Q145;
        wikibase:sitelinks ?sitelinks.
  FILTER(?sitelinks > 40)
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY DESC(?sitelinks)
LIMIT 50
`;

// --- Athletes ---

export const KENYAN_ATHLETES_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q5;
        wdt:P27 wd:Q114.
  {
    ?item wdt:P106 wd:Q11513337.
  } UNION {
    ?item wdt:P106 wd:Q2066131.
  }
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY ?itemLabel
LIMIT 300
`;

export const GLOBAL_FOOTBALL_LEGENDS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q5;
        wdt:P106 wd:Q937857;
        wikibase:sitelinks ?sitelinks.
  FILTER(?sitelinks > 40)
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY DESC(?sitelinks)
LIMIT 50
`;

export const BASKETBALL_LEGENDS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q5;
        wdt:P106 wd:Q3665646;
        wikibase:sitelinks ?sitelinks.
  FILTER(?sitelinks > 40)
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY DESC(?sitelinks)
LIMIT 50
`;

export const TRACK_AND_FIELD_LEGENDS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q5;
        wdt:P106 wd:Q11513337.
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY ?itemLabel
LIMIT 500
`;

export const BOXING_LEGENDS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q5;
        wdt:P106 wd:Q10873124.
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY ?itemLabel
LIMIT 500
`;

export const TENNIS_LEGENDS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q5;
        wdt:P106 wd:Q10833314.
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY ?itemLabel
LIMIT 500
`;

// --- Sports (guess-the-sport) ---

export const SPORTS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?logo ?image WHERE {
  ?item wdt:P31/wdt:P279* wd:Q349.
  OPTIONAL { ?item wdt:P154 ?logo }
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY ?itemLabel
LIMIT 200
`;

/** Manual fallback when Wikidata sport images are sparse or inconsistent. */
export const SPORTS_FALLBACK: Array<{ name: string; image_url: string | null }> = [
  { name: "Association football", image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Football_%28soccer_ball%29.svg/120px-Football_%28soccer_ball%29.svg.png" },
  { name: "Basketball", image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Basketball.png/120px-Basketball.png" },
  { name: "Tennis", image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Tennis_ball.svg/120px-Tennis_ball.svg.png" },
  { name: "Baseball", image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Baseball_%28crop%29.jpg/120px-Baseball_%28crop%29.jpg" },
  { name: "American football", image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/American_Football_ball.svg/120px-American_Football_ball.svg.png" },
  { name: "Cricket", image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Cricket_ball.svg/120px-Cricket_ball.svg.png" },
  { name: "Rugby union", image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Rugby_ball.svg/120px-Rugby_ball.svg.png" },
  { name: "Golf", image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Golf_ball.svg/120px-Golf_ball.svg.png" },
  { name: "Swimming", image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Olympic_swimming_pictogram.svg/120px-Olympic_swimming_pictogram.svg.png" },
  { name: "Athletics", image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Athletics_pictogram.svg/120px-Athletics_pictogram.svg.png" },
  { name: "Boxing", image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Boxing_pictogram.svg/120px-Boxing_pictogram.svg.png" },
  { name: "Volleyball", image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Volleyball_%28indoor%29_pictogram.svg/120px-Volleyball_%28indoor%29_pictogram.svg.png" },
  { name: "Ice hockey", image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Ice_hockey_pictogram.svg/120px-Ice_hockey_pictogram.svg.png" },
  { name: "Cycling", image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Cycling_%28road%29_pictogram.svg/120px-Cycling_%28road%29_pictogram.svg.png" },
  { name: "Martial arts", image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Judo_pictogram.svg/120px-Judo_pictogram.svg.png" },
];

// --- Events ---

export const NATURAL_CATASTROPHES_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q8065.
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY ?itemLabel
LIMIT 300
`;

export const HISTORICAL_EVENTS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  {
    ?item wdt:P31 wd:Q1190554.
  } UNION {
    ?item wdt:P31 wd:Q178561.
  }
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY ?itemLabel
LIMIT 500
`;

export const OLYMPIC_MOMENTS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q159821.
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY ?itemLabel
LIMIT 300
`;

export const SPORTING_EVENTS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q16510064.
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY ?itemLabel
LIMIT 500
`;

export const SPACE_AND_SCIENCE_MILESTONES_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q1656682.
  OPTIONAL {
    ?item wdt:P921 ?subject.
    ?subject wdt:P31/wdt:P279* ?subjectType.
    VALUES ?subjectType { wd:Q336 wd:Q124964 wd:Q901 wd:Q8078 }
  }
  OPTIONAL { ?item wdt:P18 ?image }
  ${LABEL_SERVICE}
}
ORDER BY ?itemLabel
LIMIT 300
`;

// --- Logos ---

export const COMPANY_LOGOS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?logo WHERE {
  ?item wdt:P31 wd:Q4830453;
        wdt:P154 ?logo.
  ${LABEL_SERVICE}
}
ORDER BY ?itemLabel
LIMIT 500
`;

export const FOOTBALL_CLUB_LOGOS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?logo WHERE {
  ?item wdt:P31 wd:Q476028;
        wdt:P154 ?logo.
  ${LABEL_SERVICE}
}
ORDER BY ?itemLabel
LIMIT 500
`;

export const BASKETBALL_TEAM_LOGOS_SPARQL = `
${SPARQL_PREFIXES}
SELECT ?item ?itemLabel ?logo WHERE {
  ?item wdt:P31 wd:Q13393265;
        wdt:P154 ?logo.
  ${LABEL_SERVICE}
}
ORDER BY ?itemLabel
LIMIT 500
`;

// --- Theme registry ---

export type ImageBinding = "image" | "logo" | "logo-or-image";

export type ThemeDefinition = {
  name: string;
  query: string;
  imageBinding: ImageBinding;
  /** If true, only rows with name + image count as usable. */
  requireImage: boolean;
  /** Used when Wikidata alone is unreliable for this category. */
  fallbackItems?: Array<{ name: string; image_url: string | null }>;
  /** Themes that often need manual curation — extra warning when below threshold. */
  manualCurationHint?: boolean;
};

export const MIN_USABLE_RESULTS = 10;

export const THEME_DEFINITIONS: ThemeDefinition[] = [
  { name: "Kenyan Politicians", query: KENYAN_POLITICIANS_SPARQL, imageBinding: "image", requireImage: true },
  { name: "Kenyan Artists", query: KENYAN_ARTISTS_SPARQL, imageBinding: "image", requireImage: true },
  { name: "Kenyan Bands", query: KENYAN_BANDS_SPARQL, imageBinding: "logo-or-image", requireImage: true },
  { name: "Kenyan Actors", query: KENYAN_ACTORS_SPARQL, imageBinding: "image", requireImage: true },
  { name: "Hollywood Actors", query: HOLLYWOOD_ACTORS_SPARQL, imageBinding: "image", requireImage: true },
  { name: "UK Actors", query: UK_ACTORS_SPARQL, imageBinding: "image", requireImage: true },
  { name: "USA Musicians", query: USA_MUSICIANS_SPARQL, imageBinding: "image", requireImage: true },
  { name: "USA Rappers", query: USA_RAPPERS_SPARQL, imageBinding: "image", requireImage: true },
  { name: "UK Musicians", query: UK_MUSICIANS_SPARQL, imageBinding: "image", requireImage: true },
  { name: "UK Rappers", query: UK_RAPPERS_SPARQL, imageBinding: "image", requireImage: true },
  { name: "Kenyan Athletes", query: KENYAN_ATHLETES_SPARQL, imageBinding: "image", requireImage: true },
  { name: "Global Football Legends", query: GLOBAL_FOOTBALL_LEGENDS_SPARQL, imageBinding: "image", requireImage: true },
  { name: "Basketball Legends", query: BASKETBALL_LEGENDS_SPARQL, imageBinding: "image", requireImage: true },
  { name: "Track and Field Legends", query: TRACK_AND_FIELD_LEGENDS_SPARQL, imageBinding: "image", requireImage: true },
  { name: "Boxing Legends", query: BOXING_LEGENDS_SPARQL, imageBinding: "image", requireImage: true },
  { name: "Tennis Legends", query: TENNIS_LEGENDS_SPARQL, imageBinding: "image", requireImage: true },
  { name: "Sports", query: SPORTS_SPARQL, imageBinding: "logo-or-image", requireImage: true, fallbackItems: SPORTS_FALLBACK },
  { name: "Natural Catastrophes", query: NATURAL_CATASTROPHES_SPARQL, imageBinding: "image", requireImage: false },
  { name: "Historical Events", query: HISTORICAL_EVENTS_SPARQL, imageBinding: "image", requireImage: false },
  { name: "Olympic Moments", query: OLYMPIC_MOMENTS_SPARQL, imageBinding: "image", requireImage: false, manualCurationHint: true },
  { name: "Sporting Events", query: SPORTING_EVENTS_SPARQL, imageBinding: "image", requireImage: false },
  { name: "Space and Science Milestones", query: SPACE_AND_SCIENCE_MILESTONES_SPARQL, imageBinding: "image", requireImage: false, manualCurationHint: true },
  { name: "Company Logos", query: COMPANY_LOGOS_SPARQL, imageBinding: "logo", requireImage: true },
  { name: "Football Club Logos", query: FOOTBALL_CLUB_LOGOS_SPARQL, imageBinding: "logo", requireImage: true },
  { name: "Basketball Team Logos", query: BASKETBALL_TEAM_LOGOS_SPARQL, imageBinding: "logo", requireImage: true },
];

export const THEME_BY_KEY: Record<string, ThemeDefinition> = Object.fromEntries(
  THEME_DEFINITIONS.map((def) => [normalizeThemeKey(def.name), def])
);

function normalizeThemeKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveImageUrl(binding: SparqlBinding, imageBinding: ImageBinding): string | null {
  const image = binding.image?.value ?? null;
  const logo = binding.logo?.value ?? null;
  if (imageBinding === "logo") return logo;
  if (imageBinding === "logo-or-image") return logo ?? image;
  return image;
}

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";

type SparqlBinding = { [key: string]: { type: string; value: string } };

type ThemeItem = { name: string; image_url: string | null };

async function fetchSparql(query: string, retries = 2) {
  const url = `${WIKIDATA_ENDPOINT}?query=` + encodeURIComponent(query);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/sparql-results+json",
          "User-Agent": "guess-the-person-fetch-script/1.0 (https://example.com)",
        },
      });
      if (res.status === 429 || res.status === 504) {
        throw new Error(`Wikidata SPARQL error: ${res.status} ${res.statusText}`);
      }
      if (!res.ok) throw new Error(`Wikidata SPARQL error: ${res.status} ${res.statusText}`);
      return (await res.json()) as { head: unknown; results: { bindings: SparqlBinding[] } };
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const delayMs = 2000 * (attempt + 1);
        console.warn(`Wikidata request failed (attempt ${attempt + 1}/${retries + 1}); retrying in ${delayMs}ms…`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  throw lastError;
}

function parseBindings(bindings: SparqlBinding[], def: ThemeDefinition): ThemeItem[] {
  const seen = new Set<string>();
  const items: ThemeItem[] = [];

  for (const binding of bindings) {
    const name = binding.itemLabel?.value?.trim();
    if (!name || (/^Q\d+$/.test(name))) continue;

    const image_url = resolveImageUrl(binding, def.imageBinding);
    const dedupeKey = name.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    items.push({ name, image_url });
  }

  return items;
}

function countUsable(items: ThemeItem[], requireImage: boolean): number {
  return items.filter((item) => item.name && (!requireImage || item.image_url)).length;
}

function mergeWithFallback(items: ThemeItem[], fallback: ThemeItem[]): ThemeItem[] {
  const byName = new Map<string, ThemeItem>();
  for (const item of items) byName.set(item.name.toLowerCase(), item);
  for (const item of fallback) {
    const key = item.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, item);
  }
  return Array.from(byName.values());
}

// NOTE: previously this script imported the app's Supabase client (built with
// the anon key) via a getSupabase() helper. That client is subject to Row
// Level Security, so every insert/update from this script was silently
// rejected. Fixed by using `supabaseAdmin` (service role key, defined at the
// top of this file) directly for all writes below instead.

async function upsertThemeItems(theme: string, items: ThemeItem[]) {
  const supabase = supabaseAdmin;
  let inserted = 0;
  let updated = 0;

  for (const it of items) {
    const { data: existing, error: selErr } = await supabase
      .from("theme_items")
      .select("id,image_url")
      .eq("theme", theme)
      .eq("name", it.name)
      .limit(1)
      .maybeSingle();

    if (selErr) {
      console.error("select error", selErr);
      continue;
    }

    if (existing && existing.image_url !== it.image_url) {
      const { error: updErr } = await supabase
        .from("theme_items")
        .update({ image_url: it.image_url })
        .eq("id", existing.id);
      if (updErr) console.error("update error", updErr);
      else updated++;
    } else if (!existing) {
      const { error: insErr } = await supabase
        .from("theme_items")
        .insert({ theme, name: it.name, image_url: it.image_url });
      if (insErr) console.error("insert error", insErr);
      else inserted++;
    }
  }

  return { inserted, updated };
}

async function fetchAndUpsertTheme(def: ThemeDefinition) {
  const { name: theme } = def;
  console.log(`\nRunning SPARQL for theme: ${theme}`);

  let items: ThemeItem[];
  try {
    const json = await fetchSparql(def.query);
    items = parseBindings(json.results.bindings, def);
  } catch (err) {
    console.error(`Failed to fetch Wikidata for "${theme}":`, err);
    items = [];
  }

  console.log(`Fetched ${items.length} total results from Wikidata.`);

  let usable = countUsable(items, def.requireImage);
  console.log(`Usable results (name${def.requireImage ? " + image" : ""}): ${usable}`);

  if (usable < MIN_USABLE_RESULTS && def.fallbackItems?.length) {
    console.warn(
      `Theme "${theme}" has fewer than ${MIN_USABLE_RESULTS} usable Wikidata results; merging manual fallback list (${def.fallbackItems.length} items).`
    );
    items = mergeWithFallback(items, def.fallbackItems);
    usable = countUsable(items, def.requireImage);
    console.log(`After fallback merge: ${items.length} total, ${usable} usable.`);
  }

  if (usable < MIN_USABLE_RESULTS) {
    console.warn(
      `⚠ Skipping upsert for "${theme}": only ${usable} usable results (minimum ${MIN_USABLE_RESULTS}).` +
        (def.manualCurationHint
          ? " This category likely needs a manually curated fallback list."
          : " Consider adding or refining a manual fallback list.")
    );
    return { theme, skipped: true, total: items.length, usable };
  }

  try {
    const result = await upsertThemeItems(theme, items);
    console.log(`Upsert result for "${theme}": ${JSON.stringify(result)}`);
    return { theme, skipped: false, total: items.length, usable, ...result };
  } catch (err) {
    console.error(`Failed to upsert "${theme}" (Supabase may be unconfigured):`, err);
    return { theme, skipped: true, total: items.length, usable, upsertError: true };
  }
}

/** Back-compat: run a raw theme name + query string. */
async function fetchAndUpsert(theme: string, query: string) {
  const def: ThemeDefinition = {
    name: theme,
    query,
    imageBinding: "image",
    requireImage: true,
  };
  return fetchAndUpsertTheme(def);
}

function parseCliArgs(argv: string[]) {
  const args = argv.slice(2);
  let themeFlag: string | undefined;
  let list = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--list") {
      list = true;
    } else if (arg === "--theme") {
      themeFlag = args[i + 1];
      i++;
    } else if (arg.startsWith("--theme=")) {
      themeFlag = arg.slice("--theme=".length);
    }
  }

  return { themeFlag, list };
}

function printThemeList() {
  console.log("Available themes:");
  for (const def of THEME_DEFINITIONS) {
    const tags = [
      def.manualCurationHint ? "manual curation likely" : null,
      def.fallbackItems ? "has fallback list" : null,
    ]
      .filter(Boolean)
      .join(", ");
    console.log(`  - ${def.name}${tags ? ` (${tags})` : ""}`);
  }
  console.log('\nUsage: npx tsx scripts/fetchWikidata.ts --theme "Theme Name"');
  console.log("       npx tsx scripts/fetchWikidata.ts --theme all");
}

async function runThemes(themeFlag: string) {
  if (normalizeThemeKey(themeFlag) === "all") {
    const results = [];
    for (const def of THEME_DEFINITIONS) {
      results.push(await fetchAndUpsertTheme(def));
      // Be polite to the public Wikidata endpoint when running many queries.
      await new Promise((r) => setTimeout(r, 1000));
    }
    console.log("\n--- Summary ---");
    for (const r of results) {
      console.log(
        `${r.theme}: ${r.skipped ? "SKIPPED" : "OK"} (${r.usable} usable / ${r.total} total)`
      );
    }
    return;
  }

  const def = THEME_BY_KEY[normalizeThemeKey(themeFlag)];
  if (!def) {
    console.error(`Unknown theme: "${themeFlag}"`);
    printThemeList();
    process.exit(1);
  }

  await fetchAndUpsertTheme(def);
}

if (require.main === module) {
  const { themeFlag, list } = parseCliArgs(process.argv);

  if (list) {
    printThemeList();
    process.exit(0);
  }

  if (!themeFlag) {
    console.error('Usage: npx tsx scripts/fetchWikidata.ts --theme "Theme Name"');
    console.error("       npx tsx scripts/fetchWikidata.ts --theme all");
    console.error("       npx tsx scripts/fetchWikidata.ts --list");
    process.exit(1);
  }

  runThemes(themeFlag).catch((err) => {
    console.error(err);
    process.exit(2);
  });
}

export { fetchAndUpsert, fetchAndUpsertTheme, normalizeThemeKey, parseBindings, countUsable };
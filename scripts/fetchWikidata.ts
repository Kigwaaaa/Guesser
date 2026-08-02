/**
 * Script: fetchWikidata.ts
 * Usage (example):
 *  - With ts-node: `npx ts-node scripts/fetchWikidata.ts "Kenyan Politicians" "<SPARQL_QUERY>"`
 *  - Or compile and run with node after tsc: `node dist/scripts/fetchWikidata.js "Theme" "<SPARQL>"`
 *
 * This script runs a SPARQL query against the Wikidata Query Service and upserts
 * the returned `name` + optional `image_url` into the Supabase `theme_items` table.
 *
 * SPARQL query structure (what to select):
 *  - ?item       : the Wikidata entity IRI (not used directly here but useful for debugging)
 *  - ?itemLabel  : human-readable English label for the entity (we store as `name`)
 *  - ?image      : optional image property (Wikidata P18) — store as `image_url`
 *
 * The two example queries below follow this pattern and request `?item ?itemLabel ?image`.
 */

import { supabase } from "../lib/supabaseClient";

// Example SPARQL: Kenyan Politicians
export const KENYAN_POLITICIANS_SPARQL = `
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wd: <http://www.wikidata.org/entity/>

SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q5;        # instance of human
        wdt:P106 wd:Q82955;   # occupation: politician
        wdt:P27 wd:Q114.      # country of citizenship: Kenya
  OPTIONAL { ?item wdt:P18 ?image }   # image (P18) when available
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 200
`;

// Example SPARQL: Global Football Legends (association football players)
export const GLOBAL_FOOTBALL_LEGENDS_SPARQL = `
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wd: <http://www.wikidata.org/entity/>

SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P31 wd:Q5;        # instance of human
        wdt:P641 wd:Q2736.    # sport: association football
  OPTIONAL { ?item wdt:P18 ?image }   # image (P18) when available
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY ?itemLabel
LIMIT 500
`;

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";

type SparqlBinding = { [key: string]: { type: string; value: string } };

async function fetchSparql(query: string) {
  const url = `${WIKIDATA_ENDPOINT}?query=` + encodeURIComponent(query);
  const res = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "guess-the-person-fetch-script/1.0 (https://example)"
    },
  });
  if (!res.ok) throw new Error(`Wikidata SPARQL error: ${res.status} ${res.statusText}`);
  return (await res.json()) as { head: any; results: { bindings: SparqlBinding[] } };
}

async function upsertThemeItems(theme: string, items: Array<{ name: string; image_url: string | null }>) {
  let inserted = 0;
  let updated = 0;

  for (const it of items) {
    // Check for existing row by theme + name to avoid duplicate entries.
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

    if (existing && (existing.image_url !== it.image_url)) {
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

async function fetchAndUpsert(theme: string, query: string) {
  console.log(`Running SPARQL for theme: ${theme}`);
  const json = await fetchSparql(query);
  const bindings = json.results.bindings;

  const items = bindings.map((b) => {
    const name = b.itemLabel?.value ?? null;
    const image = b.image?.value ?? null;
    return { name, image_url: image };
  }).filter((x) => x.name);

  console.log(`Fetched ${items.length} items from Wikidata.`);
  const result = await upsertThemeItems(theme, items as any);
  console.log(`Upsert result: ${JSON.stringify(result)}`);
}

// CLI entrypoint: node scripts/fetchWikidata.ts "Theme" "<SPARQL_QUERY>"
if (require.main === module) {
  const [, , themeArg, queryArg] = process.argv;
  if (!themeArg || !queryArg) {
    console.error("Usage: npx ts-node scripts/fetchWikidata.ts \"Theme Name\" \"<SPARQL_QUERY>\"");
    console.error("Or import the script and call fetchAndUpsert(theme, query) from another runner.");
    process.exit(1);
  }

  fetchAndUpsert(themeArg, queryArg).catch((err) => {
    console.error(err);
    process.exit(2);
  });
}

export { fetchAndUpsert };
// Wikidata import script placeholder for populating theme items.
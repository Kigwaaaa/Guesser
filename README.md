# Guess the Person

A real-time, mobile-first party game for 2–4 players. Everyone gets secretly assigned an identity (a person, athlete, sport, historical event, or logo) that **every other player can see except them**. Ask one yes/no question per turn — out loud, no in-app chat needed — and be the first to guess who (or what) you are.

No app store, no install required: it's a Progressive Web App (PWA), so it runs straight from a browser link and can be added to your home screen.

## How it works

1. **Host creates a room** — picks a theme (see below) and a target player count (2–4), gets a room code.
2. **Others join** with the room code from their own phone.
3. The host starts whenever ready — the game runs with however many players have actually joined, even if it's fewer than the target.
4. Each player is secretly assigned an item from the chosen theme. Your own card is hidden from you; everyone else's is visible.
5. Turn order is fixed. On your turn, ask one yes/no question out loud to the group.
6. Whenever you think you know the answer, say your guess out loud and tap **"I'm guessing now"**.
7. Every other player taps **Reveal** to confirm. Once everyone has, your identity is revealed with a quick unmask animation and you're assigned your finishing rank (1st, 2nd, 3rd...).
8. If a player leaves mid-game, their turn is skipped automatically.
9. The game ends once everyone has been revealed — final rankings are shown.

## Themes

Themes are grouped by category, each pulling from [Wikidata](https://www.wikidata.org/) and cached locally so gameplay never depends on a live API call:

- **People** — Kenyan Politicians, Kenyan Artists, Kenyan Bands, Kenyan Actors, Hollywood Actors, UK Actors, USA Musicians, USA Rappers, UK Musicians, UK Rappers
- **Athletes** — Kenyan Athletes, Global Football Legends, Basketball Legends, Track & Field Legends, Boxing Legends, Tennis Legends
- **Sports** — Football, Basketball, Rugby, Cricket, Athletics, Boxing, Tennis, Volleyball, Swimming, Golf, Formula 1, Cycling, Wrestling, Table Tennis, Badminton
- **Events** — Natural Catastrophes, Historical Events, Olympic Moments, Sporting Events, Space/Science Milestones
- **Logos** — Company Logos, Football Club Logos, Basketball Team Logos

## Tech stack

- **Next.js 14** (App Router) + **TypeScript** — frontend
- **Tailwind CSS** — styling
- **Supabase** — Postgres database + Realtime channels for live multiplayer sync across devices
- **Wikidata SPARQL API** — sourcing names/images per theme, cached into Supabase rather than queried live during play
- **next-pwa** — installable, home-screen-ready experience

## Project structure

```
app/
├── page.tsx                 # landing: create or join
├── create/page.tsx          # host: pick theme + player count
├── join/page.tsx            # enter room code + name
└── room/[code]/
    ├── page.tsx              # lobby (waiting for players)
    └── game/page.tsx         # main game screen
components/
├── ExplainerCards.tsx        # first-time how-to-play, swipeable
├── ThemeSelector.tsx
├── PlayerCountSelector.tsx
├── PlayerCard.tsx            # shows a player's identity or silhouette
├── RevealButton.tsx
├── RankBadge.tsx              # 1st / 2nd / 3rd / 4th
└── UnmaskAnimation.tsx
lib/
├── supabaseClient.ts
├── gameEngine.ts              # turn order, reveal consensus, assignment logic
└── types.ts
scripts/
└── fetchWikidata.ts           # populates theme_items table per theme
supabase/
└── schema.sql
```

## Getting started

### Prerequisites
- Node.js 18+
- A free [Supabase](https://supabase.com) project

### Setup

```bash
git clone https://github.com/<your-username>/guess-the-person.git
cd guess-the-person
npm install
```

Copy the environment example and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Run the schema against your Supabase project:

```bash
# in the Supabase SQL editor, run supabase/schema.sql
```

Populate a theme with live data from Wikidata:

```bash
npx tsx scripts/fetchWikidata.ts --theme "Kenyan Politicians"
```

Start the dev server:

```bash
npm run dev
```

### Deploying

Deployed on [Vercel](https://vercel.com) — connect the GitHub repo, add the same environment variables in the Vercel project settings, and deploy. The app is installable as a PWA once served over HTTPS.

## Notes

- Reveal is currently the only in-game control for guesses — a wrong guess isn't tracked by the app; the group just moves on verbally.
- Image URLs are linked directly from Wikimedia Commons rather than downloaded — fine for casual use, but a source worth revisiting if long-term reliability matters.
- iOS Safari doesn't support automatic PWA install prompts — users need to manually tap Share → "Add to Home Screen."

## License

MIT

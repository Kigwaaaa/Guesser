-- Core Supabase schema for rooms, players, cached identities, and reveal votes.

-- Supabase uses this extension to generate UUID defaults for new records.
create extension if not exists pgcrypto;

create table public.rooms (
	code text primary key,
	theme text not null,
	pending_guess_player_id uuid null,
	target_player_count integer not null check (target_player_count > 0),
	status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
	current_turn_index integer not null default 0 check (current_turn_index >= 0),
	created_at timestamptz not null default timezone('utc', now())
);

comment on column public.rooms.code is 'Short unique code that players use to join this room.';
comment on column public.rooms.theme is 'Theme selected by the host for this game.';
comment on column public.rooms.target_player_count is 'Number of players the host expects before starting the game.';
comment on column public.rooms.status is 'Lifecycle state of the room: waiting, playing, or finished.';
comment on column public.rooms.current_turn_index is 'Zero-based turn order index for the active guesser.';
comment on column public.rooms.created_at is 'UTC timestamp for when the room was created.';

create table public.players (
	id uuid primary key default gen_random_uuid(),
	room_code text not null references public.rooms (code) on delete cascade,
	name text not null check (char_length(trim(name)) > 0),
	turn_order_index integer not null check (turn_order_index >= 0),
	is_eliminated boolean not null default false,
	rank integer check (rank is null or rank > 0),
	joined_at timestamptz not null default timezone('utc', now()),
	unique (room_code, turn_order_index)
);

comment on column public.players.id is 'Unique identifier for this player.';
comment on column public.players.room_code is 'Code of the room this player joined.';
comment on column public.players.name is 'Display name entered by the player.';
comment on column public.players.turn_order_index is 'Zero-based position used to determine turn order.';
comment on column public.players.is_eliminated is 'Whether this player has been eliminated from the current game.';
comment on column public.players.rank is 'Final placement for the player, or null until they finish.';
comment on column public.players.joined_at is 'UTC timestamp for when the player joined the room.';

create table public.theme_items (
	id uuid primary key default gen_random_uuid(),
	theme text not null,
	name text not null,
	image_url text
);

comment on column public.theme_items.id is 'Unique identifier for the cached theme item.';
comment on column public.theme_items.theme is 'Theme that groups this cached Wikidata identity.';
comment on column public.theme_items.name is 'Display name of the cached identity from Wikidata.';
comment on column public.theme_items.image_url is 'Optional cached image URL for the Wikidata identity.';

create table public.player_assignments (
	player_id uuid primary key references public.players (id) on delete cascade,
	theme_item_id uuid not null references public.theme_items (id) on delete restrict
);

comment on column public.player_assignments.player_id is 'Player receiving the assigned hidden identity.';
comment on column public.player_assignments.theme_item_id is 'Cached theme item representing the assigned identity.';

create table public.reveal_confirmations (
	room_code text not null references public.rooms (code) on delete cascade,
	guesser_player_id uuid not null references public.players (id) on delete cascade,
	confirming_player_id uuid not null references public.players (id) on delete cascade,
	primary key (room_code, guesser_player_id, confirming_player_id)
);

comment on column public.reveal_confirmations.room_code is 'Room containing the current guess attempt.';
comment on column public.reveal_confirmations.guesser_player_id is 'Player whose identity is being considered for reveal.';
comment on column public.reveal_confirmations.confirming_player_id is 'Player who tapped Reveal for this guess attempt.';

-- Publish room and player changes so clients can update lobby and game state live.
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.player_assignments;
alter publication supabase_realtime add table public.reveal_confirmations;
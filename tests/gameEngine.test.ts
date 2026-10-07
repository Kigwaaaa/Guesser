import { describe, it, expect } from 'vitest';
import FakeSupabase from './fakeSupabase';
import * as gameEngine from '../lib/gameEngine';

const { startGame, advanceTurn, confirmReveal, startGuess, revealGuess, resetRoom } = gameEngine;

describe('gameEngine unit tests (with FakeSupabase)', () => {
  it('assignment logic never gives two players the same theme_item', async () => {
    const db = new FakeSupabase();
    // create room
    const room = { code: 'ABCD', theme: 'people', current_turn_index: 0 };
    db.tables.rooms.push(room);
    // create theme items
    db.tables.theme_items.push({ id: 't1', theme: 'people', name: 'A' });
    db.tables.theme_items.push({ id: 't2', theme: 'people', name: 'B' });
    db.tables.theme_items.push({ id: 't3', theme: 'people', name: 'C' });
    // players
    db.tables.players.push({ id: 'p1', room_code: 'ABCD', joined_at: 1 });
    db.tables.players.push({ id: 'p2', room_code: 'ABCD', joined_at: 2 });

    const res = await startGame('ABCD', db as any);
    expect(res.success).toBe(true);

    const assigned = db.tables.player_assignments.map((a: any) => a.theme_item_id);
    const unique = new Set(assigned);
    expect(unique.size).toBe(assigned.length);
  });

  it('turn order skips eliminated players and players who left', async () => {
    const db = new FakeSupabase();
    db.tables.rooms.push({ code: 'R1', current_turn_index: 0, status: 'playing' });
    db.tables.players.push({ id: 'a', room_code: 'R1', turn_order_index: 0, is_eliminated: false });
    db.tables.players.push({ id: 'b', room_code: 'R1', turn_order_index: 1, is_eliminated: true });
    db.tables.players.push({ id: 'c', room_code: 'R1', turn_order_index: 2, is_eliminated: false });

    const adv = await advanceTurn('R1', db as any);
    expect(adv.success).toBe(true);
    // next should be c (turn_order_index 2)
    const room = db.tables.rooms.find((r:any)=>r.code==='R1') as any;
    expect(room).toBeDefined();
    expect(room!.current_turn_index).toBe(2);
  });

  it('reveal only eliminates after all confirmations', async () => {
    const db = new FakeSupabase();
    db.tables.rooms.push({ code: 'R2', current_turn_index: 0 });
    db.tables.players.push({ id: 'g', room_code: 'R2', turn_order_index: 0, is_eliminated: false });
    db.tables.players.push({ id: 'x', room_code: 'R2', turn_order_index: 1, is_eliminated: false });
    db.tables.players.push({ id: 'y', room_code: 'R2', turn_order_index: 2, is_eliminated: false });

    // start guess by g
    await startGuess('R2', 'g', db as any);

    // only one confirmation - should not eliminate
    let r1 = await confirmReveal('R2', 'g', 'x', db as any);
    expect(r1.success).toBe(true);
    const pG = db.tables.players.find((p:any)=>p.id==='g') as any;
    expect(pG).toBeDefined();
    expect(pG!.is_eliminated).toBeFalsy();

    // second confirmation - now all non-eliminated non-guesser confirmed -> eliminated
    let r2 = await confirmReveal('R2', 'g', 'y', db as any);
    expect(r2.success).toBe(true);
    const pG2 = db.tables.players.find((p:any)=>p.id==='g') as any;
    expect(pG2).toBeDefined();
    expect(pG2!.is_eliminated).toBeTruthy();
  });

  it('rank assignment increments correctly and never duplicates', async () => {
    const db = new FakeSupabase();
    db.tables.rooms.push({ code: 'R3', current_turn_index: 0, status: 'playing' });
    db.tables.players.push({ id: 'p1', room_code: 'R3', turn_order_index: 0, is_eliminated: false, rank: null });
    db.tables.players.push({ id: 'p2', room_code: 'R3', turn_order_index: 1, is_eliminated: false, rank: 1 });

    const res = await ((gameEngine as any).eliminatePlayer ? (gameEngine as any).eliminatePlayer('R3', 'p1', db as any) : { success: false });
    expect(res.success).toBe(true);

    const ranks = db.tables.players.map((p:any)=>p.rank).filter((rank:any) => rank != null);
    const unique = new Set(ranks);
    expect(unique.size).toBe(ranks.length);
    const p1 = db.tables.players.find((p:any)=>p.id==='p1') as any;
    expect(p1).toBeDefined();
    expect(p1!.rank).toBe(2);
  });

  it('game status flips to finished only when every player eliminated', async () => {
    const db = new FakeSupabase();
    db.tables.rooms.push({ code: 'RF', current_turn_index: 0, status: 'playing' });
    db.tables.players.push({ id: 'a', room_code: 'RF', turn_order_index: 0, is_eliminated: false });

    // eliminate the only player
    db.tables.players[0].is_eliminated = true;
    // advanceTurn should detect no active players and finish room
    const adv = await advanceTurn('RF', db as any);
    expect(adv.success).toBe(true);
    const room = db.tables.rooms.find((r:any)=>r.code==='RF') as any;
    expect(room).toBeDefined();
    expect(room!.status).toBe('finished');
  });

  it('force reveal resolves immediately without waiting for all confirmations', async () => {
    const db = new FakeSupabase();
    db.tables.rooms.push({ code: 'R4', current_turn_index: 0, status: 'playing', pending_guess_player_id: 'g' });
    db.tables.players.push({ id: 'g', room_code: 'R4', turn_order_index: 0, is_eliminated: false });
    db.tables.players.push({ id: 'x', room_code: 'R4', turn_order_index: 1, is_eliminated: false });
    db.tables.players.push({ id: 'y', room_code: 'R4', turn_order_index: 2, is_eliminated: false });

    const res = await revealGuess('R4', 'g', db as any);
    expect(res.success).toBe(true);
    const g = db.tables.players.find((p:any)=>p.id==='g') as any;
    expect(g).toBeDefined();
    expect(g!.is_eliminated).toBeTruthy();
    const room = db.tables.rooms.find((r:any)=>r.code==='R4') as any;
    expect(room).toBeDefined();
    expect(room!.pending_guess_player_id).toBeNull();
  });

  it('reset round clears eliminations and ranks for a new game', async () => {
    const db = new FakeSupabase();
    db.tables.rooms.push({ code: 'R5', theme: 'people', current_turn_index: 2, status: 'finished', pending_guess_player_id: 'p1' });
    db.tables.players.push({ id: 'p1', room_code: 'R5', turn_order_index: 0, is_eliminated: true, rank: 2, joined_at: 1 });
    db.tables.players.push({ id: 'p2', room_code: 'R5', turn_order_index: 1, is_eliminated: false, rank: 1, joined_at: 2 });
    db.tables.theme_items.push({ id: 't1', theme: 'people', name: 'A' });
    db.tables.theme_items.push({ id: 't2', theme: 'people', name: 'B' });
    db.tables.reveal_confirmations.push({ room_code:'R5', guesser_player_id:'p1', confirming_player_id:'p2' });

    const res = await resetRoom('R5', db as any);
    expect(res.success).toBe(true);

    const room = db.tables.rooms.find((r:any)=>r.code==='R5') as any;
    expect(room).toBeDefined();
    expect(room!.status).toBe('playing');
    expect(room!.current_turn_index).toBe(0);
    expect(room!.pending_guess_player_id).toBeNull();
    expect(db.tables.players.every((p:any)=>!p.is_eliminated)).toBeTruthy();
    expect(db.tables.players.every((p:any)=>p.rank == null)).toBeTruthy();
    expect(db.tables.reveal_confirmations.length).toBe(0);
  });

  it('reset round can switch to a new theme while resetting the board', async () => {
    const db = new FakeSupabase();
    db.tables.rooms.push({ code: 'R6', theme: 'people', current_turn_index: 2, status: 'finished', pending_guess_player_id: 'p1' });
    db.tables.players.push({ id: 'p1', room_code: 'R6', turn_order_index: 0, is_eliminated: true, rank: 2, joined_at: 1 });
    db.tables.players.push({ id: 'p2', room_code: 'R6', turn_order_index: 1, is_eliminated: false, rank: 1, joined_at: 2 });
    db.tables.theme_items.push({ id: 't1', theme: 'people', name: 'A' });
    db.tables.theme_items.push({ id: 't2', theme: 'people', name: 'B' });
    db.tables.theme_items.push({ id: 't3', theme: 'movies', name: 'C' });
    db.tables.theme_items.push({ id: 't4', theme: 'movies', name: 'D' });

    const res = await resetRoom('R6', db as any, 'movies');
    expect(res.success).toBe(true);

    const room = db.tables.rooms.find((r:any)=>r.code==='R6') as any;
    expect(room).toBeDefined();
    expect(room!.theme).toBe('movies');
    expect(room!.status).toBe('playing');
    expect(db.tables.players.every((p:any)=>!p.is_eliminated)).toBeTruthy();
    expect(db.tables.players.every((p:any)=>p.rank == null)).toBeTruthy();
  });
});

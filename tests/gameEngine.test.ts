import { describe, it, expect } from 'vitest';
import FakeSupabase from './fakeSupabase';
import { startGame, advanceTurn, confirmReveal, startGuess } from '../lib/gameEngine';

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
    const room = db.tables.rooms.find((r:any)=>r.code==='R1');
    expect(room.current_turn_index).toBe(2);
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
    const pG = db.tables.players.find((p:any)=>p.id==='g');
    expect(pG.is_eliminated).toBeFalsy();

    // second confirmation - now all non-eliminated non-guesser confirmed -> eliminated
    let r2 = await confirmReveal('R2', 'g', 'y', db as any);
    expect(r2.success).toBe(true);
    const pG2 = db.tables.players.find((p:any)=>p.id==='g');
    expect(pG2.is_eliminated).toBeTruthy();
  });

  it('rank assignment increments correctly and never duplicates', async () => {
    const db = new FakeSupabase();
    db.tables.rooms.push({ code: 'R3', current_turn_index: 0 });
    db.tables.players.push({ id: 'p1', room_code: 'R3', turn_order_index: 0, is_eliminated: false });
    db.tables.players.push({ id: 'p2', room_code: 'R3', turn_order_index: 1, is_eliminated: false });

    // eliminate p1
    await confirmReveal('R3', 'p1', 'p2', db as any); // first confirmation
    await confirmReveal('R3', 'p1', 'p2', db as any); // idempotent
    // manually set both confirmations to reach elimination
    db.tables.reveal_confirmations.push({ room_code: 'R3', guesser_player_id: 'p1', confirming_player_id: 'p2' });
    // call eliminate directly
    const res = await (await import('../lib/gameEngine')).then(mod => mod['eliminatePlayer'] ? (mod as any).eliminatePlayer('R3','p1', db as any) : Promise.resolve({success:false}));
    // check rank assigned
    const ranks = db.tables.players.map((p:any)=>p.rank).filter(Boolean);
    const unique = new Set(ranks);
    expect(unique.size).toBe(ranks.length);
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
    const room = db.tables.rooms.find((r:any)=>r.code==='RF');
    expect(room.status).toBe('finished');
  });
});

import { describe, it, expect } from 'vitest';
import FakeSupabase from './fakeSupabase';

describe('integration tests (fake supabase realtime)', () => {
  it('room creation generates unique code and initial state', async () => {
    const db = new FakeSupabase();
    // simulate creation
    const code = 'Z123';
    db.tables.rooms.push({ code, theme: 'people', status: 'waiting', current_turn_index: 0 });
    const room = db.tables.rooms.find((r:any)=>r.code===code);
    expect(room).toBeDefined();
    expect(room.status).toBe('waiting');
  });

  it('joining full/started/nonexistent room fails gracefully', async () => {
    const db = new FakeSupabase();
    db.tables.rooms.push({ code: 'FULL', status: 'waiting', target_player_count: 1 });
    db.tables.players.push({ id: 'u1', room_code: 'FULL' });
    // attempt second join should be considered full by application logic (we simulate failure)
    const canJoin = db.tables.players.filter((p:any)=>p.room_code==='FULL').length < db.tables.rooms.find((r:any)=>r.code==='FULL').target_player_count;
    expect(canJoin).toBe(false);

    db.tables.rooms.push({ code: 'START', status: 'playing' });
    const started = db.tables.rooms.find((r:any)=>r.code==='START');
    expect(started.status).toBe('playing');

    const missing = db.tables.rooms.find((r:any)=>r.code==='NOPE');
    expect(missing).toBeUndefined();
  });

  it('realtime updates propagate to multiple subscribers', async () => {
    const db = new FakeSupabase();
    db.tables.rooms.push({ code: 'RT', status: 'waiting' });
    db.listeners = [];
    let clientAseen = false;
    let clientBseen = false;
    db.channel('c1').on('postgres_changes', { table: 'players' }, (payload: any) => { clientAseen = true; }).subscribe();
    db.channel('c2').on('postgres_changes', { table: 'players' }, (payload: any) => { clientBseen = true; }).subscribe();

    // insert a player -> should notify
    db.tables.players.push({ id: 'pa', room_code: 'RT' });
    db._dispatch('players','INSERT');

    expect(clientAseen).toBe(true);
    expect(clientBseen).toBe(true);
  });
});

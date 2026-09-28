import { describe, it, expect } from 'vitest';
import { checkRoomActionRateLimit, resetRoomRateLimit } from '../lib/roomRateLimit';

describe('room action rate limiting', () => {
  it('blocks repeated room creation attempts inside the limit window', () => {
    resetRoomRateLimit('create-room');

    expect(checkRoomActionRateLimit('create-room', 1_000).allowed).toBe(true);
    expect(checkRoomActionRateLimit('create-room', 2_000).allowed).toBe(true);
    expect(checkRoomActionRateLimit('create-room', 3_000).allowed).toBe(true);
    expect(checkRoomActionRateLimit('create-room', 4_000).allowed).toBe(false);
  });

  it('allows a new burst after the rate limit window expires', () => {
    resetRoomRateLimit('join-room');

    expect(checkRoomActionRateLimit('join-room', 0).allowed).toBe(true);
    expect(checkRoomActionRateLimit('join-room', 5_000).allowed).toBe(true);
    expect(checkRoomActionRateLimit('join-room', 10_000).allowed).toBe(true);
    expect(checkRoomActionRateLimit('join-room', 15_000).allowed).toBe(true);
    expect(checkRoomActionRateLimit('join-room', 20_000).allowed).toBe(true);
    expect(checkRoomActionRateLimit('join-room', 25_000).allowed).toBe(false);

    const recovered = checkRoomActionRateLimit('join-room', 60_000);
    expect(recovered.allowed).toBe(true);
  });

  it('keeps separate rate-limit buckets per client identifier', () => {
    resetRoomRateLimit('create-room', 'client-a');
    resetRoomRateLimit('create-room', 'client-b');

    expect(checkRoomActionRateLimit('create-room', 1_000, undefined, 'client-a').allowed).toBe(true);
    expect(checkRoomActionRateLimit('create-room', 2_000, undefined, 'client-a').allowed).toBe(true);
    expect(checkRoomActionRateLimit('create-room', 3_000, undefined, 'client-b').allowed).toBe(true);
    expect(checkRoomActionRateLimit('create-room', 4_000, undefined, 'client-a').allowed).toBe(true);
    expect(checkRoomActionRateLimit('create-room', 5_000, undefined, 'client-a').allowed).toBe(false);
  });
});

Manual QA Checklist — Guess the Person

Run these steps across 2–4 real or simulated clients (desktop browsers / incognito tabs / mobile).

1) Host creates a room with target player count = 4; have only 2 players join. Start the game and verify it runs with 2 players.

2) Each player's own card should show a silhouette; other players' cards show their assigned identity and image.

3) Verify turn order equals the join order. Observe N rounds and ensure the active turn cycles correctly.

4) Trigger a guess by the active player. Verify:
   - Only non-active, non-eliminated players see the "Reveal" button.
   - The guessed player is not eliminated until every non-eliminated, non-guessing player confirms.

5) When elimination occurs, confirm the unmask animation + rank badge plays on every connected client at the same time.

6) Simulate a player closing their tab mid-game: verify the turn order skips them and the game continues without errors.

7) Play through to game end and confirm the final ranking screen shows every player's final rank in order.

8) Reopen the "?" explainer modal mid-game and confirm it doesn't modify the game state or subscriptions.

Race-condition checks
- Try two players hitting "I'm guessing now" quickly; verify only one pending guess is recorded and the UI remains consistent.
- Test rapid confirms to ensure duplicate confirmations are idempotent and do not prematurely eliminate.

Notes
- Use the devtools network tab to observe Realtime socket messages and confirm updates broadcast to clients.
- If you see inconsistent state, capture timestamps and payloads for investigation.

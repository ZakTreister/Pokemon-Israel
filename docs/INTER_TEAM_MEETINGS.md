# Inter-team meetings (2026-11-18)

## Scope
- A judge/admin launches a meeting by selecting **two active teams** from the management dashboard, team management or tournament management.
- New `inter_team` competitions use the existing Swiss-v1 tournament model, standings and Socket.IO event infrastructure. Existing `team_internal` and `quarterly` flows are left separate.
- Participants can be adjusted before each round; historical results keep their original players. Both teams must have at least one eligible player.
- Every pairing is bipartite; no match may contain players from the same team. Manual player dropdowns swap assignments between existing matches rather than duplicating a player.
- An unequal roster puts the surplus on the bench, **without automatic bye points**. The bench favors minimum previous bench count, then lowest score. A second bench turn is allowed only when it becomes unavoidable.
- Repeated opponents incur a large pairing cost; matching points incurs the next cost.
- New rounds are rejected until all earlier results have been entered. Last-round pairing edits are disabled once any result has been entered.
- Inter-team matchups and results are **staff-only**. Both HTTP and Socket.IO require judge/admin authentication. A public live viewer is supported **only for quarterly club tournaments**. No public inter-team route or anonymous projection is exposed.
- Team score shows completed match victories, draws and game-win tiebreaks, never a sum of individual Swiss points.
- Only running (`phase === 'running'`) tournaments receive the pulsing red LIVE indicator. Public events list still remains club-only.
- A judge/admin dashboard shows currently running club tournaments linked to staff management.

## API
- `POST /api/inter-team` — create from two `teamIds`.
- `GET /api/inter-team` — staff list.
- `GET /api/inter-team/:id` — staff detail.
- `PUT /api/inter-team/:id/participants` — next-round roster, `playerIds`.
- `POST /api/inter-team/:id/rounds` — create next round.
- `PUT /api/inter-team/:id/rounds/:number/pairings` — override current round before results.
- `PUT /api/inter-team/:id/rounds/:number/matches/:matchId` — enter a valid match score.
- `POST /api/inter-team/:id/close` — finish after all results.
- There is **no public inter-team endpoint**. `GET /api/tournaments/:id` also returns 404 for inter-team meetings.

All staff mutations except initial creation require `expectedRevision` for collision detection.

## Review checklist (manual)
1. Start a meeting with two active teams of equal sizes; generate a round, score each game, then generate the next.
2. Repeat with unequal rosters, including a team with one more and another with four more. Verify the bench rotates before repeating and awards zero points.
3. Try to swap two players across matches. Verify the move preserves opposite-team opponents and identical participant counts.
4. Verify an anonymous viewer cannot retrieve the inter-team meeting through either `/api/inter-team/public/:id` or the generic `/api/tournaments/:id`, and cannot subscribe to its public Socket.IO room; confirm a judge can subscribe to the authenticated staff room.
5. Add a newly rostered team player before round two; remove a previously active player from the next round. Verify existing scores are untouched.
6. Use two judges with an outdated revision. Ensure the second write fails with 409 and must be refreshed.
7. Verify LIVE pins appear only for running competitions, that the public live viewer works for club tournaments, and that inter-team meetings stay off the club-only events page.

## Verification
- GitHub Actions executes build, lint and Stage A backend/UI tests, including pairing, team-score and authenticated-visibility tests.
- The management UI reuses the existing full best-of-three result editor.
- Live end-to-end browser/Socket.IO testing with two authenticated staff devices and an anonymous access-denial check still needs manual verification before production deployment.

## Management interface updates (2026-11-18)
- Pairing edit mode has Save/Cancel actions both above the tables and below the bench.
- Management tournament filters use explicit buttons for status/type, rather than dropdowns. The public events filter retains its existing layout.

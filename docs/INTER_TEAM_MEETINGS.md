# Inter-team meetings (2026-11-18)

## Scope
- A judge/admin launches a meeting by selecting **two active teams** from the management dashboard, team management or tournament management.
- New `inter_team` competitions use the existing Swiss-v1 tournament model, standings and Socket.IO event infrastructure. Existing `team_internal` and `quarterly` flows are left separate.
- Participants can be adjusted before each round; historical results keep their original players. Both teams must have at least one eligible player.
- Every pairing is bipartite; no match may contain players from the same team. Manual player dropdowns swap assignments between existing matches rather than duplicating a player.
- An unequal roster puts the surplus on the bench, **without automatic bye points**. The bench favors minimum previous bench count, then lowest score. A second bench turn is allowed only when it becomes unavoidable.
- Repeated opponents incur a large pairing cost; matching points incurs the next cost.
- New rounds are rejected until all earlier results have been entered. Last-round pairing edits are disabled once any result has been entered.
- Public matchups subscribe read-only while running, with periodic HTTP recovery; staff socket rooms remain authenticated.
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
- `GET /api/inter-team/public/:id` — read-only viewing.

All staff mutations except initial creation require `expectedRevision` for collision detection.

## Review checklist (manual)
1. Start a meeting with two active teams of equal sizes; generate a round, score each game, then generate the next.
2. Repeat with unequal rosters, including a team with one more and another with four more. Verify the bench rotates before repeating and awards zero points.
3. Try to swap two players across matches. Verify the move preserves opposite-team opponents and identical participant counts.
4. Open public viewer in a private window while running and watch new pairings/results arrive automatically; verify it stops subscribing when finished.
5. Add a newly rostered team player before round two; remove a previously active player from the next round. Verify existing scores are untouched.
6. Use two judges with an outdated revision. Ensure the second write fails with 409 and must be refreshed.
7. Verify LIVE pins appear only for running competitions, and that inter-team meetings stay off the club-only events page.

## Limitations pending verification
- Automated backend pairing tests were added but could not be executed from the GitHub connector environment.
- Production deployment / end-to-end CI has not been run here.
- Match-result entry currently exposes basic 1–0/0–1/1–1 controls; the backend supports other validated best-of-three score shapes.

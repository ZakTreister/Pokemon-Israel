# Inter-team meetings (2026-11-18)

## Scope
- A judge/admin launches a meeting by selecting **two active teams** from the management dashboard, team management or tournament management.
- New `inter_team` competitions use the existing Swiss-v1 tournament model, standings and Socket.IO event infrastructure. Existing `team_internal` and `quarterly` flows are left separate.
- Participants can be adjusted before each round; historical results keep their original players. Both teams must have at least one eligible player.
- Every pairing is bipartite; no match may contain players from the same team. Manual player dropdowns swap assignments between existing matches rather than duplicating a player.
- An **admin** can swap a matching-team player between a table and the bench using the same pairing dropdown. The displaced table player takes the bench position, so no player disappears or appears twice.
- An admin may manually keep a child on the bench for consecutive rounds **without extra confirmation**. Bench edits still require the admin role, keep all players accounted for, and retain the existing `manualBenchOverride` audit information for repeat assignments. Judges may swap table opponents but cannot change bench membership.
- An unequal roster puts the surplus on the bench, **without automatic bye points**. The **automatic engine rotates through complete bench tiers** among all currently eligible players in the larger team: no child can be selected for a second bench turn while another eligible teammate has never benched; a third turn waits until all have benched twice, and so on. In addition, it never benches the same child in two consecutive rounds. If the number of players in the lowest bench-count tier is too small to fill every bench seat, automatic generation **fails with an explicit message** instead of choosing a repeat. Admin manual edits are exempt from these auto-generation restrictions.
- **Round 1 is a server-side randomized draw**: shuffle each team's eligible players independently (Fisher–Yates) before pairing across teams; randomly bench surplus players from the larger team. Neither match assignments nor the bench are based on alphabetical/roster order or zero-point standings. Persist the generated round as usual so refresh/reconnect does not draw again. Randomness is injectable for deterministic tests.
- **Round 2 onward** retains the existing deterministic cross-team Swiss matching, opponent-repeat avoidance, point matching and strict bench fairness/rotation rules.
- Repeated opponents incur a large pairing cost; matching points incurs the next cost.
- New rounds are rejected until all earlier results have been entered. Last-round pairing edits are disabled once any result has been entered.
- Inter-team matchups and results are **staff-only**. Both HTTP and Socket.IO require judge/admin authentication. A public live viewer is supported **only for quarterly club tournaments**. No public inter-team route or anonymous projection is exposed.
- Team score shows completed match victories, draws and game-win tiebreaks, never a sum of individual Swiss points.
- Only running (`phase === 'running'`) tournaments receive the pulsing red LIVE indicator. Public events list still remains club-only.
- A judge/admin dashboard shows currently running club tournaments linked to staff management.
- The dashboard also lists open inter-team meetings (setup and running) with a direct staff-management link, updating every 30 seconds and disappearing when completed.

## API
- `POST /api/inter-team` — create from two `teamIds`.
- `GET /api/inter-team` — staff list.
- `GET /api/inter-team/:id` — staff detail.
- `PUT /api/inter-team/:id/participants` — next-round roster, `playerIds`.
- `POST /api/inter-team/:id/rounds` — create next round.
- `PUT /api/inter-team/:id/rounds/:number/pairings` — override current round before results. Payload includes `matches` and optional `benchPlayerIds`; bench changes require admin and **do not** require any extra repeat-bench flag or approval.
- `GET /api/inter-team/active` — authenticated dashboard list of setup/running meetings.
- `PUT /api/inter-team/:id/rounds/:number/matches/:matchId` — enter a valid match score.
- `POST /api/inter-team/:id/close` — finish after all results.
- There is **no public inter-team live endpoint**. During setup/running, `GET /api/tournaments/:id` returns 404 for inter-team meetings. Completed results remain available through the generic historical public tournament detail when appropriate.

All staff mutations except initial creation require `expectedRevision` for collision detection.

## Review checklist (manual)
1. Start a meeting with two active teams of equal sizes; generate a round, score each game, then generate the next.
2. Repeat with unequal rosters. Verify the automatic engine never seats a child a second time before **every currently eligible teammate** has sat once, and never seats a child in consecutive rounds; the bench awards zero points. For a 5-vs-3 roster, the third round must fail because only one unbenched child remains to fill two seats. For 4-vs-3, all four children bench once before any can bench again. Changing bench seats manually remains allowed.
3. Try to swap two players across matches, then as admin swap a bench member with a player at a table. Verify the move preserves opposite-team opponents and identical participant counts. As judge, bench changes must be rejected with 403.
4. Verify an anonymous viewer cannot retrieve a running inter-team meeting through either `/api/inter-team/public/:id` or the generic `/api/tournaments/:id`, and cannot subscribe to its public Socket.IO room; confirm a judge can subscribe to the authenticated staff room. Completed historical results may be publicly available.
5. Add a newly rostered team player before round two; remove a previously active player from the next round. Verify existing scores are untouched.
6. As admin, manually put a previously benched child back on the bench in the next round. Verify saving works immediately without an extra checkbox or API flag; the change is recorded and stale revisions are still rejected with 409.
7. Verify LIVE pins appear only for running competitions, that the public live viewer works for club tournaments, and that inter-team meetings stay off the club-only events page.

## Verification
- GitHub Actions executes build, lint and Stage A backend/UI tests, including pairing, team-score and authenticated-visibility tests.
- The management UI reuses the existing full best-of-three result editor.
- Live end-to-end browser/Socket.IO testing with two authenticated staff devices and an anonymous access-denial check still needs manual verification before production deployment.

## Management interface updates (2026-11-18)
- Pairing edit mode has Save/Cancel actions both above the tables and below the bench.
- Management tournament filters use explicit buttons for status/type, rather than dropdowns. The public events filter retains its existing layout.

## Fullscreen presentation of live pairings (2026-11-19)
- A four-corner icon expands the **entire existing management interface**, not a read-only pairing presentation. The same live score cards, current round tables, editable result selectors and Save buttons, pairing editor, bench, next-round participants and meeting actions remain interactive and visible according to their normal UI state. The opposing-corners icon or Escape restores the regular page; editor drafts are not reset.
- During fullscreen, the team cards show **display-only match points** (`3 × completed match wins + 1 × completed match draws`), alongside match wins, draws and game wins. This is not the official inter-team league table or a new server-side persisted score; it does not award bench points.
- Staff Socket.IO updates continue throughout fullscreen. Fullscreen targets the document root so app-level confirmation dialogs remain accessible over the enlarged management area. When the Fullscreen API is blocked or unsupported, a full-viewport overlay is used instead. Other site navigation remains hidden behind the expanded management area.
- The live match-table grid is adaptive in fullscreen: it may display three or four fully editable tables per row when screen width allows, while regular management retains its previous two-column desktop layout.

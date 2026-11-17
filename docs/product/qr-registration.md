# Club tournament QR registration

This feature applies **only to regular/club tournaments** (`type: 'quarterly'` or the legacy equivalent `type: null`). It is **not** for All Stars team-internal events (`team_internal`) or inter-team encounters (`inter_team`).

## QR route and access

`/tournaments/:tournamentId/register` — authenticated Judge or Admin.

- New player link: `?firstName=...&lastName=...&city=...&birthYear=...`
- Existing club Player link: `?playerId=<24-character MongoDB ObjectId>`

First name and last name are required. City and birth year are optional for QR intake; the normal admin creation form retains its existing city validation. Scanned data may be edited before confirmation. The browser automatically checks for similar active club Players as the form loads (and when identifying fields change) and presents matches only when found; there is no separate manual “check for similar players” action. When an existing Player is edited, the UI explicitly confirms that global profile data will change.

Unauthenticated staff return to the same full local URL after login. The server enforces both the role and the tournament type.

## Data model

New QR players are canonical `Player` documents with `playerType: 'quarterly'`, `team: null`, and no child login. Existing `team` / All Stars players **cannot register for club tournaments**. This is enforced by server-side validation for `playerId`, by excluding team players from duplicate suggestions, and by rejecting exact matching team identities when a new club player is proposed. The flow never creates a team Player, assigns a child to an All Stars team, or changes permanent team membership.

`Tournament.clubRegistrations` stores references to regular Players, registration time, and a short name/city snapshot. The legacy `Tournament.participants` array continues to contain historical `User` registrations; it is not overwritten or filled with Player IDs. `currentParticipants` counts both sets.

For legacy results, a `results[].playerModel` discriminator defaults to `User` for older data and uses `Player` for results attributed to QR club registrants. The regular tournament result-entry UI includes both sets. The tournament management page renders one combined participant list with no QR-specific grouping. The national ranking aggregation identifies new Player-based results correctly, while existing legacy User-based results remain supported.

`playerParticipants` and `nextRoundParticipantIds` belong to the live Swiss engine and are **never** modified by club QR registration. No permanent team roster is changed.

## Protected APIs

- `GET /api/tournaments/:id/qr-registration?playerId=...` — club tournament preview, optionally with existing club Player
- `GET /api/tournaments/:id/qr-registration/duplicates?firstName=...&lastName=...&city=...` — bounded club-only identity suggestions
- `POST /api/tournaments/:id/qr-registration` — create/select/update Player and enroll after explicit confirmation, with `expectedRevision` guard

The operation rejects already registered Players and stale tournament revisions. Similar names require choosing an existing Player or explicitly authorizing a new record. It never silently merges records.

## Privacy and operational caveats

- Never log full QR URLs containing children’s names or years of birth.
- No national ID, photo or date of birth is requested.
- No app account is created for a child.
- The backend distinguishes roles and tournament types; a URL alone does not authorize registration.
- MongoDB standalone has no multi-document transaction: failed tournament CAS rolls back a just-created Player where possible. A process crash between documents can leave a partial write. Explicit reconciliation is required if a profile update partially fails.
- For a new player with no city, `registrationSource: 'qr-club'` explicitly permits an incomplete city on the Player model. This does not relax ordinary manual club-player creation validation.
- This feature does **not** generate QR image files or send the registration emails; it accepts links generated externally.

## Club event creation and management

Regular/club tournaments have **unlimited participants**. The creation form has no capacity field, and both QR and legacy User enrollment ignore any old `maxParticipants` caps for club tournaments. Team tournament participant limits remain unchanged.

Club events are scheduled by **date only**, without event time. New and edited event dates are represented using an Israel calendar day (stored at UTC noon for stable display). Registration and lifecycle checks use calendar-day comparisons rather than times. The regular event detail page shows no hour.

Admins can edit the event title, description, date, location and image directly on `/manage/tournaments/regular/:id`. Judges cannot edit tournament metadata.

## Starting a club tournament (staff)

The club/tournament management view offers **התחל טורניר** to logged-in Judges and Admins. A single server-side atomic transition:

1. Reads canonical `clubRegistrations[].player` IDs, plus any legacy registered `User.player` links.
2. Refuses to start if any legacy User lacks a linked Player, any Player belongs to an All Stars team, any canonical identity is duplicated, or fewer than two eligible club Players are registered.
3. Shuffles eligible Players using the shared Swiss `generatePairings` service, creates round 1 including a randomized bye if necessary, and persists that round exactly once with a tournament-revision compare-and-set.
4. Switches the event's engine to `swiss-v1`, `phase: running`, `source: live`. Closes both QR and legacy registration paths. Previous team tournament data is never consulted or modified.
5. Navigates to `/manage/tournaments/regular/:id/rounds`, reusing the complete existing Swiss rounds UI with a club-specific API adapter. Judges/Admins may enter results, create later rounds, cancel the latest, manage next-round participants, and close the tournament.

The internal-team endpoints are still restricted to `type: team_internal`. Club round endpoints are separately scoped to `type: quarterly`; they cannot be used to alter a team event.

A started club event remains editable by Admins for its metadata through `/manage/tournaments/regular/:id`; modifying round outcomes is done through the rounds UI.

**Known migration boundary:** Legacy `User` registrations that have no linked canonical `Player` are not silently converted or omitted. Staff will receive a clear blocking message to reconcile those identities before starting. No child login is created automatically.

The reusable Swiss engine uses 3/1/0 match scoring with OMP/GWP/OGP and persists round 1; all club final standings are sent to the regular national ranking, not the All Stars/team ranking.

## Unified club participant management

On both Admin and Judge club-tournament pages, the **single** participant list combines legacy `participants[].user` and `clubRegistrations[].player`, resolves legacy `User.player` / reverse `Player.user` identities where possible, and shows the canonical Player name. Legacy entries that cannot be matched to a Player are visibly flagged as needing reconciliation before Swiss start.

- `GET /api/tournaments/:id/club-participants` returns the combined `registered` list and `available` club Players. The available list includes **only active `playerType: quarterly` Players** not already registered via either mechanism and excludes linked staff (admin/judge) accounts. Never use `/api/users` as a child picker.
- `POST /api/tournaments/:id/club-participants` accepts only an existing eligible `Player` ID; it checks canonical duplicate identity and performs a revision-guarded append to `clubRegistrations`.
- `DELETE /api/tournaments/:id/club-participants/:source/:registrationId` removes a registration from the correct historical backing array without deleting the Player or User identity; the visible list remains unified.
- The list and add/remove controls are identical for Judges and Admins. Changes are prohibited once a club event has begun or registration closes. Staff accounts cannot register as club competitors through legacy endpoints.

Tournament storage and legacy result compatibility remain intact; no migration is applied to prior registration records.

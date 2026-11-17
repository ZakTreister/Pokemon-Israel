# Club tournament QR registration

This feature applies **only to regular/club tournaments** (`type: 'quarterly'` or the legacy equivalent `type: null`). It is **not** for All Stars team-internal events (`team_internal`) or inter-team encounters (`inter_team`).

## QR route and access

`/tournaments/:tournamentId/register` — authenticated Judge or Admin.

- New player link: `?firstName=...&lastName=...&city=...&birthYear=...`
- Existing club Player link: `?playerId=<24-character MongoDB ObjectId>`

First name and last name are required. City and birth year are optional for QR intake; the normal admin creation form retains its existing city validation. Scanned data may be edited before confirmation. When an existing Player is edited, the UI explicitly confirms that global profile data will change.

Unauthenticated staff return to the same full local URL after login. The server enforces both the role and the tournament type.

## Data model

New QR players are canonical `Player` documents with `playerType: 'quarterly'`, `team: null`, and no child login. Existing active `team` Players **may join a club tournament** by their existing Player ID (or by staff choosing a duplicate suggestion), because the target *tournament* must be a club event. The flow never creates a team Player, assigns a child to an All Stars team, or changes permanent team membership.

`Tournament.clubRegistrations` stores references to regular Players, registration time, and a short name/city snapshot. The legacy `Tournament.participants` array continues to contain historical `User` registrations; it is not overwritten or filled with Player IDs. `currentParticipants` counts both sets.

For legacy results, a `results[].playerModel` discriminator defaults to `User` for older data and uses `Player` for results attributed to QR club registrants. The regular tournament result-entry UI includes both sets. The national ranking aggregation identifies new Player-based results correctly, while existing legacy User-based results remain supported.

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

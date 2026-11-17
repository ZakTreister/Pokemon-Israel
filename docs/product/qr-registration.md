# QR registration for live internal tournaments

Route: `/tournaments/:tournamentId/register` (judge/admin only).

Accepted links:
- New player: `?firstName=...&lastName=...&city=...&birthYear=...`
- Existing player: `?playerId=<MongoDB ObjectId>`

First/last name are required for new players; city and birth year are optional. The URL parser decodes them via standard URLSearchParams. A staff member may edit every field before approval.

Authentication redirects to the existing login screen with the full local return path and query string, then restores the registration route. Backend enforcement is via `protect` and `authorize('admin','judge')`.

Endpoints:
- `GET /api/tournaments/:id/qr-registration?playerId=...`: private tournament summary and optional existing player
- `GET /api/tournaments/:id/qr-registration/duplicates?firstName=...&lastName=...&city=...`: candidate roster matches
- `POST /api/tournaments/:id/qr-registration`: confirm with `firstName,lastName,city,birthYear,playerId?,allowDuplicate?,updateExisting?,expectedRevision`

The operation uses Player references and updates both the tournament's historical participant union and next-round participant list (using revision CAS). A player already in history but excluded from the next round can rejoin. No created rounds or standings are rewritten. It does not create a login for the child.

**Important current limitation:** legacy tournaments store User participants, not Player participants. To prevent corrupting legacy records, QR registration currently accepts only live `swiss-v1` internal-team tournaments. It rejects completed, historical, inter-team, quarterly and legacy tournaments. Supporting other types requires a separate enrollment model/migration.

For internal tournaments, player creation adds a team Player linked to the tournament's team; this is an **explicit QR-intake exception** to the normal judge restriction on player administration. Existing player profile changes are global and require explicit confirmation.

Identifiers in existing DB records are 24-hex MongoDB ObjectIds. They are not generic UUIDs. The QR itself only needs to encode the URL and is not generated here.

Security:
- Never rely on the QR payload as authorization.
- Do not capture full child-data URLs in analytics or server logs.
- Exact date of birth is neither needed nor transmitted.
- A stale tournament revision is rejected.
- Potential duplicates are shown for staff review, never merged automatically.

**Deployment caution:** MongoDB standalone deployments do not support multi-document transactions. New-player creation is rolled back when tournament CAS fails, but a process crash between writes can still leave an incomplete enrollment. Full atomicity needs a replica-set transaction or a durable enrollment workflow.

**Review before broader release:** Updating an existing team Player that is linked to a User account may require linked User.name synchronization; test and reconcile that profile flow before permitting such edits at scale.

# Teams

## Team entity
An All Stars team has at least:
- name
- optional logo / emblem
- active state
- one assigned teacher
- roster of team players

Team names must remain uniquely normalized as in the existing model.

## Team logo upload
Team logos use the shared AWS S3 upload/storage capability defined in `docs/architecture/media-upload.md`.

Requirements:
- the team logo is optional; team creation/editing must succeed without a logo
- admin can upload a logo during team creation/editing
- admin can replace or remove the logo
- judges may view but may not change permanent team media
- new logos are stored under `public/teams/<team-id>/...`
- public team surfaces use the CloudFront media URL derived from the stored key
- persist provider-neutral storage metadata; new code must not depend on Cloudinary `publicId`
- reuse the shared image-upload component and normal preview/progress/error behavior
- preserve legacy team logo URLs while migrating existing records; do not break existing logos merely because storage provider changes

## Creating and managing teams
- Team configuration is admin-only.
- Judges may view team information as needed to open/manage tournaments, but may not change team settings.
- Only admin may create, edit, activate/deactivate or delete a team.
- Only admin may upload/change a team logo.
- Only admin may assign or change the team's teacher.
- Only admin may add, edit, transfer, assign, remove or unassign players from a team roster.
- Team creation is NOT blocked by an active Season.
- General team/roster administration is not globally locked because a Season is active.
- A player may belong to only one active team at a time.
- Do not deactivate a team while active players are still assigned to it. Require transfer/unassignment first.

## Team teacher
Every active All Stars team should have one assigned **מורה**.

Data/validation:
- store the teacher as a reference to the staff User record
- the referenced user must currently have role `admin` or `judge`
- this is a one-teacher-per-team relationship; one teacher may teach multiple teams
- teacher assignment/change is admin-only
- do not expose the teacher/staff identity in public team DTOs unless a later product decision explicitly makes teachers public
- existing legacy teams without a teacher must remain readable, but management should make the missing assignment visible and allow admin to assign one
- new team creation should require selecting a teacher

Permissions:
- teacher assignment does not grant new global permissions
- an admin teacher keeps admin permissions
- a judge teacher keeps judge permissions
- a judge teacher may use the same live-tournament operational actions already allowed to judges, but still may not edit the permanent team configuration or members

Management UI:
- show the assigned teacher in management team summary/details
- admin changes the teacher from the team **הגדרות נבחרת** area rather than as a prominent list-card action
- teacher picker lists eligible staff users (admin/judge) only

## Management label
The management navigation label is **נבחרות All-Stars**.
Do not use **נבחרות וסגלים** as the primary label.

## Team-list primary actions
The main team-management list should optimize for the common operational task and avoid presenting all team administration as equally important.

Each team card should expose at most these common actions directly:
- **התחל טורניר** — the primary action when no open internal tournament exists
- **המשך טורניר** — replaces **התחל טורניר** when an open tournament exists
- **חברי נבחרת** — secondary navigation to the team page/details

The team name/card itself may also navigate to the team page so navigation does not require another large button.

A team must never be offered a second simultaneous live internal tournament.

The **התחל טורניר** / **המשך טורניר** action is the single visually dominant action.

Do not put low-frequency administration beside it as equal-size primary buttons.

Move low-frequency admin actions such as:
- edit name/logo
- change teacher
- activate/deactivate team
- historical data entry/maintenance

into the team page's **הגדרות נבחרת** / secondary actions area. Very rare/destructive operations may live under a compact **עוד פעולות** menu.

Permanent configuration controls remain admin-only. Judges may use the tournament-start action according to live-tournament permissions.

See `docs/product/internal-tournament-ui.md`.

## Team-management list density
The main `/manage/teams` page is a team overview, not a permanently expanded child directory.

For each team card:
- show the team summary and player count without automatically rendering every child
- if the inline member list is retained for quick admin actions, place it under a disclosure labeled **חברי נבחרת (N)**
- that disclosure is **collapsed by default** on every page load
- expanding one team must not require expanding all teams
- the collapsed state must remain compact on mobile
- existing inline member actions such as remove/unassign may remain inside the expanded area
- do not eagerly create a long page containing every child from every team

User-facing team-management copy should use **חברי נבחרת** instead of **סגל**. The technical/domain term `roster` may remain in code and architecture where appropriate.

## Team page
The team page is the home for team information and less-frequent team administration.

It should organize content into clear tabs/sections rather than a long row of action buttons.

Primary team tabs:

### חברי נבחרת
Use one unified active-team-member table. Do **not** keep a separate **דירוג וסטטיסטיקה** tab/view.

The unified table includes:
- **מיקום**
- **שם מלא**
- **עיר**
- **מספר שחקן**
- **נקודות**
- **טורנירים**

In RTL, **מיקום** appears immediately to the right of the player name.

Default ordering is canonical team rank ascending (place 1 first). Team members without ranking history remain visible in the table with empty/zero ranking fields as appropriate.

The ranking information is the ranking inside this team only; there is no cross-team overall All Stars player ranking.

The entire player row/card remains navigable to the public team-player profile where applicable.

For admin, row-level member management belongs here:
- **עריכת שחקן**
- **הסרה מהנבחרת**

Keep these as compact contextual actions (for example a small action control or accessible `עוד פעולות` menu) rather than large peer buttons.

Editing from this team context edits the Player record (including team-player fields such as name, city and player number). Removing unassigns the player from the team; it does not delete the Player record. Preserve confirmation for removal.

Additional team areas:
- **היסטוריית טורנירים**
- **הגדרות נבחרת** for admin-only configuration

Do not show a separate **דירוג וסטטיסטיקה** tab.

The page header shows team logo/name and the relevant primary tournament action.

Admin-only **הגדרות נבחרת** contains configuration such as name/logo, assigned teacher and active state.

Historical internal-tournament entry belongs with the tournament-history/secondary administration context rather than as a prominent everyday button.

Avoid creating separate large buttons merely to navigate between sections that can be represented as tabs/sections within the team page.

Team-specific subpages/history should preserve the **נבחרות All-Stars** navigation context.
Entering the actual tournament-management screen may switch to the Tournament context.
Always provide a visible back-navigation action.

## Internal tournament launch
Opening an internal tournament from the team page must:
- first resolve whether an open live internal tournament already exists for that team
- if one exists, open that tournament instead of creating another
- otherwise create a `team_internal` tournament linked to that team
- preload all active players currently assigned to the team
- allow the judge to manage which eligible team players participate in the next uncreated tournament round
- before round 1 this defines round-1 attendance; after play starts it may still be changed while the current round runs
- participant changes never alter an already-created round and never alter the permanent team roster

## Team creation on mobile
The create-team form must be intentionally responsive:
- no awkward compressed horizontal layout
- fields stack cleanly on narrow screens
- image/logo upload remains usable
- primary actions remain prominent and reachable

## Team statistics
When inter-team competition exists:
- games/matches played = completed official inter-team encounters in which the team participated
- win rate = won completed inter-team encounters / completed inter-team encounters * 100
- draws count as played but not won

Do not derive team win rate from internal tournaments.

## Team history
History must be preserved across team competition years:
- the team identity/name as needed for historical display
- roster membership for that year
- year-specific team standings/statistics
Historical data must not be lost when a new competition year starts.


## Team-page player edit action
In management context, every player row in **חברי נבחרת** exposes an explicit admin-only **עריכת שחקן** action/link.

It opens the canonical Player edit flow and remains independent from whole-row navigation to the public player profile.

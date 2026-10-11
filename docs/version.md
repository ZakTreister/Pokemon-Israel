# CardSchool IL — Version Tracker

This file is the canonical implementation-version tracker for approved product/spec work.

## Versioning rule

Use calendar versions in the form `YYYY.MM.N`, for example `2026.10.1`, then `2026.10.2`.

Rules:
- One approved specification batch gets one new version number.
- Product/architecture docs remain the detailed source of truth; this file defines the implementation batch and status.
- A version moves through `PLANNING` → `READY_FOR_DEVELOPMENT` → `DEVELOPED`.
- Codex implements the requested version and updates this file in the same implementation PR.
- When finished, Codex marks the version `DEVELOPED`, records the PR URL, final SHA, verification, and known gaps.
- A new version starts only after the previous version is marked `DEVELOPED`, unless the product owner explicitly queues another version.
- Clarifications made before development begins may update the current pending version scope, but may not create hidden untracked requirements.

## Current version

**Version:** `2026.10.1`  
**Status:** `DEVELOPED`\
**Previous developed baseline:** repository implementation before version tracking began  
**Implementation PR:** [Create/review work → main](https://github.com/ZakTreister/Pokemon-Israel/compare/main...work?expand=1) — create-PR fallback; actual PR URL pending.\
**Implementation commit:** `840af32aad4579814fc7e10ac206d589d2bb451c`\
**Developed on:** `2026-10-11`

### Scope

#### 1. Team-player number and team-page player management
- add canonical `playerNumber` for All Stars/team players
- require it for new team players; preserve legacy records without it for backfill
- global **ניהול → שחקנים → הוסף שחקן נבחרת** requires selecting an active team and assigns the player in the same flow
- team page **חברי נבחרת** shows full name, city and player number
- admin can edit a team player from the member row
- admin can remove/unassign a player from the member row without deleting the Player
- **דירוג וסטטיסטיקה** shows position, name, points and tournaments in canonical team-rank order

#### 2. Live tournament participant editing
- rename existing **דירוג ותוצאות** to **טבלה** without changing its behavior
- add **משתתפים** beside it
- reuse the checkbox participant/team-member selector where practical
- before round 1, selection defines round-1 participants
- while a current round runs, selection defines the next uncreated round
- participant edits never rewrite already-created pairings/results
- late joiners start next round with 0 match points for missed rounds
- unchecked players keep historical results/standings impact and are excluded from future pairing
- eligible players may be re-added for a later round
- tournament participant changes never change permanent team membership
- preserve historical participant snapshots and store the future eligible set separately
- keep structural concurrency safe and do not break unrelated match drafts/saves

Manual pairing override/editing is explicitly **not** part of this version.

#### 3. Public Events mirrors management Tournaments
- public **אירועים** uses the same compact tournament-list visual language as management **טורנירים**
- reuse shared filter/list/summary primitives where sensible
- keep public PageHero/chrome
- remove the separate oversized image-card-grid presentation
- public actions remain details/registration/results only
- never expose management-only actions

#### 4. Remove overall cross-team All Stars individual ranking
- All Stars individual ranking is team-specific only
- remove remaining `overallRanking` UI/API dependencies
- public player profile shows team-specific ranking only

#### 5. Route navigation starts at the top
- implement one central React Router/layout scroll-to-top behavior for route changes
- include Link/NavLink/programmatic navigation/clickable rows/cards/back-forward
- do not reset scroll for same-page state changes
- preserve explicit hash/anchor behavior

#### 6. Homepage hero trading cards: touch drag + approved artwork
Keep all three hero trading cards at their current sizes.

Interaction:
- on touch/mobile, users can drag/swipe the cards horizontally with a finger
- use lightweight natural snap/settling behavior
- mouse/trackpad drag may follow the same interaction where practical
- do not substitute automatic floating animation
- respect `prefers-reduced-motion`
- preserve the existing hero layout and card dimensions

Artwork:
- center/main card uses the site's existing Pikachu image asset
- one side card uses a Poké Ball illustration
- the other side card uses a trophy illustration
- do not enlarge the center card or otherwise change relative card sizes

### Required verification
Codex must inspect current implementation, follow the detailed docs, add/update relevant tests, run tests, lint and build, and make no unrelated changes.

### Implementation verification

- `npm run test:stage-a`: **PASS** — 25 server tests, no failures or skips. Includes player-number validation/atomic team assignment, legacy backfill, historical participant retention, next-round eligibility, late joins/re-adds, structural conflicts, live synchronization and independent match versions.
- `npm run test:stage-a:ui`: **PASS** — all 8 verification scripts. Includes participant draft preservation/conflict recovery/out-of-order responses, compact public Events, contextual member edit/unassignment, team-only ranking, SPA navigation/anchors/back-forward, required creation fields and hero drag/snap/artwork/reduced-motion behavior.
- `npm run lint`: **PASS** — 0 errors, 4 existing warnings.
- `npm run build`: **PASS** — production Vite build; existing Browserslist, mixed import and bundle-size warnings remain.
- `git diff --check`: **PASS**.
- Supplemental `npx tsc -p tsconfig.app.json --noEmit`: 17 pre-existing legacy type errors, unchanged from baseline; no new errors. This is not the configured build command.

**Known gaps:** No known gaps in the approved `2026.10.1` implementation. PR creation remains pending: GitHub GraphQL and REST requests returned `Forbidden`, including the escalated API attempt. The final GitHub PR creation click is still required. Reuse an existing open `work` → `main` PR if present; otherwise create one using the link above, then replace the fallback with its actual PR URL. The legacy TypeScript errors above remain outside this version's scope.

The implementation SHA identifies the final code/test commit; the following documentation-only commit records this verification and SHA in the same `work` → `main` change set.

### Completion contract for Codex
In the implementation PR for `2026.10.1`, Codex must update this section to include:
- **Status:** `DEVELOPED`
- **Implementation PR:** actual GitHub PR URL
- **Implementation commit:** final implementation SHA
- **Verification:** tests/lint/build results
- **Known gaps:** any remaining gap, or `none`

Codex must return the PR link to the user when finished. If its environment cannot create a PR directly, it must return the direct GitHub compare/create-PR link and clearly state that the final GitHub PR creation click is still required.

# Frontend Engineering Standards

This document defines the frontend architecture and implementation standards for Cardschool IL.

The goal is to build a reusable component system over time, reduce duplication, keep business logic testable, and make future UI work faster and safer.

These rules apply to all new frontend work and to existing code whenever that area is touched.

## 1. Core principle

Prefer composition from reusable building blocks over rewriting page-specific UI.

The intended layering is:

1. shared UI primitives
2. domain-specific reusable components
3. hooks / domain logic / services
4. pages that orchestrate the above

Pages should not become large files that contain:
- repeated visual patterns
- modal implementations
- form-field implementations
- duplicated tables
- duplicated loading/error/empty states
- substantial domain calculations
- API transformation logic mixed deeply into JSX

The goal is not "the fewest files".
The goal is less duplication, clearer responsibilities, safer changes, and faster future development.

---

## 2. Component architecture

### Shared primitives

Put generic reusable UI in:

```text
src/components/ui/
```

Examples:

- Button
- Card
- Badge
- Modal / Dialog
- DataTable
- FormField
- FormSection
- EmptyState
- LoadingState
- ErrorState
- PageHeader
- SectionHeading
- StatCard
- ActionMenu
- ResponsiveCardGrid
- ImageUpload

These components must not know tournament-specific or team-specific business rules.

### Domain components

Reusable business-aware components should live close to their domain.

Preferred structure:

```text
src/features/
  tournaments/
    components/
    hooks/
    utils/
  teams/
    components/
    hooks/
    utils/
  players/
    components/
    hooks/
    utils/
```

Existing folders such as `src/components/teams/` may remain during migration.
Do not move files only for cosmetic folder consistency.
When an area is actively refactored, prefer colocating reusable components with the relevant feature/domain.

Examples:

```text
TournamentCard
TournamentStatusBadge
TournamentForm
ParticipantList
TournamentActions

TeamCard
TeamRoster
TeamStandingCard

PlayerCard
PlayerStats
PlayerSelector
```

### Pages

Pages should mainly:
- read route params
- call hooks
- select data/state
- compose reusable components
- coordinate page-level actions

A page should not be the default home for every implementation detail.

---

## 3. Reuse rule

Before building new UI:

1. Search for an existing component that already solves the problem.
2. Extend an existing component when the new need is a natural variant.
3. Create a shared component when the pattern is inherently generic or clearly recurring.
4. Keep a one-off implementation local when abstraction would make the code harder to understand.

Do not create two different components for the same visual/functional pattern without a clear reason.

Do not create "universal" components with dozens of unrelated props just to force reuse.

### Practical abstraction rule

Extract immediately when the concept is inherently reusable, for example:
- Button
- Badge
- Modal
- EmptyState
- FormField
- table shell
- page header

For business patterns, extract when:
- the pattern already appears in more than one place, or
- it has meaningful independent behavior, or
- it is likely to be reused soon and the boundary is already clear

Do not abstract three lines of JSX only to reduce line count.

---

## 4. Existing-code improvement rule

Do not perform large unrelated rewrites.

When touching an existing area for a feature, bug fix, or redesign:

> Leave that area slightly cleaner than you found it.

Good opportunistic improvements:
- replace duplicated UI with an existing shared component
- extract a clearly reusable block
- move domain calculation out of JSX
- replace `any` with a real type
- use the standard loading/error/empty states
- remove dead code

Avoid:
- broad repository-wide refactors unrelated to the task
- changing architecture only for style
- moving many files without functional benefit
- rewriting working Redux/API code during a visual task

---

## 5. Page-size and responsibility heuristic

Large files are a signal to inspect, not an automatic violation.

When a page grows beyond roughly 300–400 lines, review whether it contains separable concerns.

Especially inspect pages that combine:
- data fetching
- filtering
- form state
- modal state
- table rendering
- validation
- permissions
- API calls
- domain calculations
- multiple large UI sections

Do not split a coherent component merely to satisfy a line-count target.

Current large pages should be refactored gradually as they are touched rather than rewritten all at once.

---

## 6. Separate presentation from business logic

Business/domain logic should not live deep inside JSX.

Prefer:

```text
src/features/<domain>/
  hooks/
  utils/
  services/
  components/
```

Examples of logic that belongs outside presentation components:
- standings calculations
- Swiss pairing calculations
- permission decisions
- tournament-state transitions
- score validation
- API payload transformations
- filtering/sorting rules shared across screens

UI components should primarily receive typed data and callbacks.

Pure domain functions should be easy to unit test without rendering React.

---

## 7. Hooks

Use custom hooks when they provide a meaningful reusable boundary.

Good examples:

```text
useTournament
useTournamentParticipants
useTeamRoster
useSeason
usePermissions
```

A hook may coordinate:
- Redux selectors/actions
- API calls
- loading/error state
- derived values
- Socket.IO subscription lifecycle

Do not create trivial hooks that merely rename one `useState`.

---

## 8. State ownership

Choose the narrowest correct owner for state.

Use:
- local component state for local UI interactions
- custom hooks for reusable stateful behavior
- Redux for application-wide/shared client state
- server/database as the canonical source for persisted tournament/domain state

Do not duplicate the same authoritative state across several layers unless synchronization is explicit.

Tournament state must remain server-persisted and must not rely on one browser as the canonical source.

---

## 9. Standard UI states

Every data-driven screen/component must deliberately support:

- loading
- error
- empty
- populated/success

Reuse shared components instead of inventing different loaders and empty messages on each page.

Recommended primitives:

```text
LoadingState
ErrorState
EmptyState
```

The UI must not render misleading zero values while data is still loading.

---

## 10. Forms

Prefer the existing React Hook Form + Zod stack for non-trivial forms.

Shared form primitives should handle consistent:
- label
- help text
- required indication
- validation error
- disabled state
- focus styling
- RTL layout

Example primitives:

```text
FormField
FormSection
FormActions
```

Validation rules that affect business integrity must also be enforced server-side.
Frontend validation improves UX; it is not authorization or authoritative validation.

---

## 11. TypeScript standards

TypeScript strict mode remains required.

Avoid `any`.

If temporary use of `any` is unavoidable:
- keep it at a boundary
- narrow it immediately
- do not propagate it through the domain

Prefer:
- explicit domain interfaces/types
- discriminated unions for state/status variants
- typed API functions
- typed component props
- exhaustive switches when practical

Do not duplicate incompatible versions of the same domain type across pages.

---

## 12. Runtime validation

Use Zod where runtime data cannot be trusted by TypeScript alone, especially:
- form schemas
- external/webhook payloads
- important API boundaries when shape ambiguity exists
- imported structured data

TypeScript validates compile-time assumptions.
Zod validates runtime data.

Do not parse every internal object with Zod unnecessarily.

---

## 13. API and service boundaries

Do not scatter raw Axios calls across large UI components when the request represents a reusable domain operation.

Prefer domain/service functions for operations such as:

```text
createTournament
updateTournament
addParticipant
removeParticipant
submitMatchResult
assignBadge
```

Centralize:
- endpoint construction
- request/response typing
- repeated error normalization

UI code should focus on user interaction, not HTTP mechanics.

---

## 14. Error handling

Use the shared request-error utilities and toast/dialog system.

Do not:
- use browser `alert()`
- silently swallow errors
- expose raw backend stack traces/messages to users

User-facing errors should be concise and actionable.

Development logging may include more detail where appropriate.

---

## 15. Accessibility

Accessibility is part of Definition of Done.

Interactive UI should support:
- keyboard navigation
- visible focus
- semantic buttons/links
- labels for form controls
- appropriate ARIA where native semantics are insufficient
- sufficient color contrast
- touch-friendly targets
- reduced-motion preferences

Do not rely on color alone to communicate important status.

RTL behavior must be verified alongside accessibility.

---

## 16. Responsive behavior

Do not treat mobile as a scaled-down desktop layout.

For each feature verify:
- desktop
- tablet
- mobile

Check:
- RTL ordering
- text wrapping
- overflow
- tables
- dialogs
- forms
- navigation
- touch targets
- fixed/sticky elements

Prefer deliberate responsive variants for dense tables or management screens.

### Sortable tables

When a table has meaningful sortable columns, prefer a reusable sortable-table/DataTable capability instead of page-specific sort implementations.

Requirements:
- column configuration declares whether/how a column sorts
- show the active sort column and direction
- support keyboard interaction and appropriate `aria-sort` semantics
- numeric values sort numerically, not lexicographically
- text sorting should behave sensibly for Hebrew/locale-aware names
- sorting is presentation state unless the dataset requires server-side sorting for scale
- do not mutate canonical domain data merely to sort the view

For ranking tables, default sort is always canonical rank/place ascending, even if the reusable table supports other initial sorts.

### Clickable rows

When an entire data row represents one navigable entity, prefer a reusable row-navigation capability rather than making only one text cell clickable.

Requirements:
- the full row/card click target navigates to the entity
- preserve semantic keyboard navigation and visible focus treatment
- do not make the implementation rely only on an `onClick` attached to a non-semantic element
- nested buttons/links/actions inside the row must remain independently operable and must not trigger the parent row navigation
- row navigation must work correctly in RTL and on touch devices
- avoid duplicating row-navigation logic page by page when the shared DataTable can support it

For All Stars / team-player rows, the row target is the public player profile.

### Shared public/management tournament listing

The public Events list and management Tournaments list represent the same tournament domain with different capabilities.

Prefer shared primitives for the overlapping concerns, for example:
- tournament lifecycle/type labels
- filter state/options
- filter predicate/query serialization
- tournament summary/card/row presentation
- empty/loading states where the visual context matches
- responsive tournament-list layout

A management wrapper may add management-only actions such as operate/delete/create, while the public wrapper adds public detail/registration behavior.

Do not force one giant component with permission branches everywhere. Extract the genuinely shared domain/presentation pieces and keep public vs management actions at the appropriate page/container boundary.

Likewise, do not maintain separate lifecycle calculations or type-label mappings on public and management pages if one shared utility/API representation can be authoritative.

---

## 17. Styling and design-system rules

Use the existing Tailwind/design tokens and CardSchool visual system.

Prefer shared component variants over repeating large Tailwind class strings across pages.

Do not introduce a second visual system.

Do not add arbitrary one-off colors when an existing design token serves the purpose.

When a visual pattern is reused, put its styling into:
- a shared component
- a shared variant
- a design token
- a small utility

Do not create giant global CSS files containing page-specific implementation details.

---

## 18. Formatting and code style

Use a single formatting standard across human and agent-generated code.

The repository should use Prettier for deterministic formatting.

Once configured, changed frontend files should satisfy:

```bash
npm run format:check
npm run lint
npm run build
```

Avoid manual formatting conventions that conflict with automated formatting.

---

## 19. Tests

New or changed business logic should be tested at the lowest useful level.

### Unit tests

Use for:
- pure calculations
- transformations
- permissions
- tournament state logic
- standings/pairing utilities
- validation helpers

### Component tests

Use React Testing Library for reusable UI/components where behavior matters.

Test user-observable behavior rather than implementation details.

### End-to-end tests

Use Playwright for critical workflows as the project grows, especially:

- authentication
- tournament creation
- participant approval
- starting a tournament
- generating a round
- multiple result submissions
- completing a round
- finishing a tournament
- rankings/results display

Do not require E2E coverage for every small visual change.

---

## 20. CI

The repository should have GitHub Actions CI.

For pushes and pull requests, CI should at minimum run:

```bash
npm ci
npm run lint
npm run build
npm run test:stage-a
```

When the corresponding infrastructure is added, also run:
- formatting check
- frontend unit/component tests
- relevant E2E smoke tests

A change is not considered verified merely because it looks correct locally.

---

## 21. Performance

Prefer clarity first, but avoid obvious waste.

Good practices:
- do not refetch identical data unnecessarily
- avoid expensive calculations directly during every render when they can be derived efficiently
- avoid huge images when smaller assets suffice
- lazy-load genuinely heavy routes/features when useful
- keep list keys stable
- do not add memoization everywhere without evidence

Performance optimization should solve an actual or likely problem, not make simple code harder to read.

---

## 22. Security boundaries

Frontend permission checks are UX only.

Backend authorization remains authoritative.

Never assume a hidden or disabled button prevents an unauthorized action.

Do not expose secrets in frontend environment variables or bundled code.

Follow:
- `docs/architecture/security.md`
- `docs/architecture/permissions.md`

---

## 23. Reusable-component migration priorities

As relevant areas are touched, prefer extracting/reusing these first:

### Generic UI
- Modal/Dialog
- DataTable shell
- PageHeader
- FormField
- FormSection
- EmptyState
- LoadingState
- ErrorState
- ActionMenu
- ResponsiveCardGrid

### Tournament domain
- TournamentCard
- TournamentStatusBadge
- TournamentForm
- ParticipantList
- TournamentActions
- round/match presentation components

### Teams
- TeamCard
- TeamRoster
- TeamStandingCard

### Players
- PlayerCard
- PlayerStats
- PlayerSelector

Do not create all of these in advance.
Create them when a real task requires them or when existing duplication makes the boundary clear.

---

## 24. Known refactoring candidates

The following existing files are large enough that future work in them should consider extracting coherent responsibilities:

- `src/pages/admin/AdminTournaments.tsx`
- `src/pages/admin/AdminPlayers.tsx`
- `src/pages/manage/ManageTeams.tsx`
- `src/pages/manage/InternalTournamentPage.tsx`
- `src/pages/player/PlayerDashboardPage.tsx`

This is not an instruction to rewrite them immediately.

When modifying one of these files:
1. preserve behavior
2. identify the portion relevant to the task
3. extract reusable/cohesive pieces when doing so reduces duplication or complexity
4. avoid broad unrelated changes

---

## 25. Definition of Done for frontend changes

Before finishing a frontend change, verify as applicable:

- existing functionality is preserved
- reusable existing components were used where appropriate
- no obvious duplicate UI pattern was introduced
- domain logic is not unnecessarily embedded in JSX
- TypeScript remains strict and no avoidable `any` was introduced
- loading/error/empty states are handled
- RTL is correct
- responsive behavior was considered
- keyboard/focus/accessibility behavior remains sound
- tests were added/updated for meaningful logic changes
- lint passes
- build passes
- relevant existing tests pass

As formatting/CI infrastructure is introduced, its checks also become part of Definition of Done.


---

## 26. SPA architecture

Cardschool IL is a React Router + Vite single-page application and should remain a true SPA.

Normal user actions must not reload the entire document.

Avoid:
- `window.location.reload()`
- `window.location.href` for internal application routes
- raw `<a href="/internal-route">` when React Router navigation is appropriate

Prefer:
- `Link`
- `NavLink`
- `useNavigate`
- updating/refetching application state after mutations

After create/update/delete actions:
- update the relevant Redux/client state, or
- refetch the relevant resource, or
- refresh authenticated user data through the auth/store layer

Do not reload the whole page only to make changed data appear.

Preserve:
- browser history
- back/forward behavior
- direct route access
- route params
- mounted global providers/layout during route transitions

### Route loading

Large route pages may be loaded with `React.lazy` + `Suspense` when this safely reduces the initial bundle.

Good lazy-loading candidates include substantial:
- management pages
- player dashboard pages
- public data-heavy pages

Do not lazy-load every small component.

Do not introduce Next.js, Remix, SSR, or a new routing framework.
React + Vite + React Router remains the frontend architecture.

---

## 27. Shared component extraction map

The following are current high-value extraction candidates.

This is a roadmap, not an instruction to create every component immediately.

### Generic UI candidates

Extract when repeated use is concrete:

- `PageHeader`
- `Modal` / `Dialog`
- `FormField`
- `FormActions`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `SearchField`
- `FilterBar`
- `StatusBadge`
- `ActionMenu`
- `DataTable` shell
- responsive table wrapper
- `ResponsiveCardGrid`

### Modal standard

The shared modal should preferably use the already-installed `@headlessui/react` Dialog.

It should support:
- correct dialog semantics
- `aria-modal`
- labelled title
- focus trap
- Escape dismissal when dismissal is allowed
- focus restoration
- keyboard accessibility
- explicit `type="button"` for close controls
- long-content scrolling
- configurable panel width

Keep the API small.
Do not build a universal modal framework.

### FormField standard

The shared field wrapper should support:
- label
- `htmlFor`
- required marker
- optional description/help text
- validation error
- `aria-describedby`
- `aria-invalid`

Keep input/select/textarea elements composable children.

---

## 28. AdminTournaments refactor map

`src/pages/admin/AdminTournaments.tsx` currently combines several responsibilities and should gradually become an orchestration page.

Potential presentation components:

- `TournamentAdminCard`
- `TournamentFilters`
- `TournamentForm`
- `TournamentFormModal`
- `TournamentResultsModal`
- `TournamentResultsTable`
- `DeckAutocomplete`
- `TournamentActions`

Do not blindly create all of these.
Extract only clear, coherent boundaries.

### Business/domain logic candidates

Move these out of JSX/event handlers when practical:

- `parseStandingsInput(...)`
- `calculateTournamentRankingPoints(...)`
- `normalizeImportedStandings(...)`
- `matchImportedPlayer(...)`
- `buildTournamentResultsPayload(...)`
- tournament display-status derivation
- tournament filter/sort rules
- date-to-input conversion
- deck suggestion filtering
- participant-name matching
- stable deck/result association

Pure rules should live under the tournament feature and be unit-testable without React.

API operations such as:
- result submission
- deck creation
- tournament update/create

should preferably go through typed feature/service boundaries rather than raw Axios calls deeply embedded in page code.

Preserve all legacy behavior unless an existing bug is intentionally fixed.

---

## 29. ManageTeams refactor map

`src/pages/manage/ManageTeams.tsx` currently coordinates:

- team loading
- manageable-player loading
- create/edit forms
- image state
- active/inactive state
- player assignment
- player transfer
- player removal
- starting tournaments
- confirmations
- navigation
- derived player lists

Potential presentation components:

- `TeamManagementCard`
- `CreateTeamForm`
- `EditTeamForm`
- `TeamRoster`
- `TeamPlayerList`
- `PlayerAssignmentPanel` / `PlayerAssignmentModal`
- `TeamAdminActions`

The existing public `TeamCard` does not need to be forced into management usage if the responsibilities are genuinely different.

### Business/domain logic candidates

Prefer pure typed selectors/functions for:

- `playersForTeam(teamId, players)`
- `availablePlayersForAssignment(teamId, players)`
- determining whether an assignment is a transfer
- `canStartTournament(team)`
- team form normalization
- assignment eligibility
- active-player filtering

A focused hook such as `useTeamManagement()` is acceptable if it creates a clear mutation/loading boundary.

Do not move the entire page into one giant hook.

Keep confirmation UI at the interaction layer.
Keep mutation/domain operations clearly separated from presentation.

---

## 30. InternalTournament refactor map

`src/pages/manage/InternalTournamentPage.tsx` contains important real-time tournament behavior.

Preserve:
- server as canonical tournament state
- tournament-level revision conflict protection for structural mutations
- match-level result-version conflict protection for ordinary match saves
- Socket.IO synchronization only while the live tournament management screen is mounted
- fallback reload/polling while that live-management connection is disconnected
- later-round invalidation behavior
- current permissions
- save guarantees
- multiple dirty sibling match drafts across canonical updates
- multi-judge safety

Never weaken concurrency protection while refactoring.

### Live synchronization hook

A hook such as:

```text
useInternalTournamentLive(id)
```

may own:
- initial load
- Socket.IO subscription for the currently operated live tournament only
- connection state
- accepting only newer revisions
- deleted-tournament handling
- fallback polling
- cleanup, including disconnect/unsubscribe on route/page exit

Do not introduce a global/app-wide Socket.IO subscription. Public pages, management lists, team/player administration, historical entry and other non-live screens use normal HTTP/service state flows.

### Mutation hook

A focused hook such as:

```text
useInternalTournamentMutations(...)
```

may own:
- structural busy state
- canonical response handling
- request error normalization
- tournament-revision conflict handling
- per-match result-version conflict handling
- uncertain-save recovery
- mutation outcome

Do not mix unrelated visual state into these hooks.

### Derived domain utilities/selectors

Good extraction candidates:

- `isTournamentReadOnly(...)`
- `areAllMatchesComplete(...)`
- `participantsChanged(...)`
- `getParticipantName(...)`
- `currentRound(...)`
- `canPairNextRound(...)`
- `canCloseTournament(...)`

### Presentation components

Good candidates:

- `TournamentHeader`
- `TournamentConnectionStatus`
- `RoundSelector`
- `TournamentAttendance`
- `TournamentRound`
- `TournamentRoundActions`
- `TournamentSyncError`
- `TournamentStandings`

The intended direction is for the page to read mostly like composition/orchestration.

Example shape:

```tsx
<TournamentHeader />
<TournamentConnectionStatus />
<RoundSelector />

{setup && <TournamentAttendance />}

{showStandings ? (
  <TournamentStandings />
) : (
  <TournamentRound />
)}

<TournamentRoundActions />
```

This is an architectural example, not a required exact API.

---

## 31. MatchEditor refactor map

`src/components/MatchEditor.tsx` currently mixes result-domain rules with editing presentation.

Extract pure tournament-result rules where practical.

High-value examples:

- `getAllowedScores(winner)`
- `buildMatchResult(...)`
- `getMaxDrawnGames(score)`
- `formatMatchResult(...)`
- `isMatchDraftValid(...)`

Current Bo3 score choices are domain rules:

Player 1 wins:
- 2-0
- 2-1
- 1-0

Player 2 wins:
- 0-2
- 1-2
- 0-1

Draw:
- 0-0
- 1-1

These rules should not remain buried in JSX ternaries.

Likewise, maximum drawn-games calculation should be a named pure function.

If draft/save/retry/revision behavior forms a genuinely reusable concept, a focused hook such as `useMatchResultDraft(...)` is acceptable.

A dirty match draft must be scoped to that match. Receiving a newer canonical tournament snapshot because another match was saved must not erase the dirty draft or force it onto the new tournament-wide revision. The draft should retain the expected result version of its own match until saved, discarded, or a same-match conflict is detected.

Do not hide simple local UI state behind abstraction only for style.

---

## 32. PlayerDashboard refactor map

`src/pages/player/PlayerDashboardPage.tsx` currently mixes:

- dashboard presentation
- profile form state
- profile validation
- password verification
- profile update API calls
- error interpretation
- tournament derivation
- full-page reload behavior

Potential presentation components:

- `ProfileEditModal`
- `ProfileForm`
- `TournamentHistory`
- `UpcomingTournamentList`
- `AchievementList`

### Profile domain boundary

Profile validation should be independent from JSX.

Prefer the existing React Hook Form + Zod stack for this non-trivial form if integration is clean.

A natural home may be an existing auth/user feature rather than creating a new feature folder only for organizational purity.

The profile flow should separate:
- validation
- current-password verification
- update payload construction
- API mutation
- error mapping
- presentation state

### SPA requirement

Remove any `window.location.reload()` behavior used to refresh profile state.

After profile update:
- update the relevant auth/user state, or
- dispatch/refetch the existing authenticated-user action

The visible name/username must update without a full document reload.

### Derived data

Upcoming tournament selection should be a named selector/helper if it is reused:

- upcoming only
- chronological sort
- first N

---

## 33. AdminPlayers refactor map

The current `PlayerNameFields` extraction is a good direction.

Further candidates when duplication is real:

- `PlayerFormModal`
- `PlayerTypeBadge`
- `PlayerStatusBadge`
- `PlayerTable`
- `PlayerFilters`

Do not force team-player creation, quarterly-player creation, and editing into one giant component with many optional props.

Prefer composable shared pieces:

```tsx
<PlayerNameFields />
<FormField />
<FormActions />
```

with thin domain-specific forms.

Potential pure logic:

- player-name validation
- trimming/normalization
- create/update payload normalization
- player type labels
- filter helpers

Use the shared request error utility rather than creating new local API-error shapes when possible.

---

## 34. API/service standardization

The repository currently mixes:

- feature services
- Redux thunks
- direct `api.*` calls in pages
- custom request-error casting
- shared `requestError`

Gradually standardize toward:

```text
Page / component
    ↓
feature hook / thunk / service
    ↓
shared api client
```

Good candidates to move out of pages when touched:

- tournament result submission
- deck creation from tournament result UI
- profile update
- password verification/profile update flow

Do not create meaningless one-line wrappers only to add layers.
Create domain operations with typed inputs/outputs.

Use one consistent error-normalization strategy.

---

## 35. Derived data and selectors

Do not store values in React state when they can safely be derived.

Prefer named pure selectors/utilities for reusable rules.

Current candidates include:

- upcoming tournaments
- sorted tournament lists
- available players
- active team roster
- tournament display status
- whether all matches are complete
- participant lookup maps
- result display strings
- permissions-derived action availability

Use `useMemo` only when it provides real render/reference value.
Do not memoize everything automatically.

The primary goal is a named, testable rule.

---

## 36. Standard loading/error/empty states

The project still contains repeated patterns such as:

```tsx
<div className="animate-pulse">...</div>
```

and page-specific error/empty blocks.

As duplication becomes concrete, consolidate:

- `LoadingState`
- `ErrorState`
- `EmptyState`

They may support:
- icon
- title
- message
- optional action

Avoid separate near-identical implementations for admin, player, and tournament pages unless their behavior truly differs.

---

## 37. Status/badge reuse

Repeated page-specific status spans should be consolidated where appropriate.

Current examples include:

- tournament upcoming/completed
- recurring tournament
- team active/inactive
- player type
- player active/inactive
- live connection status

Use the shared `Badge` system or thin domain wrappers such as:

```tsx
<TournamentStatusBadge status={...} />
<TeamStatusBadge active={...} />
```

Do not duplicate the same Tailwind status classes across pages.

---

## 38. Form migration strategy

Do not rewrite every form at once.

When a non-trivial form is already being touched and local state/validation is becoming complex, prefer:

- React Hook Form
- Zod
- shared FormField/FormActions primitives

Strong candidates include:

- profile editing
- tournament create/edit
- larger management forms

Do not migrate a simple stable form merely for stylistic consistency.

---

## 39. Current refactor priorities

For the current gradual cleanup, prioritize in roughly this order:

1. improve shared `Modal` accessibility and `FormField`
2. remove SPA-breaking full-page reload behavior
3. extract pure business rules from `AdminTournaments`
4. extract real-time/revision orchestration from `InternalTournamentPage`
5. extract team-management derivations and coherent management components
6. separate profile form/domain behavior from `PlayerDashboardPage`
7. extract match score rules from `MatchEditor`
8. consolidate repeated loading/error/empty/status patterns
9. standardize direct page-level API calls when those areas are touched
10. consider route-level lazy loading where safe

Do not require all ten items in every refactor commit.
Keep commits reviewable and behavior-preserving.

---

## 40. Refactor verification

For focused frontend refactor work, run:

```bash
npm run lint
npm run build
npm run test:stage-a
npm run test:stage-a:ui
```

When formatting/unit/component/E2E infrastructure is added, include those checks as well.

For SPA-related changes verify:
- normal internal navigation does not reload the document
- profile editing updates displayed state without `window.location.reload()`
- direct URL access still works
- browser back/forward behavior still works
- protected/manage/admin routes still behave correctly

If route lazy loading is introduced, verify representative routes including:

- `/`
- `/tournaments`
- `/rankings`
- `/all-stars`
- `/dashboard`
- `/manage/*`
- `/admin/*`

For multi-judge tournament work, specifically verify that:
- newer server revisions win
- stale edits are not silently accepted
- disconnect/reconnect behavior remains safe
- fallback refresh behavior still works

---

## 41. Refactor reporting

At the end of a substantial frontend refactor, report:

1. reusable components created
2. hooks created
3. pure business/domain utilities extracted
4. pages simplified
5. duplicated production code removed
6. direct page-level API calls moved to feature/service boundaries
7. SPA reload/navigation issues removed
8. tests added or updated
9. exact status of lint/build/test commands
10. areas intentionally left unchanged and why
11. final commit SHA

A good refactor should make future feature work easier without changing product behavior.

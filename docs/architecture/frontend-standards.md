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

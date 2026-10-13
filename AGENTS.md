# Cardschool IL — Codex Instructions

This repository is the Cardschool IL Pokémon league and tournament system.

## Source of truth
Before implementing a feature, read `docs/version.md` first, then the relevant files under `docs/product/`, `docs/architecture/`, and `docs/decisions.md`.
For substantial work, also read the active execution plan under `docs/exec-plans/active/`.

### Version workflow
`docs/version.md` is the canonical implementation-batch tracker.

When asked to implement a numbered version:
- implement only that version's approved scope plus dependencies required to make it work
- detailed product/architecture docs remain authoritative for behavior
- in the same implementation PR, mark the version `DEVELOPED`
- record the implementation PR URL, final implementation SHA, verification results and known gaps in `docs/version.md`
- return the GitHub PR URL to the user
- if PR creation is unavailable, return the direct compare/create-PR URL and state that the final PR creation click is still required

For any frontend work, UI work, React refactor, component work, or page implementation, you MUST also read:

- `docs/architecture/frontend-standards.md`

Current product decisions override older code, comments, and earlier implementation assumptions.

## Working rules
- Keep the existing React + TypeScript + Redux Toolkit + Tailwind frontend and Node/Express + MongoDB backend unless a spec explicitly requires otherwise.
- Preserve the existing CardSchool visual system and RTL Hebrew UX unless a task says otherwise.
- Follow `docs/architecture/frontend-standards.md` for frontend structure, reuse, testing, accessibility, state ownership, forms, TypeScript, and refactoring boundaries.
- Build the reusable component library incrementally: use shared UI primitives first, then domain-specific reusable components, and keep pages focused on orchestration.
- Before creating a new UI pattern, search for an existing component that can be reused or naturally extended.
- Do not create duplicate buttons, cards, status badges, modals, table shells, form fields, loading states, error states, or empty states when a shared version can serve the need.
- Keep business/domain calculations out of presentation JSX when a hook, utility, service, or domain function is the clearer boundary.
- When touching existing code, improve the touched area opportunistically, but do not perform broad unrelated refactors.
- Do not split code merely to satisfy a line-count target, and do not create over-generalized components with excessive props just to claim reuse.
- Do not make unrelated refactors.
- Backend authorization is authoritative; hiding UI is not sufficient.
- Tournament state must be server-persisted. The browser must not be the canonical tournament state.
- Use the existing Socket.IO infrastructure for live tournament synchronization when possible; do not make manual “refresh from server” UX part of the normal workflow.
- Do not create login accounts for children in Stage A.
- Prefer Player references for new tournament-domain work; legacy User-based tournament data must remain backward compatible until migrated intentionally.
- Ranking data should be derived from tournament/result records, not manually maintained counters, unless a spec explicitly says otherwise.
- Do not fabricate competitive statistics that cannot be derived from real data.
- Do not implement future/out-of-scope product features merely because they appear in the product docs.
- Reuse existing functionality when it already exists. Do not create duplicate screens or duplicate workflows for the same capability.
- Run the existing build/lint/tests after implementation. As formatting and CI checks are added, treat those checks as required too.
- Keep changes focused and report the commit SHA when finished.

## Important product documents
- `docs/product/overview.md`
- `docs/product/teams.md`
- `docs/product/players.md`
- `docs/product/tournaments.md`
- `docs/product/rankings.md`
- `docs/product/badges-seasons.md`
- `docs/product/homepage.md`
- `docs/product/news-events.md`
- `docs/product/navigation-content.md`
- `docs/product/management-ui.md`
- `docs/product/internal-tournament-ui.md`
- `docs/architecture/frontend-standards.md`
- `docs/architecture/security.md`
- `docs/architecture/permissions.md`
- `docs/architecture/media-upload.md`
- `docs/decisions.md`

## Active execution plan
Read `docs/exec-plans/active/stage-a.md` before implementing Stage A or Stage A corrections.


## Efficient implementation and verification
Use the smallest useful verification loop while developing a version.

### During feature development
- Work in coherent feature batches rather than treating every file edit as a separate milestone.
- After a feature/sub-feature is implemented, run only the tests/checks directly relevant to that changed behavior.
- Prefer targeted unit/integration/UI tests for the touched domain instead of the full Stage A suite.
- Do not run the full repository test suite, full lint, and production build after every small change.
- If a focused lint/type check is useful for touched files, use it; reserve the configured full lint/build for final version verification.
- Extend an existing relevant test file/suite when practical instead of creating redundant verification scripts for small requirements.
- Test a rule at the lowest useful layer. Avoid asserting the same business rule redundantly across server, component and E2E layers unless each layer covers a distinct risk.
- Do not perform manual verification for behavior already adequately covered by automated tests, except where layout/visual interaction requires it.
- If an unrelated pre-existing test/type/lint issue appears, document it and continue unless the current change caused or depends on it. Do not expand scope to repair unrelated legacy issues.

### Final version verification
Only after the approved version scope is complete:
- run the full configured server/test suite
- run the full configured UI verification suite
- run full lint
- run the production build
- run any other version-required final checks documented in `docs/version.md`

If the full suite finds a failure:
1. identify the smallest failing subset
2. fix it
3. rerun that focused subset while iterating
4. rerun the full final verification only after the focused failure is resolved

### Reading and refactoring efficiency
- At the start of a numbered version, read `AGENTS.md`, `docs/version.md`, and the relevant referenced product/architecture/decision docs.
- During subsequent feature batches in the same version, reread only documents needed for that batch unless a dependency is unclear.
- Do not repeatedly reread unrelated project docs.
- Refactor only when required for the approved feature, to remove real duplication, or to establish an already-approved shared boundary.
- Do not broaden work into opportunistic repository-wide cleanup.
- Commit by coherent unit of work rather than after every tiny edit. Keep commits reviewable.

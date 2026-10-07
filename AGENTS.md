# Cardschool IL — Codex Instructions

This repository is the Cardschool IL Pokémon league and tournament system.

## Source of truth
Before implementing a feature, read the relevant files under `docs/product/`, `docs/architecture/`, and `docs/decisions.md`.
For substantial work, also read the active execution plan under `docs/exec-plans/active/`.

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

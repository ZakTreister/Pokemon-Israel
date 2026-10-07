# Cardschool IL — Codex Instructions

This repository is the Cardschool IL Pokémon league and tournament system.

## Source of truth
Before implementing a feature, read the relevant files under `docs/product/`, `docs/architecture/`, and `docs/decisions.md`.
For substantial work, also read the active execution plan under `docs/exec-plans/active/`.

Current product decisions override older code, comments, and earlier implementation assumptions.

## Working rules
- Keep the existing React + TypeScript + Redux Toolkit + Tailwind frontend and Node/Express + MongoDB backend unless a spec explicitly requires otherwise.
- Preserve the existing CardSchool visual system and RTL Hebrew UX unless a task says otherwise.
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
- Run the existing build/lint checks after implementation.
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
- `docs/architecture/security.md`
- `docs/architecture/permissions.md`
- `docs/architecture/media-upload.md`
- `docs/decisions.md`

## Active execution plan
Read `docs/exec-plans/active/stage-a.md` before implementing Stage A or Stage A corrections.

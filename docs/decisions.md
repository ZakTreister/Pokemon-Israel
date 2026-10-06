# Product Decisions

This file records current decisions that supersede earlier assumptions in code or prior implementation plans.

## 2026-10 — No child login in Stage A
Neither club players nor All Stars players log in.
Team-player workflows must not require User accounts.
Existing legacy links may remain backward compatible.

## 2026-10 — One management area
The user-facing management concept is only **ניהול**.
Remove/avoid **ניהול משותף** as a separate management area.

## 2026-10 — Seasons are mainly for badges
There are roughly 3-4 Seasons per year.
Season transitions are performed by super-admin from the Badges page.
Season changes do not reset any rankings.

## 2026-10 — Team competition year is separate from Season
All Stars/team competitive scoring accumulates through a competition year and resets around September 1 through an explicit super-admin action.
Historical yearly team data is preserved.

## 2026-10 — Regular ranking is lifetime
Regular/club player points accumulate across the player's lifetime.
No Season/year reset.

## 2026-10 — Scoring is separated by tournament context
Regular tournament scoring and team-domain scoring are separate.
Internal team tournaments rank team players; inter-team encounters rank teams.
Do not infer the scoring bucket from the player's current type alone.

## 2026-10 — Team creation is not Season-locked
Creating a team is allowed while a Season is active.
General team structural work must not be globally blocked by badge Season.

## 2026-10 — Team-player profile discovery
Team-player child profiles are linked only through the team page.
No global child directory.
Club players have no public individual profile.

## 2026-10 — Historical Excel import deferred
The future regular-tournament Excel file is expected to contain first name, last name, city and score, but its exact structure is unknown.
Do not implement the regular Excel importer until the actual file is available.
It applies only to regular tournaments, not team games.

## 2026-10 — Internal tournament retro entry is separate
Stage A must support entering historical results for internal team tournaments that occurred on Sunday 2026-10-04.
This is not the future regular Excel import.

## 2026-10 — Homepage team stats must be real
Do not calculate team win rate from internal tournaments.
True team standings/win rate come from official inter-team encounters.
Stage A may show active teams without pretending they are competitively ranked.

## 2026-10 — Badge administration is super-admin only
The Badges page, badge definition management and Season transition UX are restricted to the super-admin unless changed later.

## 2026-10 — News Phase 1 is manual
Use the existing Updates capability as the basis for News.
Manual paste/admin publishing comes first; automated WhatsApp Channel ingestion is future work.

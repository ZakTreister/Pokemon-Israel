# CardSchool IL — Codex Project Instructions

This file is the project-wide source of truth for current and future UI work in this repository unless the user explicitly overrides it later.

## 1. Visual source of truth

The current repository UI is NOT the approved visual source of truth.

The approved direction is the last vibrant CardSchool homepage concept created in this project: an energetic Pokémon TCG / esports / national-league website with strong blue/navy branding, yellow CTA accents, red LIVE accents, compact narrow/tall cards, dense 3–4 column desktop grids, a split hero, a live ticker, and controlled comic/trading-card energy.

Do not reinterpret this into a generic SaaS dashboard.

Target balance:
- 65% TCG / esports / sports-league energy
- 35% clean product UI

Public pages should feel lively and branded.
Admin/manage/player screens should use the same design system in a quieter, more functional way.

## 2. Engineering constraints

Project stack:
- React 18
- TypeScript
- Redux Toolkit
- React Router
- Tailwind CSS
- Vite
- Hebrew RTL

A visual redesign must NOT change:
- APIs
- backend routes
- Mongo models
- Redux state shape
- authentication
- permissions
- tournament logic
- ranking calculations
- business rules
- routes/URLs

Preserve existing real data, links, loading/error states, registration flows, management actions, responsive behavior, accessibility, and RTL.

Before finishing UI work, run:

```bash
npm run lint
npm run build
```

Both must pass.

## 3. Canonical palette

Use these values centrally in Tailwind/design tokens rather than scattering arbitrary hex values through JSX.

```css
--cs-navy:       #061A45;
--cs-navy-2:     #092B6E;

--cs-blue:       #0A64C9;
--cs-blue-2:     #1688F2;
--cs-cyan:       #54C8FF;

--cs-yellow:     #FFD323;
--cs-yellow-2:   #FFEA68;

--cs-red:        #EF2328;

--cs-white:      #FFFFFF;
--cs-ink:        #0A1938;
--cs-muted:      #687595;

--cs-bg:         #EEF4FB;
--cs-bg-light:   #F7FAFF;
--cs-line:       #D9E5F2;
```

General card shadow:

```css
box-shadow: 0 14px 34px rgba(6,26,69,.18);
```

Strong feature/banner shadow:

```css
box-shadow: 0 20px 48px rgba(6,26,69,.26);
```

Color hierarchy:
- blue + white dominate
- yellow = main CTA, champions, first place, emphasis, decorative energy
- red = LIVE, urgent states, destructive actions, high-priority tournament emphasis

Do not turn large page areas yellow or red.

## 4. Global visual language

Approved visual ingredients:
- dark navy gradients
- radial cyan/blue glow
- subtle light rays
- halftone dots
- diagonal lines
- yellow lightning shapes
- controlled card overlap
- mild motion
- cut-corner cards
- strong shadows
- subtle tinted gradients

Do not apply every effect everywhere.

Avoid:
- endless generic `rounded-xl bg-white shadow-sm`
- giant horizontal cards
- oversized empty white sections
- generic gray dashboard visuals
- glassmorphism everywhere
- pastel-only low-contrast UI

The site should feel composed and energetic, not noisy.

## 5. Shape language

For prominent public cards, use this cut-corner shape where appropriate:

```css
clip-path: polygon(
  14px 0,
  100% 0,
  100% calc(100% - 14px),
  calc(100% - 14px) 100%,
  0 100%,
  0 14px
);
```

Good uses:
- stat cards
- team cards
- player cards
- event banners
- news cards

Do not force cut corners onto:
- normal form fields
- dropdowns
- standard tables
- functional modals
- every tiny component

## 6. Public header

The public header should be light, polished and sticky.

Approved direction:
- height around 68–76px
- translucent white
- backdrop blur
- subtle border/shadow
- navy text
- balanced desktop nav
- yellow underline on hover
- compact login/action buttons

Suggested surface:

```css
background: rgba(255,255,255,.90);
backdrop-filter: blur(15px);
border-bottom: 1px solid rgba(6,26,69,.08);
```

Do NOT use a plain dark-blue admin-style navbar as the main public header.

## 7. Buttons

### Main public CTA

```css
background: linear-gradient(180deg, #FFEA68, #FFD323);
color: #09204F;
box-shadow: 0 5px 0 #B78D00;
```

Use for registration / hero CTA / main conversion action.

### Standard action

```css
background: linear-gradient(180deg, #1688F2, #0A64C9);
color: white;
box-shadow: 0 5px 0 #084D9C;
```

### Secondary
White or transparent with strong navy border.

### LIVE / urgent
Red.

Button behavior:
- strong font weight
- not oversized
- hover may translate upward ~2px
- visible focus states
- accessible disabled states

Do not make every action yellow.
Do not make every button pill-shaped.

## 8. Typography

Keep Rubik.

Headings:
- bold / extra-bold
- compact line height
- strong hierarchy
- slightly tighter spacing

Hero title may use:
- white main line
- yellow highlighted line/word
- subtle depth/shadow

Example:

```css
font-weight: 900;
line-height: .87;
letter-spacing: -0.03em;
```

Do not use heavy 3D/stroke text throughout the application.

## 9. Canonical homepage composition

HomePage is the visual reference implementation for the rest of the public site.

### Hero

Do NOT use a generic centered SaaS hero.

Desktop hero should be split approximately:

```css
grid-template-columns: 1.03fr .97fr;
```

Content side:
- LIVE/season pill
- large Hebrew headline
- yellow highlighted line/word
- short supporting copy
- yellow primary CTA
- outlined secondary CTA
- compact inline stats

Visual side:
- glowing blue radial/circular field
- 3 overlapping vertical trading-card shapes
- 1–2 yellow lightning elements
- Pokéball-inspired round element
- gentle floating animation

Approved hero background:

```css
background:
  radial-gradient(circle at 80% 20%, rgba(84,200,255,.35), transparent 25%),
  radial-gradient(circle at 15% 70%, rgba(255,211,35,.18), transparent 24%),
  linear-gradient(125deg, #04112F 0%, #062968 52%, #0A55AD 100%);
```

Add restrained rays, halftone and cyan glow.

Do NOT replace the visual side with a plain centered logo.

### Live ticker

Immediately below hero, use a red/yellow scrolling ticker when meaningful real data exists.

```css
background: #EF2328;
color: white;
border-top: 6px solid #FFD323;
border-bottom: 6px solid #9F0E11;
```

Use real data where possible:
- registration open
- tournament announcement
- current leader
- active round
- new player/activity

If there is no meaningful real data, omit it rather than inventing production facts.

Respect `prefers-reduced-motion`.

## 10. Desktop grid density — IMPORTANT

The user explicitly prefers cards that are narrower and taller rather than huge and wide.

Normal desktop target:
- 4 stat cards per row
- 4 team cards per row
- 4 top-player/ranking cards per row
- 3 news/editorial cards per row
- 3–4 cards per row generally when content fits

Typical gap:

```css
gap: 14px;
```

Tablet:
- usually 2 cards per row

Mobile:
- compact stat/team/player cards may stay 2 per row if readable
- editorial/forms usually 1 per row

Do not automatically collapse all mobile card grids to one column.

Avoid two oversized cards filling an entire desktop row unless content truly requires that width.

## 11. Stat / indicator cards

Approved structure:
- narrow
- moderately tall
- white surface
- cut corners
- controlled shadow
- thin border
- colored vertical accent strip
- small icon circle
- large number
- compact label
- optional trend/status

Approximate desktop min height:

```css
min-height: 150px;
```

Visual order:
1. icon
2. large number
3. label
4. trend/status

## 12. Team cards

Team cards should feel like esports/league cards, not admin panels.

Approved structure:
- 4 across desktop
- narrow/tall
- min-height around 325px
- cut-corner shape
- subtle team-tinted gradient
- round rank badge in corner
- shield/crest
- team name
- large points number
- 1–2 compact progress/stat lines
- compact footer stats

Example shield:

```css
clip-path: polygon(
  50% 0,
  90% 18%,
  82% 72%,
  50% 100%,
  18% 72%,
  10% 18%
);
```

Team colors are accents only; the CardSchool navy/blue/yellow system stays dominant.

## 13. Player / ranking cards

When using cards for top players:

- 4 across desktop
- narrow/tall
- dark blue gradient top strip
- rank badge
- circular avatar overlapping the strip
- player name
- city/team
- large rating/score
- 3 small metrics at bottom

Approximate min height:

```css
min-height: 275px;
```

For large ranking datasets, use a proper table rather than decorative cards for everyone.

## 14. Tables

Tables are functional first.

Use:
- navy/blue header
- white/light body
- subtle separators
- restrained hover
- bold key numbers
- gold/silver/bronze for top places
- compact status badges

Do not decorate every row with lightning/gradients.

On mobile:
- make horizontal scrolling deliberate, or
- provide a well-designed card alternative

Never allow silent overflow beyond viewport.

## 15. Feature / event banner

Use a strong dark event banner between sections when there is meaningful event content.

Approved direction:

```css
background:
  radial-gradient(circle at 18% 34%, rgba(255,211,35,.20), transparent 20%),
  linear-gradient(120deg, #071225, #052968 58%, #0B61C1);
```

Include:
- cut corners
- strong shadow
- LIVE label only when true
- event title
- short copy
- yellow CTA
- outline secondary CTA

Energetic, but not a full advertising poster.

## 16. News/editorial cards

Desktop:
- 3 across
- compact artwork area
- strong color
- small category tag
- title
- short excerpt

Use TCG/card-inspired graphic treatment when no actual content image exists.
Do not fabricate real photography.

## 17. Section rhythm

Alternate public sections between:
- very light background
- white content surfaces
- dark navy feature sections

Avoid one endless white page.

Typical section vertical spacing:
- 50–70px

Desktop container:
- around 1200px max width

The site should feel compact and active, not sparse.

## 18. Section headings

Use:
- small blue kicker
- large navy heading
- small yellow geometric mark

Approved mark:

```css
width: 54px;
height: 8px;
background: #FFD323;
clip-path: polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%);
```

Do not center every heading by default.

## 19. Motion

Allowed:
- gentle hero-card float
- soft LIVE pulse
- slow ticker
- mild card hover lift
- subtle image zoom/glow

Not allowed:
- constant bouncing
- aggressive scaling
- flashing
- heavy parallax everywhere
- motion that interferes with interaction

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

## 20. Responsive behavior

RTL must be correct at every breakpoint.

Desktop:
- split hero
- 4-column stats/team/player grids
- 3-column news
- full nav

Tablet:
- hero may stack
- 2-column cards
- nav may collapse
- feature banner may stack

Mobile:
- compact header
- stacked hero
- scaled-down decorative cards
- 2-column compact stat/team/player grids when readable
- 1-column editorial
- touch-friendly CTAs
- no Hebrew overflow

## 21. Public vs admin/manage/player UI

### Public site
Use full identity:
- dark hero
- glow
- halftone
- yellow accents
- red LIVE
- cut corners
- stronger cards
- energetic banners

### Admin / manager / judge / player dashboard
Use the same:
- palette
- typography
- buttons
- badges
- shadows
- table styling

But reduce:
- lightning
- decorative rays
- large artwork
- heavy marketing gradients

Admin must remain dense, efficient and functional.

## 22. Forms and modals

Keep them clean:
- white/light surfaces
- navy labels
- blue focus ring
- subtle borders
- red error
- green success
- consistent buttons

Do not use cut corners on normal text inputs unless there is a strong reason.

## 23. Tailwind/design-system architecture

Centralize tokens in:
- `tailwind.config.js`
- `src/index.css`

Shared UI should reuse/refactor:
- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/SectionHeading.tsx`
- `src/components/ui/StatCard.tsx`
- `src/components/ui/PageHero.tsx` where useful

Layout:
- `src/components/layout/Header.tsx`
- `src/components/layout/Footer.tsx`

Prefer reusable system components over duplicated page-specific styling.

Do not over-abstract tiny one-off decorations.

## 24. Current repo migration rule

The current attempted redesign in the repository was rejected by the user.

Do not preserve a visual decision just because it already exists in code.

In particular, current implementations of:
- `HomePage.tsx`
- `Header.tsx`
- `Footer.tsx`
- `PageHero.tsx`
- current generic `Card`
- current centered hero
- current public card widths

are NOT automatically canonical.

Refactor them to match this document while preserving their data and behavior.

## 25. Data integrity

Never hardcode fake production claims such as:
- player counts
- tournament counts
- ranking leaders
- event dates
- team scores
- registration states

unless explicitly building a demo/prototype.

For the actual application:
- use store/backend data
- hide empty sections
- show an empty state
- or clearly mark demo/sample data

Visual fidelity must not create false information.

## 26. Approved CSS patterns

Public page background:

```css
background: linear-gradient(#F7FAFF, #EEF4FB);
```

Cut card:

```css
clip-path: polygon(
  14px 0,
  100% 0,
  100% calc(100% - 14px),
  calc(100% - 14px) 100%,
  0 100%,
  0 14px
);
```

Blue button:

```css
background: linear-gradient(180deg, #1688F2, #0A64C9);
box-shadow: 0 5px 0 #084D9C;
```

Yellow CTA:

```css
background: linear-gradient(180deg, #FFEA68, #FFD323);
box-shadow: 0 5px 0 #B78D00;
```

Hero:

```css
background:
  radial-gradient(circle at 80% 20%, rgba(84,200,255,.35), transparent 25%),
  radial-gradient(circle at 15% 70%, rgba(255,211,35,.18), transparent 24%),
  linear-gradient(125deg, #04112F 0%, #062968 52%, #0A55AD 100%);
```

Hero glow:

```css
background:
  radial-gradient(
    circle,
    #49B8FF 0 8%,
    rgba(35,150,255,.30) 24%,
    rgba(35,150,255,.08) 55%,
    transparent 70%
  );
```

Card shadow:

```css
box-shadow: 0 14px 34px rgba(6,26,69,.18);
```

Hover lift:

```css
transform: translateY(-6px);
```

Translate these into Tailwind/shared components where practical.

## 27. What not to do

Do NOT:
- turn the site into a generic dashboard
- use huge white cards everywhere
- use only 2 cards per desktop row when 3–4 fit
- make the hero only centered text + logo
- use a dark admin navbar as the main public header
- make yellow a large background color
- overuse red
- gradient every input
- decorate every table row
- rewrite working logic while styling
- fabricate production data
- introduce a new UI framework without a strong reason
- duplicate shared styles unnecessarily
- finish with lint/build errors

## 28. Future UI rule

For every future feature:

1. Classify it as:
   - public/league UI
   - player UI
   - admin/manage UI
2. Reuse this design system.
3. Reuse shared components first.
4. Public cards should normally support 3–4 column desktop layouts unless content requires more width.
5. New colors need a functional reason.
6. Preserve the same section rhythm and density.
7. Keep management screens quieter and efficient.
8. The newest explicit user instruction overrides this file when there is a conflict.

Codex should use this file automatically for future tasks so the user does not need to restate the design direction.

## 29. Current redesign implementation order

Apply the redesign in this order:

1. Inspect current UI and preserve working logic/data.
2. Normalize Tailwind tokens.
3. Refactor shared Button/Card/Badge/SectionHeading/StatCard primitives.
4. Rebuild public Header.
5. Rebuild public Footer.
6. Rebuild HomePage as the canonical reference.
7. Apply the same visual system to tournaments, rankings, deck stats and tournament details.
8. Apply the quieter variant to login, player dashboard, admin, manage and judge screens.
9. Verify desktop/tablet/mobile.
10. Run lint and build.
11. Fix all regressions before finishing.

## 30. Definition of done

A UI task is complete only when:
- it visibly follows this document
- the public site feels like a competitive Pokémon/TCG/esports league
- it does not look like a generic SaaS template
- desktop grids have the intended density
- RTL is correct
- mobile is deliberately designed
- current functionality still works
- no fake production data was introduced
- shared components are reused
- `npm run lint` passes
- `npm run build` passes

If the code is technically correct but visually drifts away from this design system, the task is NOT complete.

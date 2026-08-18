# Design Brief

## Direction

إمداد (Imdad) — a clean, professional Arabic RTL business management system for a paper products company, built for clarity and ease of use by non-technical staff.

## Tone

Calm, trustworthy, and uncluttered — a warm paper-white workspace with a deep teal primary and soft blue accent, prioritizing readability and information density over decoration.

## Differentiation

Paper-as-metaphor executed with restraint: warm paper-white surfaces, deep teal actions, and subtle blue highlights make a CRUD-heavy internal tool feel calm, professional, and unmistakably Arabic-first.

## Color Palette

| Token       | OKLCH         | Role                                 |
| ----------- | ------------- | ------------------------------------ |
| background  | 0.985 0.006 85 | warm paper-white app canvas         |
| foreground  | 0.22 0.02 220 | deep ink text                        |
| card        | 1 0.003 85    | elevated white surfaces              |
| primary     | 0.42 0.08 200 | deep teal actions / active nav       |
| accent      | 0.88 0.05 210 | soft blue highlights, emphasis       |
| muted       | 0.955 0.01 90 | soft secondary surfaces              |
| success     | 0.55 0.15 150 | paid / positive states               |
| destructive | 0.55 0.2 25   | delete / errors                      |

## Typography

- Display: Noto Kufi Arabic (Cairo fallback) — headings, logo, stat numbers
- Body: Noto Naskh Arabic (Tajawal fallback) — primary Arabic UI text
- Mono: JetBrains Mono — invoice numbers, product codes, IDs (LTR numerals)
- Scale: hero `text-3xl font-bold`, h2 `text-2xl font-bold`, label `text-sm font-semibold`, body `text-base`
- Numerals/currency use `.num` (LTR embed) for correct ordering in RTL

## Elevation & Depth

Card-based hierarchy: `bg-card` on `bg-background`, `shadow-subtle` for resting cards, `shadow-elevated` for modals/dropdowns; borders use `border-border` to separate zones without heavy shadows.

## Structural Zones

| Zone    | Background      | Border    | Notes                              |
| ------- | --------------- | --------- | ---------------------------------- |
| Sidebar | `bg-sidebar`    | `border-l`| fixed RTL nav, active item primary |
| Header  | `bg-card`       | `border-b`| page title + quick actions         |
| Content | `bg-background` | —         | alternate `bg-muted/40` stat cards |
| Footer  | `bg-muted/40`   | `border-t`| totals / secondary info            |

## Spacing & Rhythm

Generous section gaps (`gap-6`/`space-y-6`), content grouped in cards with `p-6`; compact table rows for dense CRUD data; consistent `gap-2` micro-spacing inside controls.

## Component Patterns

- Buttons: rounded-md, `bg-primary` text-white for primary, `bg-secondary` for secondary, hover darkens; destructive uses `bg-destructive`
- Cards: rounded-lg, `bg-card`, `shadow-subtle`, `border-border`
- Badges: rounded-full pills, success/warning/accent tints for status

## Motion

- Entrance: `animate-fade-in` (0.25s) on page/card mount
- Hover: `transition-smooth` color/shadow shifts (0.3s)
- Decorative: none — restraint for a productivity tool

## Constraints

- Full Arabic RTL layout in every page (dir="rtl", logical properties)
- Egyptian Pounds (ج.م) formatting in all figures, tables, invoices
- No login — system open; no employee/manufacturing/expense/stock-alert modules
- All messages (success/error/confirm/empty) in Arabic

## Signature Detail

Warm paper-white surfaces with a deep teal primary and soft blue accent — a calm, professional Arabic-first workspace that makes dense business data feel approachable.

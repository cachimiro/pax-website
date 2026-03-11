# Spec: Lead Detail Page — Full Layout Redesign

## Problem Statement

The current lead detail page has several UX problems:

1. **Narrow 320px sidebar** — name truncates, contact details cramped, too many stacked cards require heavy scrolling.
2. **Right panel blank** — tab content not rendering due to a runtime error in recent changes.
3. **No visual hierarchy** — sidebar and right panel feel like two disconnected equal-weight columns.
4. **Too many sidebar cards** — Contact, Project, Discovery, AI Insights, Smart Actions, Snooze are all separate cards stacked vertically.
5. **Tab bar cluttered** — 8 tabs in a row with underline style is hard to scan.
6. **Style is dated** — not consistent with modern SaaS tools like Linear or Notion.

Target: clean, information-dense, modern SaaS layout. Most important data immediately visible without scrolling. Secondary data one click away.

---

## New Layout

```
┌─────────────────────────────────────────────────────────┐
│  ← Back                                      [Delete]   │  top bar
├─────────────────────────────────────────────────────────┤
│  [M]  Mihai Aconstantinesei  [New] [Hot]   Call Email WA│  hero header (full width)
│       email · phone · postcode · 7 days ago             │
├──────────────────────────┬──────────────────────────────┤
│  LEFT PANEL (360px)      │  RIGHT PANEL (flex-1)        │
│  sticky unified card:    │  [pill tabs]                 │
│  ─ Project + stage       │  [tab content — no wrapper]  │
│  ─ AI insights + snooze  │                              │
│  ─ Smart actions         │                              │
└──────────────────────────┴──────────────────────────────┘
```

---

## Requirements

### R1 — Hero Header (full width)
- Spans both columns above the two-column split
- Large avatar (64px rounded-xl) + name (24px, never truncated) + status select + AI score badge in one row
- Contact details (email, phone, postcode, created) as a horizontal flex-wrap chip row below the name
- Call / Email / WhatsApp buttons right-aligned — always visible, not buried
- `+ Log call` as a small text link next to the action buttons
- `bg-white border border-[var(--warm-100)]` card, `rounded-2xl`, `p-5`

### R2 — Unified Left Panel (360px, sticky)
Single `bg-white border border-[var(--warm-100)] rounded-2xl` card replacing all current separate sidebar cards. Three sections divided by `<hr>`:

**Project section**
- Pipeline stage badge + compact 4px progress bar
- Project chips (Room, Style, Package, Budget, Timeline, Location) in wrapping pill layout
- Discovery answers collapsible (collapsed by default)

**AI section**
- Collapsed skeleton until loaded
- When loaded: score tier + one-line suggestion
- Snooze nudge buttons (1d 3d 7d 14d) at the bottom of this section

**Actions section**
- Smart action rows: icon + label + description, compact
- No separate card borders — just rows within the section

### R3 — Pill Tab Bar
Replace sliding underline indicator with pill-style tabs:
- Active: `bg-[var(--green-50)] text-[var(--green-700)] border border-[var(--green-200)] rounded-full px-3 py-1.5`
- Inactive: `text-[var(--warm-500)] hover:text-[var(--warm-700)] hover:bg-[var(--warm-50)] rounded-full px-3 py-1.5`
- Count badge inside each pill
- 6 primary tabs: Overview · Contact · Pipeline · Comms · Money · Tasks
- `···` overflow button for Notes and Fitting

### R4 — Tab Content Styling
- Remove the outer `bg-white rounded-2xl border` wrapper from the tab content area
- Each tab renders its own section blocks: `bg-[var(--warm-50)] rounded-xl p-4`
- Section headers: `text-[10px] uppercase tracking-wider font-semibold text-[var(--warm-400)]`
- `space-y-4` between sections within a tab

### R5 — Overview Tab
Three section blocks:
1. **Open tasks** — compact checklist, max 3 items shown, `+ Add task` link, overdue tasks in red
2. **Next booking** — single row card with date, type, duration, join link
3. **Activity timeline** — vertical timeline, icon + label + relative timestamp

### R6 — Fix blank right panel
- Identify the runtime error causing tab content not to render
- Ensure all 6 tab components render without errors

### R7 — Page background and typography
- Page background: `bg-[var(--warm-50)]` (off-white)
- Cards: `bg-white border border-[var(--warm-100)]`
- Section blocks inside tabs: `bg-[var(--warm-50)] rounded-xl`
- Name: `font-heading text-2xl font-semibold`
- Section labels: `text-[10px] uppercase tracking-wider font-semibold text-[var(--warm-400)]`
- Primary text: `text-[var(--warm-800)]`, secondary: `text-[var(--warm-500)]`

---

## Acceptance Criteria

- [ ] Hero header full-width, name never truncates, action buttons always visible without scrolling
- [ ] Left panel is one unified card (not 4–5 separate cards)
- [ ] Left panel is sticky — stays in place while right panel scrolls
- [ ] Tab bar uses pill style
- [ ] All 6 tabs render without errors
- [ ] Overview tab shows tasks widget + next booking + activity timeline as distinct section blocks
- [ ] Page background is off-white, cards are white — clear visual layering
- [ ] No horizontal scrollbar at 1280px+ viewport
- [ ] All existing functionality preserved (compose, call log, stage changes, task creation, AI, snooze)

---

## Implementation Order

1. Fix the blank right panel runtime error — establish a working baseline first.
2. Rewrite page layout — hero header (full-width), left panel (360px unified), right panel (flex-1).
3. Build `LeadSidePanel` component — merges ProjectSummaryCard, AIInsightsPanel, SmartActions, DiscoveryAnswersCard, Snooze into one unified panel.
4. Implement pill tab bar — replace sliding underline.
5. Restyle tab content — remove outer wrapper, apply section block styling.
6. Polish Overview tab — tasks widget, next booking, timeline sections.
7. Typography and colour pass — off-white bg, consistent section headers, spacing.
8. Verify all tabs with real data.

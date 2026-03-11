# CRM Improvement Spec

## Problem Statement

The PaxBespoke CRM is a full-featured sales pipeline tool built on Next.js 15 + Supabase. After a complete audit of every page, component, data hook, and style system, this spec documents all identified bugs, UX deficiencies, and missing features — and defines a prioritised implementation plan to resolve them.

---

## Codebase Map

### Pages (route → file)
| Route | File | Purpose |
|---|---|---|
| `/crm` | `src/app/(crm)/crm/page.tsx` | Dashboard: CRM metrics + website analytics tabs |
| `/crm/leads` | `src/app/(crm)/crm/leads/page.tsx` | Lead list with search, filter, sort, trash |
| `/crm/leads/[id]` | `src/app/(crm)/crm/leads/[id]/page.tsx` | Lead detail: contact, opportunities, bookings, messages, invoices, tasks, notes, fitting |
| `/crm/pipeline` | `src/app/(crm)/crm/pipeline/page.tsx` | Kanban board with drag-and-drop stage management |
| `/crm/calendar` | `src/app/(crm)/crm/calendar/page.tsx` | Week/day/month calendar with bookings, visits, fittings, tasks |
| `/crm/tasks` | `src/app/(crm)/crm/tasks/page.tsx` | Task list grouped by overdue/today/upcoming/no-due/done |
| `/crm/fittings` | `src/app/(crm)/crm/fittings/page.tsx` | Fitting job management: unassigned, offered, active, board, completed |
| `/crm/reports` | `src/app/(crm)/crm/reports/page.tsx` | Revenue, lead sources, conversion funnel, performance reports |
| `/crm/settings` | `src/app/(crm)/crm/settings/page.tsx` | Team, templates, Google, messaging, service regions, AI |
| `/crm/onboarding` | `src/app/(crm)/crm/onboarding/page.tsx` | New user setup: name, Google Calendar connect |
| `/crm/login` | `src/app/(crm)/crm/login/` | Auth page |
| `/crm/mfa-setup` | `src/app/(crm)/crm/mfa-setup/` | MFA enrollment |
| `/crm/mfa-verify` | `src/app/(crm)/crm/mfa-verify/` | MFA challenge |

### Key Components
- **Shell**: `CrmShell` → `Sidebar` + `Topbar` + `MobileSidebar` + `MobileBottomNav`
- **Pipeline**: `PipelineBoard` → `PipelineColumn` → `OpportunityCard`
- **Lead Detail**: 9-tab layout with `ActivityTimeline`, `SmartActions`, `AIInsightsPanel`, `ProjectSummaryCard`, `DiscoveryAnswersCard`
- **Calendar**: Week/day/month views with DnD rescheduling, `CalendarEventPanel`, `CalendarAgenda`, `CalendarStatsBar`
- **AI**: `DailyBriefing`, `PipelineHealthCheck`, `AIInsightsPanel`, `SmartActions` — all gated by `useAIPreferences`
- **Modals**: `NewLeadModal`, `CsvImportModal`, `StageTransitionModal`, `LostReasonModal`, `ModalWrapper`
- **Notifications**: `NotificationCenter` with Supabase Realtime subscriptions

### Data Layer
- **Hooks**: `src/lib/crm/hooks.ts` — ~50 React Query hooks for all entities
- **Types**: `src/lib/crm/types.ts` — full TypeScript definitions
- **Stages**: `src/lib/crm/stages.ts` — 24 pipeline stages, 11 column groups
- **Automation**: `src/lib/crm/automation.ts` — stage-triggered tasks + messages
- **Risk**: `src/lib/crm/risk.ts` — opportunity staleness scoring
- **AI hooks**: `src/lib/crm/ai-hooks.ts` — score, suggest, compose, briefing, health check

---

## Bugs Found

### B1 — Invalid stage value in OpportunitiesTab
**File**: `src/app/(crm)/crm/leads/[id]/page.tsx` ~line 640
**Issue**: `createOpp.mutate({ lead_id: leadId, stage: 'new_lead' as OpportunityStage })` — `'new_lead'` is not a valid `OpportunityStage`. The correct value is `'new_enquiry'`. This causes a Supabase constraint violation when a user creates a new opportunity from the lead detail page.
**Fix**: Change `'new_lead'` to `'new_enquiry'`.

### B2 — Missing CSS custom properties: `--warm-25` and `--brand`
**Files**: `src/app/(crm)/crm/leads/[id]/page.tsx`, `src/app/(crm)/crm/leads/page.tsx`, multiple components
**Issue**: Several components reference `var(--warm-25)` and `var(--brand)` / `var(--brand-light)` which are not defined in `globals.css`. These elements render with no background or colour (falls back to transparent/inherit).
- `--warm-25` used in MessagesTab engagement stats bar and message bubbles
- `--brand` used in InlineComposeBar send button, task create button, opportunity card links, FittingTab links
- `--brand-light` used in JobCard hover border
**Fix**: Add `--warm-25: #FAFAF9`, `--brand: var(--green-600)`, `--brand-light: var(--green-100)` to `:root` in `globals.css`.

### B3 — Optimistic update targets wrong cache key for non-admin users
**File**: `src/components/crm/PipelineBoard.tsx` ~line 100
**Issue**: `optimisticMove` calls `qc.setQueryData(['opportunities', undefined], ...)` but `useOpportunities` is called with `isAdmin ? undefined : { owner_user_id: profile?.id }`. For non-admin users the cache key is `['opportunities', { owner_user_id: '...' }]`, so the optimistic update silently fails and the card snaps back before the server confirms.
**Fix**: Use `qc.setQueriesData({ queryKey: ['opportunities'] }, updater)` to update all matching opportunity caches regardless of filter key.

### B4 — Task auto-move bypasses stage automations
**File**: `src/lib/crm/hooks.ts` `useUpdateTask` onSuccess ~line 480
**Issue**: When a task of type `call1_attempt`, `call2_attempt`, or `onboarding_session` is marked done, the hook directly calls `supabase.from('opportunities').update({ stage: targetStage })` without calling `runStageAutomations`. No emails are sent, no new tasks are created, and no stage log entry is written for these auto-moves.
**Fix**: After the direct DB update, call `runStageAutomations(supabase(), data.opportunity_id, targetStage)` and insert a `stage_log` row, matching the pattern in `useMoveOpportunityStage`.

### B5 — FittingTab links to the fittings list instead of the specific job
**File**: `src/app/(crm)/crm/leads/[id]/page.tsx` FittingTab ~line 1310
**Issue**: `<Link href="/crm/fittings">` navigates to the fittings list page, losing context of which job the user was viewing.
**Fix**: Pass `?job=${job.id}` as a query param and have the Fittings page open `FittingDetailPanel` for that job on mount when the param is present.

### B6 — `applyStageChange` ignores the `withAutomations` flag
**File**: `src/app/(crm)/crm/leads/[id]/page.tsx` `applyStageChange` ~line 680
**Issue**: Both branches of `if (withAutomations)` call the same `updateOpp.mutate(...)`. The "Change only" button does the exact same thing as "Confirm + automations" — the distinction is cosmetic only.
**Fix**: The "Change only" path should call a direct Supabase update that skips `runStageAutomations`, or call a separate API route with an `automations=false` flag.

### B7 — `useSignature` does not check `res.ok` before accessing `.signature`
**File**: `src/lib/crm/hooks.ts` `useSignature` ~line 960
**Issue**: `queryFn` does `const data = await res.json(); return data.signature` without checking `res.ok`. If the API returns an error JSON, `data.signature` is `undefined` and the query resolves silently instead of throwing, so the error state is never shown.
**Fix**: Add `if (!res.ok) throw new Error(data.error ?? 'Failed to load signature')` before accessing `data.signature`.

### B8 — Calendar tasks query uses invalid status value `'in_progress'`
**File**: `src/app/(crm)/crm/calendar/page.tsx` ~line 75
**Issue**: `.in('status', ['open', 'in_progress'])` — `'in_progress'` is not a valid `TaskStatus` (only `'open'` and `'done'` exist per `types.ts`). This may cause unexpected DB behaviour if the column has a check constraint.
**Fix**: Change to `.eq('status', 'open')`.

### B9 — `InvoiceManager.recordPayment` writes `paid_at` to invoices table (column does not exist)
**File**: `src/components/crm/InvoiceManager.tsx` ~line 55
**Issue**: `supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() })` — `paid_at` is not defined in the `Invoice` type or the `Database` interface. This update will silently fail or throw a Postgres column-not-found error.
**Fix**: Remove `paid_at` from the invoice update. Payment timestamp is already recorded in the `payments` table.

### B10 — `DailyBriefing` localStorage dismiss keys accumulate indefinitely
**File**: `src/components/crm/DailyBriefing.tsx` ~line 28
**Issue**: Old dismiss keys from previous days are never cleaned up, accumulating in localStorage.
**Fix**: On mount, if the stored value does not equal today's date string, remove the key before setting dismissed state.

---

## UX & Design Issues

### U1 — Dashboard hierarchy: analytics tabs dominate, CRM metrics are buried
The page opens on website analytics tabs. The CRM metrics (pipeline value, revenue, leads, win rate, tasks) are rendered below the AI briefing but above the tabs — easy to miss. For a sales team, pipeline health is the primary concern.
**Improvement**: Restructure so CRM metrics are the hero section at the top, AI Daily Briefing is directly below, then a "Website Analytics" heading with the tabs section below a visual divider.

### U2 — Pipeline sub-stages are not scannable
Grouped columns (e.g. "Meet 1" contains `call1_scheduled`, `qualified`, `meet1_completed`) show a sub-stage badge on each card but the badge is tiny (9px text) and uses the same colour for all sub-stages within a group. With 10+ cards across 3 sub-stages, distribution is impossible to see at a glance.
**Improvement**: Add a sub-stage breakdown row inside each column header — small pills showing count per sub-stage (e.g. `Scheduled ×3 · Qualified ×2 · Completed ×1`).

### U3 — Mobile bottom nav missing Fittings, Reports, Settings
`MobileBottomNav` hardcodes 5 items. Fittings, Reports, and Settings are inaccessible on mobile without the sidebar hamburger.
**Improvement**: Add a 6th "More" item that opens a bottom sheet with the remaining nav items (role-gated).

### U4 — Lead detail page: 9 tabs cause horizontal scroll on small screens
On screens < 400px wide, tabs overflow with no visual indicator that more tabs exist.
**Improvement**: Keep primary tabs (Activity, Contact, Opportunities, Messages) always visible; collapse secondary tabs (Bookings, Invoices, Tasks, Notes, Fitting) into a "More" dropdown on small screens.

### U5 — Tasks page: drag-and-drop reorder is visual-only with no persistence
`handleDragEnd` does nothing — the comment says "Visual reorder only — no backend persistence". After a page refresh, order reverts. Drag handles create a false affordance.
**Improvement**: Remove drag handles to eliminate the false affordance. (Alternatively, add a `sort_order` column and persist reorder — higher effort.)

### U6 — Reports revenue chart has no hover tooltips or axis labels
Revenue chart uses animated `div` elements with percentage heights. No axis labels, no hover tooltips, no exact value on hover.
**Improvement**: Add hover tooltips showing exact £ value and add Y-axis labels to the revenue bar chart.

### U7 — Fittings stats bar conditionally renders cards, causing layout shift
`{offeredJobs.length > 0 && <StatCard ...>}` means the stats bar changes width/layout as jobs move between statuses.
**Improvement**: Always render all 5 stat cards; show `0` when empty. Use a consistent grid layout.

### U8 — Settings page: no explanation of what requires Google connection
When Google Calendar is not connected, users don't know what features are unavailable.
**Improvement**: Add a feature-impact callout near the Google connect section listing what stops working without it (calendar sync, Meet links, booking availability).

### U9 — Topbar breadcrumb missing for Fittings and Reports pages
`BREADCRUMB_MAP` in `Topbar.tsx` does not include `/crm/fittings` or `/crm/reports`.
**Fix**: Add `'/crm/fittings': 'Fittings'` and `'/crm/reports': 'Reports'` to `BREADCRUMB_MAP`.

### U10 — Lead list sort indicators use raw arrow characters instead of icons
Sort direction is shown as `↑` / `↓` appended to column header text, inconsistent with the Lucide icon system used everywhere else.
**Improvement**: Replace with `<ChevronUp>` / `<ChevronDown>` Lucide icons inline with the header label.

### U11 — Opportunity card quick-action buttons (Call, Email, WhatsApp) are non-functional
In `OpportunityCard`, the Phone, Mail, and MessageSquare buttons in the hover actions row have no `onClick` handlers — they are purely decorative.
**Improvement**: Wire Phone to `tel:` link, Email to open compose modal, WhatsApp to `https://wa.me/` link.

### U12 — Calendar week view has no empty state when there are no events
When a week has no bookings, visits, fittings, or tasks, the grid renders empty with no message. Users may think data failed to load.
**Improvement**: Show a subtle empty-state message in the centre of the grid.

### U13 — `NewLeadModal` does not assign an owner to the created lead
`createLead.mutateAsync({ ...leadData, status: 'new' })` does not set `owner_user_id`. The lead and its auto-created opportunity are both unowned.
**Improvement**: Default `owner_user_id` to the current user's profile ID. Add an optional "Assign to" dropdown for admins.

### U14 — Pipeline board has no search or name filter
Admins can filter by designer but there is no way to search by lead name across the board.
**Improvement**: Add a search input above the board that filters cards by lead name in real-time (client-side).

### U15 — `CommandPalette` fetches all data even when closed
`useLeads()`, `useOpportunities()`, and `useTasks()` are called unconditionally inside `CommandPalette`, which is always mounted in the topbar.
**Improvement**: Add `enabled: open` to each query so data is only fetched when the palette is open.

---

## New Features

### F1 — Bulk actions on Leads list
Add checkbox selection to the leads table with bulk actions: assign owner, change status, export to CSV, move to trash.

### F2 — Pipeline value trend on Dashboard
Add month-over-month delta indicators to each CRM metric card (computable from existing `useOpportunities` data — no new API needed).

### F3 — Task creation from Pipeline card context menu
Add "Add task" to the opportunity card hover actions row, opening an inline mini-form pre-filled with the opportunity context.

### F4 — Snooze from Pipeline board
Add snooze quick options (1d/3d/7d) to the opportunity card hover actions row, matching the snooze control on the lead detail page.

### F5 — Notification preferences panel
Add a preferences panel accessible from the notification bell to configure which notification types to receive.

---

## Acceptance Criteria

### Bug fixes
- [ ] B1: Creating a new opportunity from lead detail succeeds without DB error
- [ ] B2: All elements using `--warm-25`, `--brand`, `--brand-light` render with correct colours
- [ ] B3: Dragging a card on the pipeline board for a non-admin user shows the correct optimistic position without reverting
- [ ] B4: Completing a `call1_attempt` task triggers stage automations (email sent, stage log written)
- [ ] B5: Clicking a fitting job from the lead detail Fitting tab opens the correct job in the Fittings page
- [ ] B6: "Change only" and "Confirm + automations" buttons produce different outcomes
- [ ] B7: Signature API errors surface as error state in the settings UI
- [ ] B8: Calendar tasks query uses only valid status values
- [ ] B9: Recording a payment does not attempt to write `paid_at` to the invoices table
- [ ] B10: localStorage dismiss key is cleaned up on new day

### UX improvements
- [ ] U1: Dashboard opens with CRM metrics as the primary hero section
- [ ] U2: Pipeline columns show sub-stage count breakdown in the column header
- [ ] U3: Mobile bottom nav has a "More" item that reveals Fittings, Reports, Settings
- [ ] U4: Lead detail tabs do not require horizontal scroll on screens < 400px
- [ ] U5: Task drag handles are removed (false affordance eliminated)
- [ ] U6: Revenue chart has hover tooltips with exact values and Y-axis labels
- [ ] U7: Fittings stats bar always renders all 5 cards
- [ ] U8: Settings Google section explains what features require connection
- [ ] U9: Topbar breadcrumb shows for Fittings and Reports pages
- [ ] U10: Sort indicators use Lucide icons
- [ ] U11: Opportunity card quick-action buttons are functional
- [ ] U12: Calendar week view shows empty state when no events exist
- [ ] U13: New leads are assigned to the creating user by default
- [ ] U14: Pipeline board has a lead name search input
- [ ] U15: CommandPalette only fetches data when open

### New features
- [ ] F1: Leads list supports multi-select with bulk actions
- [ ] F2: Dashboard metric cards show month-over-month trend
- [ ] F3: Pipeline card hover actions include "Add task"
- [ ] F4: Pipeline card hover actions include "Snooze"
- [ ] F5: Notification bell has a preferences panel

---

## Implementation Plan

Tasks are ordered by dependency and impact. Each step is independently shippable.

### Phase 1 — Critical bug fixes
1. **B2** — Add `--warm-25`, `--brand`, `--brand-light` to `globals.css` `:root`
2. **B1** — Change `'new_lead'` to `'new_enquiry'` in `OpportunitiesTab`
3. **B8** — Change calendar tasks query to `.eq('status', 'open')`
4. **B9** — Remove `paid_at` from `InvoiceManager` invoice update
5. **B7** — Add `res.ok` check in `useSignature` queryFn
6. **B3** — Update `optimisticMove` to use `qc.setQueriesData` for all opportunity cache keys
7. **B4** — Add `runStageAutomations` + `stage_log` insert to `useUpdateTask` auto-move paths
8. **B6** — Differentiate "Change only" vs "Confirm + automations" in `applyStageChange`
9. **B5** — Pass `?job=` query param from FittingTab links; handle in Fittings page on mount
10. **B10** — Clean up stale dismiss key in `DailyBriefing`

### Phase 2 — Quick UX wins (low effort, high impact)
11. **U9** — Add Fittings and Reports to `BREADCRUMB_MAP` in `Topbar`
12. **U10** — Replace sort arrow characters with Lucide icons in leads table
13. **U7** — Always render all 5 stat cards in Fittings page
14. **U12** — Add empty state to Calendar week view
15. **U13** — Default `owner_user_id` to current user in `NewLeadModal`; add admin assign dropdown
16. **U15** — Add `enabled: open` to CommandPalette data hooks

### Phase 3 — Dashboard restructure
17. **U1** — Reorder `DashboardPage`: CRM metrics hero → AI Briefing → divider → "Website Analytics" heading → tabs
18. **F2** — Add month-over-month delta to each CRM metric card (computed from existing opportunity data)

### Phase 4 — Pipeline improvements
19. **U2** — Add sub-stage count breakdown row to `PipelineColumn` header
20. **U14** — Add lead name search input above the pipeline board
21. **F3** — Add "Add task" to opportunity card hover actions (inline mini-form)
22. **F4** — Add "Snooze" to opportunity card hover actions (1d/3d/7d quick options)

### Phase 5 — Mobile & navigation
23. **U3** — Add "More" item to `MobileBottomNav` that opens a bottom sheet with Fittings, Reports, Settings (role-gated)
24. **U4** — Collapse lead detail secondary tabs into a "More" dropdown on screens < 400px

### Phase 6 — Functional fixes
25. **U11** — Wire opportunity card quick-action buttons: Phone → `tel:`, Email → compose modal, WhatsApp → `wa.me/`
26. **U5** — Remove drag handles from Tasks page to eliminate false affordance

### Phase 7 — Reports & charts
27. **U6** — Add hover tooltips to revenue bar chart (exact £ value on hover)
28. **U6** — Add Y-axis labels to revenue chart

### Phase 8 — Settings & notifications
29. **U8** — Add feature-impact callout to Google settings section
30. **F5** — Add notification preferences panel to `NotificationCenter`

### Phase 9 — Bulk lead actions
31. **F1** — Add checkbox column to leads table
32. **F1** — Add bulk action toolbar (assign, status change, export CSV, trash) that appears when 1+ leads are selected

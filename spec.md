# Spec: Leads Page & Lead Detail Improvements

## Problem Statement

The leads list and individual lead pages have several UX gaps that slow down daily sales work:

- **List page**: No visual health indicators, limited filtering, no inline actions, missing key columns (stage, value, last contact).
- **Detail page**: 9 tabs create navigation overhead; no structured call logging; opportunity stage progression is opaque; contact fields are too sparse; duplicate leads can silently coexist.
- **Cross-cutting**: No duplicate detection, no lead merge, no quick-reply from the list.

Scope: UX improvements + new UI-only features. No new database columns unless strictly required. Desktop-first.

---

## Current State Summary

### Leads List (`/crm/leads`)
- Table with columns: checkbox, name, email, phone, postcode, status badge, AI next-action suggestion, created-at, owner avatar, delete button.
- Filters: search (name/email/phone/postcode), status dropdown (new/contacted/lost).
- Sort: name, created_at, status.
- Bulk actions: assign owner, set status, trash, export CSV.
- Trash view with restore/permanent-delete.

### Lead Detail (`/crm/leads/[id]`)
- Left sidebar (sticky): contact card (avatar, name, status select, AI score), project summary, discovery answers, AI insights panel, smart actions, snooze control.
- Right panel: 9 tabs — Activity, Contact, Opportunities, Bookings, Messages, Invoices, Tasks, Notes, Fitting.
- Compose: inline compose bar in Messages tab + full SendConfirmation modal triggered from smart actions.
- AI: score (hot/warm/cold), suggestion, activity summary — all behind `suggestionsOn` preference.

### Data Model (relevant fields)
- `Lead`: name, email, phone, postcode, project_type, budget_band, source, notes, status (new/contacted/lost), owner_user_id, preferred_channel, snoozed_until, deleted_at, UTM/attribution fields.
- `Opportunity`: stage (23 stages), value_estimate, lost_reason, updated_at.
- `Task`: type, status (open/done), due_at, owner_user_id.
- `MessageLog`: channel, sent_at, status, template.
- `Booking`: type, scheduled_at, outcome.

---

## Requirements

### 1. Leads List — Richer Table Columns

**What**: Add columns for opportunity stage, estimated value, last contact date, and days since last activity.

**Columns to add** (toggleable via a column picker):
- **Stage** — badge showing the primary opportunity's current stage label and colour (from `STAGES` config). Shows "—" if no opportunity.
- **Value** — `£{value_estimate}` from primary opportunity. Shows "—" if unset.
- **Last contact** — most recent `MessageLog.sent_at` for that lead, formatted as relative time (e.g. "3d ago"). Shows "—" if never contacted.
- **Days stale** — integer days since `max(last message sent, opportunity updated_at)`. Colour-coded: green ≤7d, amber 8–21d, red >21d.

**Column picker**: A small columns icon button in the table header bar that opens a popover with checkboxes to show/hide optional columns. State persisted to `localStorage`.

**Acceptance criteria**:
- All new columns sort correctly when clicked.
- Stage badge uses the same colour system as `STAGES` config.
- "Days stale" cell is visually distinct (coloured text).
- Column picker state survives page refresh.
- Name and Status columns are always visible and cannot be hidden.

---

### 2. Leads List — Lead Health Indicator

**What**: A visual "health" dot in the leftmost column giving an at-a-glance signal for each lead.

**Logic** (computed client-side, no AI call):
- **Hot** (green pulse dot): has an open opportunity, last contact ≤7 days, no overdue tasks.
- **Warm** (amber dot): has an open opportunity but last contact 8–21 days, or has 1 overdue task.
- **Cold** (grey dot): no open opportunity, or last contact >21 days, or 2+ overdue tasks.
- **Snoozed** (blue clock icon): `snoozed_until` is in the future — suppress health colour.

**Placement**: Small coloured dot before the checkbox, with a tooltip explaining the status.

**Acceptance criteria**:
- Dot colour matches the three tiers above.
- Snoozed leads show a clock icon instead of a dot.
- Tooltip text is human-readable (e.g. "Cold — last contacted 24 days ago, 2 overdue tasks").
- Health indicator is not shown in the trash view.

---

### 3. Leads List — Advanced Filtering

**What**: Expand the filter bar to support filtering by owner, project type, source, and date range.

**New filters**:
- **Owner** — dropdown of active profiles (admin only).
- **Project type** — dropdown populated from distinct `project_type` values in the loaded leads data.
- **Source** — dropdown populated from distinct `source` values.
- **Date range** — "Created between" with two date inputs (from / to).

**UI**: Filters collapse behind a "Filters" button that shows a badge count of active filters. Clicking opens a filter panel below the search bar. A "Clear all" link resets everything.

**Acceptance criteria**:
- Each filter compounds with others (AND logic).
- Active filter count badge updates correctly.
- Clearing individual filters works independently.
- Non-admin users do not see the owner filter.
- Null `project_type` / `source` values are excluded from dropdown options.

---

### 4. Leads List — Inline Quick Actions

**What**: Hovering a row reveals action buttons so common tasks don't require opening the lead.

**Actions per row** (appear on row hover, right-aligned):
- **Call** — `tel:` link (only if phone exists).
- **Email** — opens the SendConfirmation modal pre-filled with the lead's email.
- **WhatsApp** — opens SendConfirmation modal pre-filled for WhatsApp (only if phone exists).
- **Change status** — a small inline select that updates status without navigating away.

**Acceptance criteria**:
- Actions only appear on hover.
- Call/WhatsApp buttons hidden when lead has no phone; Email button hidden when no email.
- Status change updates optimistically and shows a toast.
- Clicking anywhere else on the row still navigates to the lead detail.

---

### 5. Leads List — Duplicate Detection

**What**: Surface a warning when leads share the same email or phone number.

**UI**:
- A dismissible amber banner at the top of the list: "X potential duplicate leads detected. Review →"
- Clicking "Review" opens a modal listing duplicate groups (grouped by matching email or phone), with a "Merge" button per group that pre-selects those two leads.
- Dismissing stores the dismissed state in `sessionStorage` (reappears on next page load).

**Acceptance criteria**:
- Detection runs client-side on the loaded leads array (no extra API call).
- Groups leads by exact email match OR exact phone match.
- Leads with no email and no phone are excluded.
- Banner does not appear when there are no duplicates.
- Banner does not appear in the trash view.

---

### 6. Leads List — Lead Merge

**What**: Allow merging two leads that represent the same person.

**Flow**:
1. User selects exactly 2 leads via checkboxes → "Merge" button appears in bulk toolbar.
2. Merge modal shows both leads side-by-side.
3. User picks which is "primary" (kept) and which is "secondary" (absorbed).
4. Summary shows: primary contact details kept; secondary's opportunities, tasks, bookings, messages, invoices reassigned to primary.
5. Confirm calls `POST /api/crm/leads/merge` with `{ primaryId, secondaryId }`.
6. Secondary lead is soft-deleted. User redirected to primary lead.

**Acceptance criteria**:
- Merge button only appears when exactly 2 leads are selected.
- User can swap primary/secondary before confirming.
- On success: toast "Leads merged", redirect to primary lead.
- On failure: toast with error, no data changed.
- Merging a soft-deleted lead is blocked with an error message.
- New API route handles reassignment of all related records atomically.

---

### 7. Lead Detail — Tab Consolidation

**What**: Reduce 9 tabs to 6 primary + 2 secondary to lower navigation overhead.

**New tab structure**:
- **Overview** (replaces Activity) — activity timeline + AI summary + open tasks widget (top 3 open tasks with inline checkboxes) + next upcoming booking card.
- **Contact** — unchanged.
- **Pipeline** (renamed from Opportunities) — same content, clearer name.
- **Comms** (replaces Messages) — merges Messages + Bookings. Bookings shown as a collapsible section above the message thread.
- **Money** (replaces Invoices) — merges Invoices + Payments into one view.
- **Tasks** — unchanged.
- **Notes** — moved to More dropdown.
- **Fitting** — moved to More dropdown.

**Acceptance criteria**:
- All existing functionality preserved, just reorganised.
- Default tab on page load is Overview.
- Tab counts update correctly (Comms shows message + booking count combined).
- Sliding underline animation still works.
- Notes and Fitting remain accessible via the More dropdown.

---

### 8. Lead Detail — Structured Call Logging

**What**: A structured form to record call outcomes, replacing ad-hoc note-taking.

**Trigger**: "Log call" button in the contact card quick-actions row (alongside Call / Email / WhatsApp).

**Call log form** (inline panel below quick-actions, not a modal):
- **Outcome**: radio — Reached / No answer / Left voicemail / Wrong number.
- **Duration**: optional number input (minutes).
- **Summary**: textarea (2–3 lines).
- **Next action**: dropdown — Follow up call / Send quote / Schedule visit / Send contract / No action needed.
- **Next action due**: date picker (defaults to tomorrow).
- **Auto-create task**: checkbox (checked by default).

**On submit**:
- Appends a structured entry to `lead.notes` formatted as `Call [date]: [outcome] — [summary]`.
- If auto-create task is checked, creates a Task via `useCreateTask`.
- Activity timeline reflects the new note entry.
- Success toast shown.

**Acceptance criteria**:
- Form is inline, not a modal.
- Submitting with no outcome selected shows a validation error.
- Task is only created if the checkbox is checked.
- "Log call" button is hidden if the lead has no phone number.
- Call log entry appears in the Overview timeline immediately after submission.

---

### 9. Lead Detail — Opportunity Stage Progress Bar

**What**: Visual pipeline progress indicator on the Pipeline tab.

**Design**:
- A row of stage group labels (New → Meet 1 → Design → Visit → Deposit → Fitting → Close) with the current group highlighted.
- A filled progress bar below, percentage based on `STAGE_ORDER` index position.
- Current stage name shown as a label below the bar.
- Stages with automations show a lightning bolt icon on hover with a tooltip from `STAGES[stage].description`.

**Acceptance criteria**:
- Progress bar fills proportionally based on position in `STAGE_ORDER`.
- Lost/closed stages show the bar in red.
- On-hold shows the bar in grey.
- If no opportunity exists, progress bar is not rendered.
- Multiple opportunities each get their own progress bar.

---

### 10. Lead Detail — Expanded Contact Fields

**What**: Add Address, Preferred call time, and Relationship notes to the Contact tab.

**New fields**:
- **Address** — free-text field. Stored as note chip `Address: ...`.
- **Preferred call time** — dropdown: Morning (9–12) / Afternoon (12–5) / Evening (5–8) / Any. Stored as note chip `Call time: ...`.
- **Relationship notes** — textarea for internal context. Stored as note chip `Relationship: ...`.

**Acceptance criteria**:
- All three fields use the existing `InlineField` edit pattern.
- Values round-trip correctly through `parseLeadNotes`.
- Existing note chips are not disturbed when saving a new field.
- Saving an empty value removes the chip entirely (not saves as `Field: `).
- Fields show "Click to add" placeholder when empty.

---

### 11. Lead Detail — Quick-Reply Templates in Comms Tab

**What**: A template picker above the compose bar so users can start from a pre-written message.

**UI**:
- A "Templates" button above the compose bar opens a small popover listing `MessageTemplate` records.
- Clicking a template pre-fills the compose bar's subject and body.
- Templates are filtered by the currently selected channel.

**Acceptance criteria**:
- Template list fetched from existing `message_templates` table via existing hooks.
- Only templates matching the selected channel are shown.
- Selecting a template does not auto-send — user must click Send.
- If no templates exist for the channel, popover shows "No templates for this channel."

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Lead has no opportunities | Stage column shows "—"; Pipeline tab shows empty state with "New opportunity" CTA; progress bar not rendered. |
| Lead has multiple opportunities | Stage column and progress bar use the most recently updated non-closed opportunity. All listed in Pipeline tab. |
| Duplicate detection: lead has no email AND no phone | Excluded from duplicate groups entirely. |
| Merge: one lead has active opportunities, the other doesn't | All opportunities from secondary reassigned to primary. No data lost. |
| Merge: secondary lead is already soft-deleted | Merge blocked — show error "Cannot merge a deleted lead." |
| Merge: 3+ leads selected | Merge button does not appear; only standard bulk actions shown. |
| Call log: lead has no phone | "Log call" button not shown — impossible state. |
| Note chip: `Address` chip already exists | Saving overwrites the existing chip value, does not append. |
| Preferred call time: user clears the field | Chip removed from notes entirely. |
| Column picker: user hides all optional columns | Name and Status always remain visible. |
| Stale indicator: lead just created, never contacted | Days stale counts from `created_at`. |
| Template picker: `message_templates` table is empty | Popover shows "No templates available. Create templates in Settings." |
| Health indicator: snoozed lead | Clock icon shown; health tier not computed. |
| Filter: project_type or source has null values | Null values excluded from dropdown options. |
| Progress bar: opportunity is `on_hold` | Bar rendered in grey; group label "On Hold" highlighted. |
| Progress bar: opportunity is `lost` or `closed_not_interested` | Bar rendered in red at 100% fill. |
| Comms tab: lead has bookings but no messages | Bookings section shown, message thread shows empty state. |
| Overview tab: no open tasks | Open tasks widget shows "No open tasks" with a "Add task" CTA. |
| Overview tab: no upcoming bookings | Next booking card shows "No upcoming bookings" with a "Book a call" CTA. |

---

## Implementation Order

1. **Leads list — richer columns** (Stage, Value, Last contact, Days stale) — highest daily impact, no new DB needed.
2. **Lead health indicator** — client-side logic, fast to ship.
3. **Leads list — advanced filtering** — unblocks finding specific leads quickly.
4. **Leads list — inline quick actions** — reduces navigation overhead.
5. **Lead detail — tab consolidation** (Overview, Comms, Money, Pipeline rename) — structural change that unblocks items below.
6. **Lead detail — opportunity stage progress bar** — visual clarity on pipeline position.
7. **Lead detail — structured call logging** — captures call outcomes currently lost.
8. **Lead detail — expanded contact fields** (Address, Call time, Relationship notes) — uses existing note chip pattern.
9. **Lead detail — quick-reply templates** — leverages existing template data.
10. **Leads list — duplicate detection** — client-side, no API needed.
11. **Leads list — lead merge** — requires new API route; most complex item, ship last.

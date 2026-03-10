# Spec: Lead Detail Page — Full CRM Improvements

## Problem Statement

The lead detail page is functional but incomplete as a standalone CRM tool. A rep currently has to leave the page to: change pipeline stage, create tasks, compose messages, or write structured notes. Notes are a single unstructured blob. The Opportunities tab is read-only. This spec makes the lead detail page a fully self-contained CRM workspace.

---

## Requirements

### 1. Lead Status Dropdown on Contact Card

**Current:** Status badge is display-only.

**New:** Click the status badge → dropdown appears with all valid `LeadStatus` values (`new`, `contacted`, `qualified`, `proposal_sent`, `won`, `lost`, `on_hold`). Selecting one calls `useUpdateLead` immediately. No confirmation needed — status is a lightweight field.

---

### 2. Structured Notes System (replaces single notes blob)

**New `lead_notes` table** (migration required):
```sql
CREATE TABLE lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('general','call','design','site_visit','objections')),
  body text NOT NULL,
  author_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**UI — new "Notes" tab** (replaces the current notes display in the Contact tab):
- Five section tabs: General · Call Notes · Design Notes · Site Visit · Objections
- Each section has:
  - **Editable block** at the top: a textarea pre-filled with the most recent note body for that section. Auto-saves on blur (debounced 800ms). Shows "Saved" / "Saving…" indicator.
  - **Append log** below: chronological list of all previous entries for that section, each showing author avatar, timestamp, and body text. Read-only.
  - **"Add entry" button**: saves the current textarea content as a new timestamped log entry (does NOT overwrite previous entries — appends a new row).

**Migration of existing `lead.notes`:** On first load, if `lead.notes` is non-empty and no `lead_notes` rows exist for this lead, pre-populate the editable block of the "General" section with the existing notes content (client-side only — do not auto-migrate in the DB).

**API routes needed:**
- `GET /api/crm/leads/[id]/notes` — returns all `lead_notes` rows for the lead
- `POST /api/crm/leads/[id]/notes` — creates a new note entry `{ section, body }`
- `PATCH /api/crm/leads/[id]/notes/[noteId]` — updates body of an existing note

**Hook:** `useLeadNotes(leadId)`, `useAddLeadNote()`, `useUpdateLeadNote()`

---

### 3. Tasks Tab — Create Task

**New:** "Add task" button at the top of the Tasks tab opens an inline form (not a modal) with:
- **Type** — free-text input or select from common types: `call_back`, `send_quote`, `follow_up`, `site_visit`, `send_contract`, `other`
- **Description** — optional textarea
- **Due date** — date picker (defaults to tomorrow)
- **Assignee** — dropdown of active profiles (defaults to current user)
- **Link to** — radio: "Primary opportunity" | "Lead only" (if "Lead only", `opportunity_id` is null and a new `lead_id` column is needed — see migration below)

**Migration:** Add `lead_id uuid REFERENCES leads(id)` to `tasks` table.

**Hook:** `useCreateTask()` — inserts into `tasks` table.

**After save:** form collapses, task appears at top of list, toast "Task created".

---

### 4. Opportunities Tab — Full Card

**Current:** Stage badge + value + updated timestamp. Read-only.

**New — per opportunity card:**

**a) Stage change dropdown**
- Click the `StatusBadge` → dropdown of all pipeline stages
- On select: show a confirmation dialog inline: "Change stage to [X]? This will trigger automations (emails, tasks). Confirm / Skip automations / Cancel"
  - **Confirm** → calls existing `useUpdateOpportunityStage` (or equivalent) with automations
  - **Skip automations** → direct Supabase update, no automation trigger
  - **Cancel** → no change

**b) Value estimate inline edit**
- Click the value → input field, blur/Enter saves via `useUpdateOpportunity`

**c) Lost reason**
- If stage is `lost`: show a text input for `lost_reason`, saves on blur

**d) Create new opportunity button**
- "＋ New opportunity" button at bottom of tab
- Inserts a new opportunity row linked to this lead with stage `new_lead`, no value
- Uses `useCreateOpportunity` hook (new)

---

### 5. Messages Tab — Inline Compose Bar

**New:** Persistent compose bar pinned to the bottom of the Messages tab (always visible, not a modal).

Layout:
```
[Channel selector ▾] [Subject (email only)] [Message textarea] [Send ▶]
```

- **Channel selector**: Email / WhatsApp / SMS — defaults to lead's `preferred_channel` or Email
- **Subject**: only shown when channel = Email
- **Message textarea**: 3 rows, expands on focus
- **Send button**: calls existing `/api/crm/messages/send` endpoint
- On send: clears the bar, appends the new message to the unified timeline above, shows toast

The existing "Email" and "WhatsApp" quick-action buttons on the contact card remain (they pre-fill the compose modal for longer messages). The inline bar is for quick replies.

---

## Acceptance Criteria

- [ ] Lead status badge is a clickable dropdown; selecting a value saves immediately
- [ ] Notes tab exists with 5 sections (General, Call, Design, Site Visit, Objections)
- [ ] Each section has an editable block (auto-saves on blur) + append log
- [ ] "Add entry" button saves current block content as a new timestamped log row
- [ ] Existing `lead.notes` content pre-populates General section on first load if no DB notes exist
- [ ] Tasks tab has an inline "Add task" form with type, description, due date, assignee, link-to
- [ ] New tasks appear immediately in the list after creation
- [ ] Opportunities tab shows stage dropdown with automation confirmation dialog
- [ ] Value estimate is inline-editable on the opportunity card
- [ ] Lost reason field appears when stage = lost
- [ ] "New opportunity" button creates a linked opportunity
- [ ] Messages tab has a persistent inline compose bar with channel selector
- [ ] Inline compose bar defaults to lead's preferred channel
- [ ] Two new migrations: `lead_notes` table, `lead_id` column on `tasks`

---

## Implementation Steps

1. **Migration `027_lead_notes_and_task_lead.sql`** — create `lead_notes` table with RLS; add `lead_id` column to `tasks`.

2. **API routes for lead notes** — `GET/POST /api/crm/leads/[id]/notes` and `PATCH /api/crm/leads/[id]/notes/[noteId]`.

3. **Hooks** — `useLeadNotes(leadId)`, `useAddLeadNote()`, `useUpdateLeadNote()`, `useCreateTask()`, `useCreateOpportunity()` in `hooks.ts`.

4. **`LeadNotesTab` component** — section tabs, editable block with auto-save, append log, "Add entry" button. Pre-fills General from `lead.notes` if no DB rows.

5. **Lead status dropdown** — replace status badge in contact hero with a `<select>` or custom dropdown that calls `useUpdateLead`.

6. **Tasks tab** — add "Add task" inline form above the task list. Wire `useCreateTask`.

7. **Opportunities tab** — replace read-only card with full card: stage dropdown + confirmation dialog, value inline edit, lost reason field, "New opportunity" button.

8. **Messages tab inline compose bar** — add persistent bar at bottom of `MessagesTab`. Channel selector, subject (email), textarea, send button. Wire to `/api/crm/messages/send`.

9. **Add "Notes" tab** to the tabs array in `LeadDetailPage` (between Tasks and Fitting, or after Contact).

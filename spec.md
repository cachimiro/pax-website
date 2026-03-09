# Spec: Multi-User CRM with Per-Designer Calendars & Role-Based Access

## Problem Statement

The CRM currently operates as a single-user system: one shared Google account, no user isolation, no way for an admin to invite team members, and no per-designer calendar availability on the public booking form. This spec covers the full implementation of a multi-user system where:

- Admins can invite designers (sales users), assign roles, and see everything
- Each designer connects their own Google Calendar on signup
- The public booking form shows availability merged across all active designers' calendars, then reveals who the customer will meet
- Every CRM view is scoped by role: non-admins see only their own data
- The admin pipeline view is colour-coded by designer + stage badge

---

## Requirements

### 1. Database changes

**`profiles` table additions:**
- `color` text — hex colour assigned to each user (admin picks or auto-assigned from a palette), used for colour coding across the CRM
- `google_access_token_encrypted` text — per-user encrypted OAuth access token
- `google_refresh_token_encrypted` text — per-user encrypted OAuth refresh token
- `google_token_expires_at` timestamptz
- `google_email` text — the Gmail address connected
- `google_calendar_connected` boolean DEFAULT false
- `invited_by` uuid REFERENCES profiles(id) — who invited this user
- `onboarding_complete` boolean DEFAULT false — false until Google is connected post-invite

**RLS changes:**
- `leads`, `opportunities`, `bookings`, `tasks`, `meet1_notes`: non-admin users can only SELECT/UPDATE rows where `owner_user_id = auth.uid()`
- Admin retains full access to all rows

**New migration:** `025_multi_user.sql`

---

### 2. Admin: User Management (Settings page)

**Location:** `/crm/settings` → new "Team" tab (already gated to admin only via `getNavItems`)

**Features:**
- List all profiles: name, email, role, colour swatch, Google connected status, active toggle
- **Invite user:** admin enters email + selects role (sales / operations / admin) → calls `POST /api/crm/admin/invite` → Supabase `admin.inviteUserByEmail()` → creates a pending profile row with `onboarding_complete: false`
- **Edit user:** change role, change colour, toggle active
- **Remove user:** soft-delete (set `active: false`), revoke their Google tokens
- Colour palette: 8 pre-defined distinct colours auto-assigned on invite (cycling), admin can override
- Only admin can see this tab — enforced both in nav (`getNavItems`) and server-side in the API route

---

### 3. Designer Onboarding Flow (post-invite)

When a new user clicks the Supabase invite link:
1. They land on `/crm/login` — Supabase handles password set via the invite token
2. After first login, middleware detects `onboarding_complete: false` → redirects to `/crm/onboarding`
3. `/crm/onboarding` page:
   - Step 1: Confirm name, phone
   - Step 2: Connect Google — OAuth button → `/api/crm/google/callback` stores tokens **on their own profile row** (not the shared `google_config` table)
   - Step 3: Confirmation → sets `onboarding_complete: true` → redirects to `/crm`
4. Until onboarding is complete, all `/crm/*` routes (except `/crm/onboarding`) redirect back to onboarding

**Google OAuth change:** The existing `google_config` single-row table is kept for the admin's shared Gmail/email integration. Per-user calendar tokens are stored on `profiles` instead. The `getCalendarClient` function gets a new variant `getCalendarClientForUser(userId)` that reads from `profiles`.

---

### 4. Public Booking Form — Designer Selection & Availability

**UX decision (best experience):** Availability-first with designer reveal.

**Flow:**
1. Customer picks date → system queries merged free/busy across ALL active designers' calendars
2. Available slots shown are those where **at least one designer is free**
3. Customer picks a time slot → system resolves which designer(s) are free at that exact slot
4. If multiple designers are free: auto-assign using existing round-robin logic (`assignOwner`)
5. Confirmation screen shows: "Your call is with **[Designer Name]**" + their photo/avatar initial

**API changes:**
- `GET /api/crm/calendar/freebusy` — updated to query ALL active designers' per-user Google calendars and merge busy intervals (union of all busy = unavailable; slot available if any designer is free)
- `POST /api/booking` — after slot selection, resolves the assigned designer before creating the booking; stores `owner_user_id` on lead + opportunity as the assigned designer

**CalendarScreen changes:**
- No UI change to slot selection (availability-first is already the UX)
- ConfirmationScreen: add "Your designer: [Name]" field, populated from booking API response

---

### 5. CRM Role-Based Data Scoping

**Non-admin users (sales/operations) see only their own data everywhere:**

| View | Current | After |
|---|---|---|
| Pipeline | All opportunities | `owner_user_id = me` only |
| Leads list | All leads | `owner_user_id = me` only |
| Calendar | All bookings | Bookings on their opportunities only |
| Tasks | All tasks | `owner_user_id = me` only |
| Reports | All data | Their data only |
| Settings | Hidden | Hidden (unchanged) |

**Implementation:** The `CrmShell` passes `profile` down. Each page/hook that fetches data adds `owner_user_id: profile.id` to the filter when `profile.role !== 'admin'`. The existing `useOpportunities`, `useLeads`, `useTasks` hooks already accept `owner_user_id` filter — they just need to be called with it.

A new `useCurrentProfile()` hook (or context) makes the profile available to all CRM pages without prop-drilling.

---

### 6. Admin Pipeline — Colour Coding by Designer

**Admin pipeline view additions:**
- Each `OpportunityCard` shows a coloured left border + small avatar/initial badge using the assigned designer's `color` from their profile
- A **filter bar** above the pipeline board: "All designers" dropdown + individual designer chips (colour-matched)
- Filtering by designer filters the `useOpportunities` call with `owner_user_id`
- Stage badge keeps its existing colour (unchanged)
- Colour coding propagates to: Pipeline, Leads list (row left border), Calendar event dots, Reports charts

---

### 7. Middleware Updates

Current middleware only checks auth session. Add:
- If authenticated + `onboarding_complete = false` + path is not `/crm/onboarding` → redirect to `/crm/onboarding`
- If authenticated + `role !== 'admin'` + path starts with `/crm/settings` → redirect to `/crm`

---

## Acceptance Criteria

- [ ] Admin can invite a user by email from `/crm/settings` → Team tab
- [ ] Invited user receives Supabase email, sets password, lands on onboarding
- [ ] Onboarding connects their personal Google Calendar; tokens stored on their profile
- [ ] Non-admin user logs in and sees only their own leads, pipeline, calendar, tasks
- [ ] Non-admin cannot access `/crm/settings` (redirected by middleware)
- [ ] Public booking form shows slots where at least one designer is free (merged calendars)
- [ ] Confirmation screen shows the assigned designer's name
- [ ] Admin pipeline shows colour-coded cards by designer with filter chips
- [ ] Admin can filter pipeline by individual designer
- [ ] Designer colour propagates to leads list, calendar, reports

---

## Implementation Order

1. **Migration `025_multi_user.sql`** — add columns to `profiles`, update RLS policies for data scoping
2. **`getCalendarClientForUser(userId)`** — per-user calendar client reading from `profiles`
3. **`GET /api/crm/calendar/freebusy`** — merge all active designers' calendars
4. **`POST /api/crm/admin/invite`** — Supabase invite + profile creation
5. **`POST /api/crm/admin/users/[id]`** — update role, colour, active status
6. **Middleware** — onboarding redirect + settings guard
7. **`/crm/onboarding` page** — 3-step onboarding (name → Google → done)
8. **Settings → Team tab** — user list, invite form, edit/remove
9. **`useCurrentProfile` context** — make profile available CRM-wide without prop-drilling
10. **Data scoping** — pass `owner_user_id` filter to all hooks when `role !== 'admin'`
11. **`OpportunityCard` + `PipelineBoard`** — designer colour border + filter bar
12. **Colour propagation** — leads list, calendar dots, reports
13. **`ConfirmationScreen`** — show assigned designer name after booking
14. **End-to-end test** — invite flow, booking flow, scoping verification

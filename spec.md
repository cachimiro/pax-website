# Fitter Portal & Admin Integration — Improvement Spec

## Problem Statement

The fitter portal and CRM fittings page work in isolation. Fitters miss offers, arrive on site with incomplete job packs, and the sign-off flow is unreliable. Admin has no real-time visibility into job progress, cannot review photos before approving, and cannot see which fitters are available on a given date. Offer routing is manual — if a fitter declines or ignores an offer, nothing happens automatically.

---

## Current State

**Fitter portal:** dashboard (plain list), board (claim jobs), job detail (checklist/photos/sign-off), availability, messages (N+1 API calls).

**CRM fittings page:** tabs for Unassigned / Offered / Active / Board / Completed. Can assign fitters and open FittingDetailPanel.

**Key gaps:** no real-time offer notifications, no earnings dashboard, no map link, N+1 messages fetching, admin can't see fitter availability when assigning, no photo review before approval, no auto-offer routing, offer expiry not enforced by background job, subcontractor_id NOT NULL breaks open-board state.

---

## Requirements

### 1. Fitter Dashboard Redesign
- Card-based layout replacing plain list:
  - Today's job card (address, time, quick-action button)
  - Pending offers with inline accept/decline + expiry countdown
  - Upcoming jobs (next 7 days)
  - Earnings strip (current month / last month / all-time)
- Bottom nav unread message badge via Supabase Realtime
- Realtime subscription on fitting_jobs for live offer/status updates

### 2. Fitter Job Detail Improvements
- Google Maps deep-link from customer_address
- Full job pack inline: scope of work, access notes, parking, IKEA ref, special instructions, design documents
- Fitting fee + estimated duration at top
- Offer expiry countdown when status = offered
- "I'm on my way" button — new en_route status between accepted and in_progress
- Photo thumbnails + upload progress + minimum count warning (5 before, 5 after)
- Checklist: warn (not hard-block) if required items unchecked before status progression

### 3. Fitter Earnings Page (/fitter/earnings)
- Monthly bar chart (last 6 months)
- Per-job table: job code, customer, date, fee, status
- Totals: current month, last month, all-time
- Source: fitting_jobs where subcontractor_id = me, status IN (completed, signed_off, approved), fitting_fee IS NOT NULL

### 4. Messages Fix
- New GET /api/fitter/messages/summary — single query, all jobs with unread count + last message
- Replace N+1 fetching in messages page
- Realtime on fitting_messages for live unread badge

### 5. Auto-Offer Routing Cron
GET /api/cron/fitter-offer-expiry (every 15 min, added to vercel.json):
1. Find fitting_jobs where status = offered and offer_expires_at < now()
2. Mark offer record as expired in fitting_job_offers
3. Find next eligible fitter: available_for_jobs = true, available on job date per fitter_availability, no blocked date, not already offered this job, max_jobs_per_day not exceeded
4. If eligible: new offer (status = offered, offer_expires_at = now() + 24h), email fitter
5. If none: status = open_board, open_board_at = now(), notify admin, create urgent CRM task
6. Update decline_rate on subcontractor

### 6. CRM Fittings — Admin Improvements

Availability overlay on assign:
- Show which fitters are available (green) vs unavailable (grey) on the job's scheduled date
- Show each fitter's job count vs max_jobs_per_day for that date

Inline photo/checklist review in FittingDetailPanel:
- New Photos tab: before/after photo grid
- Checklist completion % for before and after
- Approve button gated: checklist_after >= 80% complete AND >= 5 after photos

Fitter performance stats:
- Per-fitter: total jobs, decline rate, avg days assigned→completed, last active
- Shown in Fittings sidebar or Settings

Real-time status updates:
- Supabase Realtime on fitting_jobs in fittings page
- Live badge updates + toast on completed / signed_off

Availability tab (new tab on Fittings page):
- Week-view grid: fitters as rows, days as columns
- Green = available, grey = blocked, number = jobs booked
- Click cell → assign modal pre-filled

### 7. DB Migration (030)

ALTER TABLE fitting_jobs DROP CONSTRAINT fitting_jobs_status_check;
ALTER TABLE fitting_jobs ADD CONSTRAINT fitting_jobs_status_check
  CHECK (status IN ('offered','assigned','accepted','en_route','declined','open_board',
                    'claimed','in_progress','completed','signed_off','approved','rejected','cancelled'));

ALTER TABLE fitting_jobs ALTER COLUMN subcontractor_id DROP NOT NULL;

CREATE OR REPLACE VIEW fitter_earnings AS
  SELECT subcontractor_id, DATE_TRUNC('month', completed_at) AS month,
         COUNT(*) AS jobs_completed, SUM(fitting_fee) AS total_earned
  FROM fitting_jobs
  WHERE status IN ('completed','signed_off','approved')
    AND fitting_fee IS NOT NULL AND completed_at IS NOT NULL
  GROUP BY subcontractor_id, DATE_TRUNC('month', completed_at);

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Two fitters claim same board job simultaneously | Server checks status = open_board before claiming; second gets 409 |
| Offer expires while fitter is mid-response | offer_expires_at checked server-side (already done) |
| Job date changes after offer sent | Notify fitter via message; admin must re-confirm |
| Sign-off submitted with < 5 photos | Warn but allow; admin can reject |
| Approve job with no fitting_fee | Warning in approval modal |
| Fitter suspended mid-job | Can complete current job, cannot claim new ones |
| Remote sign-off link expired | Expired page with "Request new link" button |
| No eligible fitters for auto-offer | Post to open board + urgent CRM task |
| Google Calendar disconnected | Skip sync, show badge on job detail |
| Fitter starts checklist while en_route | Auto-transition to in_progress |
| subcontractor_id null on open_board job | Fitter queries already filter by subcontractor_id = me; board jobs fetched separately |

---

## Implementation Order

1. Migration 030 — en_route status, nullable subcontractor_id, fitter_earnings view
2. /api/fitter/messages/summary — aggregated messages endpoint
3. Fitter dashboard redesign — today's job, offer cards, earnings strip, Realtime
4. Fitter job detail — map link, full job pack, en_route button, expiry countdown, photo thumbnails
5. /fitter/earnings page — chart + table
6. /api/cron/fitter-offer-expiry — auto-routing + vercel.json entry
7. CRM fittings — availability overlay on assign modal
8. CRM fittings — photo/checklist review in FittingDetailPanel
9. CRM fittings — Realtime updates (live badges + toasts)
10. CRM fittings — Availability tab (week-view grid)
11. Fitter performance stats panel
12. TypeScript check + commit + push

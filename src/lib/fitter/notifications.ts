import { sendEmail } from '@/lib/crm/messaging/channels'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://paxbespoke.co.uk'

function wrap(content: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="border-bottom: 2px solid #16a34a; padding-bottom: 12px; margin-bottom: 20px;">
        <strong style="color: #1a1a1a; font-size: 18px;">PaxBespoke</strong>
      </div>
      ${content}
      <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e5e5; color: #999; font-size: 12px;">
        PaxBespoke Fitting Management
      </div>
    </div>
  `
}

/** Notify fitter when a job is assigned to them */
export async function notifyFitterJobAssigned(
  fitterEmail: string,
  jobCode: string,
  customerName: string,
  scheduledDate: string | null,
) {
  const dateStr = scheduledDate
    ? new Date(scheduledDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : 'TBC'

  await sendEmail(
    fitterEmail,
    `New Job Assigned: ${jobCode}`,
    wrap(`
      <h2 style="color: #1a1a1a; margin: 0;">New Job Assigned</h2>
      <p>You have been assigned a new fitting job:</p>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Job:</strong> ${jobCode}</p>
        <p style="margin: 4px 0;"><strong>Customer:</strong> ${customerName}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${dateStr}</p>
      </div>
      <p>
        <a href="${BASE_URL}/fitter" style="background: #16a34a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          View Job Details
        </a>
      </p>
    `)
  )
}

/** Notify office when a fitter completes a job */
export async function notifyOfficeJobCompleted(
  jobCode: string,
  fitterName: string,
  customerName: string,
) {
  // Send to a configured office email or skip
  const officeEmail = process.env.OFFICE_NOTIFICATION_EMAIL
  if (!officeEmail) return

  await sendEmail(
    officeEmail,
    `Fitting Completed: ${jobCode}`,
    wrap(`
      <h2 style="color: #1a1a1a; margin: 0;">Fitting Completed</h2>
      <p>${fitterName} has completed the fitting for ${customerName} (${jobCode}).</p>
      <p>The job is now awaiting sign-off.</p>
      <p>
        <a href="${BASE_URL}/crm/fittings" style="background: #16a34a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          View in CRM
        </a>
      </p>
    `)
  )
}

/** Notify office when a job is signed off */
export async function notifyOfficeJobSignedOff(
  jobCode: string,
  customerName: string,
  signerName: string,
  method: string,
) {
  const officeEmail = process.env.OFFICE_NOTIFICATION_EMAIL
  if (!officeEmail) return

  await sendEmail(
    officeEmail,
    `Sign-Off Received: ${jobCode}`,
    wrap(`
      <h2 style="color: #1a1a1a; margin: 0;">Sign-Off Received</h2>
      <p>The fitting for ${customerName} (${jobCode}) has been signed off.</p>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Signed by:</strong> ${signerName}</p>
        <p style="margin: 4px 0;"><strong>Method:</strong> ${method === 'in_person' ? 'In Person' : 'Remote Link'}</p>
      </div>
      <p>Please review and approve/reject the job.</p>
      <p>
        <a href="${BASE_URL}/crm/fittings" style="background: #16a34a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Review Job
        </a>
      </p>
    `)
  )
}

/** Notify fitter when their job is rejected */
export async function notifyFitterJobRejected(
  fitterEmail: string,
  jobCode: string,
  reason: string | null,
) {
  await sendEmail(
    fitterEmail,
    `Job Rejected: ${jobCode}`,
    wrap(`
      <h2 style="color: #dc2626; margin: 0;">Job Rejected</h2>
      <p>Your fitting job ${jobCode} has been rejected by the office.</p>
      ${reason ? `<div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 16px 0; color: #991b1b;"><strong>Reason:</strong> ${reason}</div>` : ''}
      <p>Please contact the office for next steps.</p>
      <p>
        <a href="${BASE_URL}/fitter" style="background: #16a34a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          View Job
        </a>
      </p>
    `)
  )
}

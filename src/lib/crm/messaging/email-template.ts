/**
 * Branded HTML email template for PaxBespoke CRM.
 * Table-based layout with inline CSS for maximum email client compatibility.
 * Generates multipart-ready HTML + plain text.
 */

interface EmailTemplateOptions {
  body: string
  senderName: string
  senderRole?: string
  senderPhone?: string
  senderEmail?: string
  ctaText?: string
  ctaUrl?: string
  preheader?: string
  tracking?: {
    messageLogId: string
    leadId: string
    baseUrl: string // e.g. "https://paxbespoke.uk"
  }
}

const BRAND = {
  orange: '#E8872B',
  orangeLight: '#FFF7F0',
  green: '#0E7A59',
  greenLight: '#F0FAF6',
  greenDark: '#0C6B4E',
  warm900: '#1A1917',
  warm700: '#3D3B37',
  warm500: '#6B6860',
  warm300: '#A8A49E',
  warm100: '#E8E5E0',
  warmWhite: '#FAFAF8',
  white: '#FFFFFF',
  logoUrl: 'https://smrzqxrfluzuhlynmsky.supabase.co/storage/v1/object/public/brand/logo-full.png',
  siteUrl: 'https://paxbespoke.uk',
}

/**
 * Wrap a message body in the branded HTML email template.
 */
export function buildBrandedEmail(options: EmailTemplateOptions): { html: string; text: string } {
  const {
    body,
    senderName,
    senderRole,
    senderPhone,
    senderEmail,
    ctaText,
    ctaUrl,
    preheader,
    tracking,
  } = options

  // Convert plain text body to HTML paragraphs
  const bodyHtml = body
    .split('\n\n')
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p style="margin:0 0 16px 0;line-height:1.7;color:${BRAND.warm700};font-size:15px;">${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('')

  // Replace unresolved placeholders with styled spans
  const styledBody = bodyHtml.replace(
    /\{\{(\w+)\}\}/g,
    `<span style="background:${BRAND.greenLight};padding:2px 6px;border-radius:4px;color:${BRAND.green};font-weight:600;">[$1]</span>`
  )

  // Wrap a URL with click tracking if tracking is enabled
  const trackUrl = (url: string) => {
    if (!tracking) return escapeHtml(url)
    return escapeHtml(
      `${tracking.baseUrl}/api/track/click?mid=${tracking.messageLogId}&lid=${tracking.leadId}&url=${encodeURIComponent(url)}`
    )
  }

  const ctaBlock = ctaText && ctaUrl ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px 0;">
      <tr>
        <td style="background:${BRAND.orange};border-radius:10px;">
          <a href="${trackUrl(ctaUrl)}" target="_blank" style="display:inline-block;padding:14px 32px;color:${BRAND.white};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">
            ${escapeHtml(ctaText)}
          </a>
        </td>
      </tr>
    </table>` : ''

  const signatureLines: string[] = []
  signatureLines.push(`<strong style="color:${BRAND.warm900};font-size:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${escapeHtml(senderName)}</strong>`)
  if (senderRole) signatureLines.push(`<span style="color:${BRAND.warm500};font-size:13px;">${escapeHtml(senderRole)} &middot; PaxBespoke</span>`)
  if (senderPhone) signatureLines.push(`<span style="color:${BRAND.warm500};font-size:13px;">${escapeHtml(senderPhone)}</span>`)
  if (senderEmail) signatureLines.push(`<a href="mailto:${escapeHtml(senderEmail)}" style="color:${BRAND.green};font-size:13px;text-decoration:none;">${escapeHtml(senderEmail)}</a>`)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>PaxBespoke</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:${BRAND.warmWhite};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>` : ''}
  <!--[if mso]><style>table,td{font-family:Arial,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${BRAND.warmWhite};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.warmWhite};">
    <tr>
      <td align="center" style="padding:0;">

        <!-- Top accent bar -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(135deg,${BRAND.green},${BRAND.greenDark});">
          <tr>
            <td style="height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">

          <!-- Header with logo -->
          <tr>
            <td style="padding:28px 28px 0 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <a href="${BRAND.siteUrl}" target="_blank" style="text-decoration:none;">
                      <img src="${BRAND.logoUrl}" alt="PaxBespoke" width="160" style="display:block;border:0;outline:none;height:auto;max-width:160px;" />
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td style="padding:24px 28px 0 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.white};border-radius:16px;border:1px solid ${BRAND.warm100};">
                <tr>
                  <td style="padding:32px 28px;">
                    ${styledBody}
                    ${ctaBlock}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td style="padding:24px 28px 0 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-left:3px solid ${BRAND.orange};padding-left:14px;">
                    ${signatureLines.map((line) => `<div style="margin-bottom:3px;">${line}</div>`).join('')}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:28px 28px 0 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="border-top:1px solid ${BRAND.warm100};height:1px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 28px 32px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0 0 4px 0;font-size:12px;color:${BRAND.warm300};line-height:1.5;">
                      <strong style="color:${BRAND.warm500};">PaxBespoke</strong> &middot; Custom Wardrobes
                    </p>
                    <p style="margin:0;font-size:12px;color:${BRAND.warm300};line-height:1.5;">
                      <a href="${BRAND.siteUrl}" style="color:${BRAND.warm300};text-decoration:underline;">${BRAND.siteUrl.replace('https://', '')}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
  ${tracking ? `<img src="${escapeHtml(tracking.baseUrl)}/api/track/open?mid=${tracking.messageLogId}&amp;lid=${tracking.leadId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />` : ''}
</body>
</html>`

  // Plain text fallback
  const text = [
    body,
    ctaText && ctaUrl ? `\n${ctaText}: ${ctaUrl}` : '',
    '\n---',
    senderName,
    senderRole ? `${senderRole} · PaxBespoke` : 'PaxBespoke',
    senderPhone ?? '',
    senderEmail ?? '',
    '',
    'PaxBespoke · Custom Wardrobes',
    BRAND.siteUrl,
  ].filter(Boolean).join('\n')

  return { html, text }
}

/**
 * Build a MIME message for Gmail API (RFC 2822 format, base64url encoded).
 * Uses base64 transfer encoding for HTML to avoid quoted-printable corruption.
 */
export function buildMimeMessage(options: {
  from: string
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}): string {
  const boundary = `paxbespoke_${Date.now()}_${Math.random().toString(36).slice(2)}`

  // Encode subject for UTF-8 support (RFC 2047)
  const encodedSubject = `=?UTF-8?B?${Buffer.from(options.subject).toString('base64')}?=`

  const textBase64 = Buffer.from(options.text, 'utf-8').toString('base64')
  const htmlBase64 = Buffer.from(options.html, 'utf-8').toString('base64')

  // Break base64 into 76-char lines per RFC 2045
  const wrapBase64 = (b64: string) => b64.match(/.{1,76}/g)?.join('\r\n') ?? b64

  const headers = [
    `From: ${options.from}`,
    `To: ${options.to}`,
    `Subject: ${encodedSubject}`,
    options.replyTo ? `Reply-To: ${options.replyTo}` : '',
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
  ].filter(Boolean).join('\r\n')

  const mime = [
    headers,
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(textBase64),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(htmlBase64),
    '',
    `--${boundary}--`,
  ].join('\r\n')

  // Gmail API requires base64url encoding of the entire MIME message
  return Buffer.from(mime)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

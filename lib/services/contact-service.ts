/**
 * Contact form domain logic, extracted from the HTTP adapter.
 * Validation and email composition live here — pure, unit-testable —
 * so the route stays a thin transport layer (same shape as /api/upload).
 */

export interface ContactFormData {
  name: string
  email: string
  topic: string
  message: string
}

export interface ContactEmail {
  subject: string
  html: string
  text: string
  replyTo: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Validate the raw request body.
 * Returns the typed data, or the French error message to send back.
 */
export function validateContactData(
  body: Partial<ContactFormData> | null | undefined
): { data: ContactFormData; error?: never } | { data?: never; error: string } {
  if (!body || !body.name || !body.email || !body.message) {
    return { error: "Nom, email et message sont requis." }
  }
  if (!EMAIL_PATTERN.test(body.email)) {
    return { error: "Format d'email invalide" }
  }
  return {
    data: {
      name: body.name,
      email: body.email,
      topic: body.topic ?? "",
      message: body.message,
    },
  }
}

/** Compose the notification email sent to the restaurant owner. */
export function buildContactEmail(data: ContactFormData): ContactEmail {
  const topic = data.topic || "Non spécifié"
  return {
    subject: `[Contact] ${escapeHtml(data.topic || "Message")} — ${escapeHtml(data.name)}`,
    replyTo: data.email,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0D5C3F;">Nouveau message de contact</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #666; width: 120px;">Nom</td>
            <td style="padding: 8px 0;">${escapeHtml(data.name)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #666;">Email</td>
            <td style="padding: 8px 0;"><a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #666;">Sujet</td>
            <td style="padding: 8px 0;">${escapeHtml(topic)}</td>
          </tr>
        </table>
        <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
        <div style="white-space: pre-wrap; color: #333; line-height: 1.6;">
          ${escapeHtml(data.message)}
        </div>
      </div>
    `,
    text: `Nouveau message de contact\n\nNom: ${data.name}\nEmail: ${data.email}\nSujet: ${topic}\n\nMessage:\n${data.message}`,
  }
}

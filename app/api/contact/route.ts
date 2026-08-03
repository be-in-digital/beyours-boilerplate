import { NextRequest, NextResponse } from "next/server"
import { getSESService } from "@be-in-digital/core"
import {
  buildContactEmail,
  validateContactData,
} from "@/lib/services/contact-service"

/** Thin transport adapter — the domain logic lives in contact-service. */
export async function POST(req: NextRequest) {
  try {
    const { data, error } = validateContactData(await req.json())
    if (error || !data) {
      return NextResponse.json({ error }, { status: 400 })
    }

    const toEmail = process.env.CONTACT_EMAIL ?? process.env.AWS_SES_FROM_EMAIL
    if (!toEmail) {
      return NextResponse.json(
        { error: "Configuration email manquante." },
        { status: 500 }
      )
    }

    await getSESService().sendEmail({ to: toEmail, ...buildContactEmail(data) })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Contact form error:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'envoi du message." },
      { status: 500 }
    )
  }
}

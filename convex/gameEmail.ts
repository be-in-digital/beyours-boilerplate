"use node";

/**
 * Prize win email (AWS SES).
 *
 * Sent after a winner claims their prize: contains the redemption code and a
 * link to the live ticket page. Best effort — a delivery failure never breaks
 * the claim flow (the player already sees the code on screen).
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

async function sendViaSES(params: {
  toEmail: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}) {
  const region = process.env.AWS_REGION ?? "eu-west-3";
  const fromEmail =
    process.env.AWS_SES_FROM_EMAIL ?? "noreply@beindigital.fr";

  const client = new SESv2Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const command = new SendEmailCommand({
    FromEmailAddress: fromEmail,
    Destination: { ToAddresses: [params.toEmail] },
    Content: {
      Simple: {
        Subject: { Data: params.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: params.htmlBody, Charset: "UTF-8" },
          Text: { Data: params.textBody, Charset: "UTF-8" },
        },
      },
    },
  });

  await client.send(command);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildPrizeHtml(params: {
  firstName: string;
  storeName: string;
  prizeName: string;
  prizeDescription?: string;
  code: string;
  expiresAt: number;
  ticketUrl?: string;
}): string {
  const ticketButton = params.ticketUrl
    ? `<div style="text-align:center;margin:28px 0 8px;">
        <a href="${params.ticketUrl}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:999px;">Voir mon ticket gagnant</a>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"></head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1a1a1a;margin:0;padding:0;background:#120d1a;">
    <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
      <div style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#f97316,#fbbf24);padding:36px 40px;text-align:center;">
          <div style="font-size:44px;line-height:1;">🎉</div>
          <h1 style="margin:12px 0 0;font-size:24px;color:#ffffff;">Félicitations ${params.firstName} !</h1>
          <p style="margin:8px 0 0;font-size:15px;color:rgba(255,255,255,0.9);">Vous avez gagné chez ${params.storeName}</p>
        </div>
        <div style="padding:32px 40px;">
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px;text-align:center;">
            <p style="margin:0;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#9a3412;">Votre lot</p>
            <p style="margin:8px 0 0;font-size:20px;font-weight:700;color:#1a1a1a;">${params.prizeName}</p>
            ${params.prizeDescription ? `<p style="margin:6px 0 0;font-size:14px;color:#6b7280;">${params.prizeDescription}</p>` : ""}
          </div>
          <div style="margin:28px 0;text-align:center;">
            <p style="margin:0 0 10px;font-size:13px;color:#6b7280;">Présentez ce code au personnel du restaurant :</p>
            <div style="display:inline-block;background:#111827;border-radius:10px;padding:14px 28px;">
              <span style="font-family:'Courier New',monospace;font-size:26px;font-weight:700;letter-spacing:6px;color:#fbbf24;">${params.code}</span>
            </div>
          </div>
          ${ticketButton}
          <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;text-align:center;">Valable jusqu'au ${formatDate(params.expiresAt)}. Une seule utilisation, sur place.</p>
        </div>
      </div>
      <p style="text-align:center;margin:20px 0 0;font-size:12px;color:#6b7280;">${params.storeName} — à très vite !</p>
    </div>
  </body>
</html>`;
}

export const sendPrizeEmail = internalAction({
  args: {
    toEmail: v.string(),
    firstName: v.string(),
    storeName: v.string(),
    prizeName: v.string(),
    prizeDescription: v.optional(v.string()),
    code: v.string(),
    expiresAt: v.number(),
  },
  handler: async (_ctx, args) => {
    const siteUrl = process.env.BID_APP_URL ?? process.env.SITE_URL ?? "";
    const ticketUrl = siteUrl
      ? `${siteUrl.replace(/\/$/, "")}/game/prize/${args.code}`
      : undefined;

    try {
      await sendViaSES({
        toEmail: args.toEmail,
        subject: `🎁 Votre lot chez ${args.storeName} — code ${args.code}`,
        htmlBody: buildPrizeHtml({ ...args, ticketUrl }),
        textBody: [
          `Félicitations ${args.firstName} !`,
          `Vous avez gagné : ${args.prizeName}`,
          `Votre code : ${args.code}`,
          ticketUrl ? `Votre ticket : ${ticketUrl}` : "",
          `Valable jusqu'au ${formatDate(args.expiresAt)}. Présentez ce code au personnel.`,
        ]
          .filter(Boolean)
          .join("\n"),
      });
      return { sent: true };
    } catch (error) {
      console.error("Échec envoi email lot gagné:", error);
      return { sent: false };
    }
  },
});

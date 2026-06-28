import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM || "Docorex <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

type SendResult = { ok: boolean; skipped?: boolean; error?: string };

/**
 * Send an email through Resend. When RESEND_API_KEY isn't configured the email
 * is logged and skipped (skipped: true) so flows keep working without email —
 * callers can then fall back to showing the invite link.
 */
export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendResult> {
  if (!resend) {
    console.log(
      `[email] RESEND_API_KEY nije postavljen — preskačem slanje na ${args.to} ("${args.subject}").`,
    );
    return { ok: true, skipped: true };
  }
  try {
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: args.to,
      subject: args.subject,
      html: args.html,
      ...(args.text ? { text: args.text } : {}),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Nepoznata greška pri slanju.",
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(content: string, footer: string): string {
  return `<!doctype html>
<html lang="hr">
  <body style="margin:0;background:#f1f5f9;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="background:#4f46e5;padding:20px 28px;color:#ffffff;font-size:18px;font-weight:bold;">Docorex</td></tr>
        <tr><td style="padding:28px;">${content}</td></tr>
        <tr><td style="padding:18px 28px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.5;">${footer}</td></tr>
      </table>
    </td></tr></table>
  </body>
</html>`;
}

const INVITE_FOOTER =
  "Ovaj email poslan je jer vas je netko pozvao u firmu na Docorexu. Ako mislite da je riječ o pogrešci, slobodno ga zanemarite.";

/** Invitation email: a newly created user sets their own password via the link. */
export async function sendInviteEmail(opts: {
  to: string;
  recipientName: string;
  inviteLink: string;
  tenantName: string;
  inviterName: string;
}): Promise<SendResult> {
  const name = opts.recipientName.trim();
  const firm = opts.tenantName.trim() || "firmu";
  const inviter = opts.inviterName.trim() || "Administrator";
  const greeting = name ? `Pozdrav ${escapeHtml(name)},` : "Pozdrav,";

  const content = `
    <h1 style="margin:0 0 10px;font-size:22px;">Pozivnica u ${escapeHtml(firm)}</h1>
    <p style="margin:0 0 4px;">${greeting}</p>
    <p style="margin:0 0 16px;color:#475569;">
      ${escapeHtml(inviter)} vas je pozvao/la u firmu
      <strong>${escapeHtml(firm)}</strong> na Docorexu. Kliknite gumb ispod da
      postavite lozinku i aktivirate svoj račun.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${opts.inviteLink}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Postavi lozinku</a>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:12px;">Ako gumb ne radi, otvorite ovaj link:</p>
    <p style="margin:6px 0 0;color:#94a3b8;font-size:12px;word-break:break-all;">${opts.inviteLink}</p>
  `;

  return sendEmail({
    to: opts.to,
    subject: `Pozivnica za ${firm} — Docorex`,
    html: layout(content, INVITE_FOOTER),
    text:
      `${greeting.replace(/<[^>]*>/g, "")}\n\n` +
      `${inviter} vas je pozvao/la u firmu ${firm} na Docorexu.\n` +
      `Postavite lozinku putem ovog linka:\n${opts.inviteLink}\n`,
  });
}

const RESET_FOOTER =
  "Ovaj email poslan je jer je zatražena promjena lozinke za vaš Docorex račun. Ako to niste bili vi, slobodno ga zanemarite — lozinka ostaje nepromijenjena.";

/** Password reset email: user sets a new password via a 1-hour link. */
export async function sendPasswordResetEmail(opts: {
  to: string;
  recipientName: string;
  resetLink: string;
}): Promise<SendResult> {
  const name = opts.recipientName.trim();
  const greeting = name ? `Pozdrav ${escapeHtml(name)},` : "Pozdrav,";

  const content = `
    <h1 style="margin:0 0 10px;font-size:22px;">Promjena lozinke</h1>
    <p style="margin:0 0 4px;">${greeting}</p>
    <p style="margin:0 0 16px;color:#475569;">
      Zatražena je promjena lozinke za vaš Docorex račun. Kliknite gumb ispod da
      postavite novu lozinku. Poveznica vrijedi <strong>1 sat</strong>.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${opts.resetLink}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Postavi novu lozinku</a>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:12px;">Ako gumb ne radi, otvorite ovaj link:</p>
    <p style="margin:6px 0 0;color:#94a3b8;font-size:12px;word-break:break-all;">${opts.resetLink}</p>
  `;

  return sendEmail({
    to: opts.to,
    subject: "Promjena lozinke — Docorex",
    html: layout(content, RESET_FOOTER),
    text:
      `${name ? `Pozdrav ${name},` : "Pozdrav,"}\n\n` +
      `Zatražena je promjena lozinke za vaš Docorex račun.\n` +
      `Postavite novu lozinku (poveznica vrijedi 1 sat):\n${opts.resetLink}\n\n` +
      `Ako to niste bili vi, zanemarite ovaj email.\n`,
  });
}

const NEW_DOC_FOOTER =
  "Ovaj email poslan je jer su uključene obavijesti o novim dokumentima za vašu firmu. Možete ih isključiti u Docorexu: Moj profil → Obavijesti.";

/** Notify a company admin that a new document was uploaded. */
export async function sendNewDocumentEmail(opts: {
  to: string;
  recipientName: string;
  documentTitle: string;
  uploaderName: string;
  tenantName: string;
  documentLink: string;
}): Promise<SendResult> {
  const name = opts.recipientName.trim();
  const greeting = name ? `Pozdrav ${escapeHtml(name)},` : "Pozdrav,";
  const uploader = opts.uploaderName.trim() || "Korisnik";
  const firm = opts.tenantName.trim() || "vašu firmu";

  const content = `
    <h1 style="margin:0 0 10px;font-size:22px;">Novi dokument</h1>
    <p style="margin:0 0 4px;">${greeting}</p>
    <p style="margin:0 0 16px;color:#475569;">
      ${escapeHtml(uploader)} je dodao/la novi dokument u
      <strong>${escapeHtml(firm)}</strong>:
    </p>
    <p style="margin:0 0 16px;font-size:16px;font-weight:bold;">${escapeHtml(opts.documentTitle)}</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${opts.documentLink}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Otvori dokument</a>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:12px;">Ako gumb ne radi, otvorite ovaj link:</p>
    <p style="margin:6px 0 0;color:#94a3b8;font-size:12px;word-break:break-all;">${opts.documentLink}</p>
  `;

  return sendEmail({
    to: opts.to,
    subject: `Novi dokument u ${firm} — Docorex`,
    html: layout(content, NEW_DOC_FOOTER),
    text:
      `${name ? `Pozdrav ${name},` : "Pozdrav,"}\n\n` +
      `${uploader} je dodao/la novi dokument u ${firm}: ${opts.documentTitle}\n` +
      `Otvori: ${opts.documentLink}\n`,
  });
}

const TRIAL_FOOTER =
  "Ovaj email poslan je jer su uključene obavijesti o isteku probnog razdoblja za vašu firmu. Možete ih isključiti u Docorexu: Moj profil → Obavijesti.";

/** Remind a company admin that the trial is about to expire. */
export async function sendTrialEndingEmail(opts: {
  to: string;
  recipientName: string;
  tenantName: string;
  daysLeft: number;
}): Promise<SendResult> {
  const name = opts.recipientName.trim();
  const greeting = name ? `Pozdrav ${escapeHtml(name)},` : "Pozdrav,";
  const firm = opts.tenantName.trim() || "vaše firme";
  const daysText = opts.daysLeft === 1 ? "1 dan" : `${opts.daysLeft} dana`;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "info@docorex.com";

  const content = `
    <h1 style="margin:0 0 10px;font-size:22px;">Probno razdoblje uskoro istječe</h1>
    <p style="margin:0 0 4px;">${greeting}</p>
    <p style="margin:0 0 16px;color:#475569;">
      Probno razdoblje za <strong>${escapeHtml(firm)}</strong> istječe za
      <strong>${daysText}</strong>. Nakon isteka, dodavanje dokumenata i pozivanje
      korisnika bit će onemogućeni dok se pretplata ne aktivira — pregled, pretraga
      i izvoz nastavljaju raditi.
    </p>
    <p style="margin:0 0 16px;color:#475569;">
      Za trajnu aktivaciju javite se na
      <a href="mailto:${support}" style="color:#4f46e5;">${support}</a>.
    </p>
    ${
      base
        ? `<div style="text-align:center;margin:24px 0;"><a href="${base}/dashboard" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Otvori Docorex</a></div>`
        : ""
    }
  `;

  return sendEmail({
    to: opts.to,
    subject: `Probno razdoblje istječe za ${daysText} — Docorex`,
    html: layout(content, TRIAL_FOOTER),
    text:
      `${name ? `Pozdrav ${name},` : "Pozdrav,"}\n\n` +
      `Probno razdoblje za ${firm} istječe za ${daysText}.\n` +
      `Za trajnu aktivaciju javite se na ${support}.\n`,
  });
}

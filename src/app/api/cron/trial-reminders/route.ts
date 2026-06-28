import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTrialEndingEmail } from "@/lib/email";

// Daily Vercel Cron: remind admins of companies whose trial ends within a few
// days. Secured by CRON_SECRET — Vercel sends it as a Bearer token on cron
// requests when the env var is set. Without the secret the route is 401 (safe).
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REMIND_WITHIN_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Neautorizirano" }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() + REMIND_WITHIN_DAYS * DAY_MS);

  // TRIAL firms ending within the window, notifications on, not yet reminded.
  const tenants = await prisma.tenant.findMany({
    where: {
      status: "TRIAL",
      notifyTrialExpiry: true,
      trialReminderSentAt: null,
      trialEndsAt: { gte: now, lte: cutoff },
    },
    select: { id: true, name: true, trialEndsAt: true },
  });

  let reminded = 0;
  for (const t of tenants) {
    const admins = await prisma.user.findMany({
      where: { tenantId: t.id, role: "ADMIN", acceptedAt: { not: null } },
      select: { email: true, name: true },
    });
    if (admins.length === 0) continue;

    const daysLeft = t.trialEndsAt
      ? Math.max(1, Math.ceil((t.trialEndsAt.getTime() - now.getTime()) / DAY_MS))
      : 1;

    await Promise.all(
      admins.map((a) =>
        sendTrialEndingEmail({
          to: a.email,
          recipientName: a.name,
          tenantName: t.name,
          daysLeft,
        }),
      ),
    );
    // Mark reminded so we don't email again every day in the window.
    await prisma.tenant.update({
      where: { id: t.id },
      data: { trialReminderSentAt: now },
    });
    reminded += 1;
  }

  return NextResponse.json({ ok: true, checked: tenants.length, reminded });
}

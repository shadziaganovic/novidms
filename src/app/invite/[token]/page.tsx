import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { verifyInviteToken } from "@/lib/invite";
import { AcceptInviteForm } from "@/components/AcceptInviteForm";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const userId = verifyInviteToken(token);
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, acceptedAt: true },
      })
    : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="card p-8">
        {!user ? (
          <>
            <h1 className="text-xl font-bold text-slate-900">
              Neispravna pozivnica
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Link je neispravan ili je istekao. Zatražite novu pozivnicu od
              administratora.
            </p>
          </>
        ) : user.acceptedAt ? (
          <>
            <h1 className="text-xl font-bold text-slate-900">
              Pozivnica je već iskorištena
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Račun je već aktiviran. Prijavite se svojom lozinkom.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-slate-900">
              Postavite lozinku
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Pozvani ste kao <strong>{user.name}</strong> ({user.email}).
            </p>
            <AcceptInviteForm token={token} />
          </>
        )}
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link
            href="/login"
            className="font-semibold text-brand-600 hover:underline"
          >
            Idi na prijavu
          </Link>
        </p>
      </div>
    </main>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { decodeResetUserId, verifyResetToken } from "@/lib/reset";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const uid = decodeResetUserId(token);
  const user = uid
    ? await prisma.user.findUnique({
        where: { id: uid },
        select: { email: true, password: true },
      })
    : null;
  const valid = !!user && !!verifyResetToken(token, user.password);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="card p-8">
        {!user || !valid ? (
          <>
            <h1 className="text-xl font-bold text-slate-900">
              Neispravna poveznica
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Poveznica je neispravna ili je istekla (vrijedi 1 sat). Zatražite
              novu na stranici za prijavu.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-slate-900">
              Postavite novu lozinku
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Za račun <strong>{user.email}</strong>.
            </p>
            <ResetPasswordForm token={token} />
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

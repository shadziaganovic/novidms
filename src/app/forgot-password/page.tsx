import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalTenantContext } from "@/lib/tenant";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  if (await getOptionalTenantContext()) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="card p-8">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">
          Zaboravljena lozinka
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          Upišite svoj email i poslat ćemo vam poveznicu za postavljanje nove
          lozinke.
        </p>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link
            className="font-semibold text-brand-600 hover:underline"
            href="/login"
          >
            Natrag na prijavu
          </Link>
        </p>
      </div>
    </main>
  );
}

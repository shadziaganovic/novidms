import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getOptionalTenantContext } from "@/lib/tenant";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; reset?: string }>;
}) {
  if (await getOptionalTenantContext()) redirect("/dashboard");
  const { from, reset } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="card p-8">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">Prijava</h1>
        <p className="mb-6 text-sm text-slate-500">Docorex — ubaci → nađi</p>
        {reset ? (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            Lozinka je promijenjena. Prijavite se novom lozinkom.
          </div>
        ) : null}
        <LoginForm from={from} />
        <div className="mt-6 flex flex-col gap-2 text-center text-sm text-slate-500">
          <Link
            className="font-semibold text-brand-600 hover:underline"
            href="/forgot-password"
          >
            Zaboravljena lozinka?
          </Link>
          <p>
            Nemate račun?{" "}
            <Link
              className="font-semibold text-brand-600 hover:underline"
              href="/register"
            >
              Registrirajte firmu
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

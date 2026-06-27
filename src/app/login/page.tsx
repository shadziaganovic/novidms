import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getOptionalTenantContext } from "@/lib/tenant";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  if (await getOptionalTenantContext()) redirect("/dashboard");
  const { from } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="card p-8">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">Prijava</h1>
        <p className="mb-6 text-sm text-slate-500">
          Docorex — ubaci → nađi
        </p>
        <LoginForm from={from} />
        <p className="mt-6 text-center text-sm text-slate-500">
          Nemate račun?{" "}
          <Link className="font-semibold text-brand-600 hover:underline" href="/register">
            Registrirajte firmu
          </Link>
        </p>
      </div>
    </main>
  );
}

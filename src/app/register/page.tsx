import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/RegisterForm";
import { getOptionalTenantContext } from "@/lib/tenant";

export default async function RegisterPage() {
  if (await getOptionalTenantContext()) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="card p-8">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">
          Registracija firme
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          Kreirate firmu i prvi (administratorski) račun.
        </p>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-slate-500">
          Već imate račun?{" "}
          <Link className="font-semibold text-brand-600 hover:underline" href="/login">
            Prijava
          </Link>
        </p>
      </div>
    </main>
  );
}

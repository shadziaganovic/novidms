import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default async function AccountPage() {
  const ctx = await getTenantContext();
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { name: true, email: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Moj račun</h1>
        <p className="text-sm text-slate-500">
          {user?.name} · {user?.email}
        </p>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">
          Promjena lozinke
        </h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}

import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { ProfileForm } from "@/components/ProfileForm";
import { CompanyForm } from "@/components/CompanyForm";
import { NotificationsForm } from "@/components/NotificationsForm";

export default async function AccountPage() {
  const ctx = await getTenantContext();
  const [user, tenant] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true, email: true },
    }),
    prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { name: true, notifyNewDocument: true },
    }),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Moj profil</h1>
        <p className="text-sm text-slate-500">
          {user?.name} · {user?.email}
        </p>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">
          Osobni podatci
        </h2>
        <ProfileForm name={user?.name ?? ""} email={user?.email ?? ""} />
      </section>

      <section id="lozinka" className="card scroll-mt-20 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">
          Izmjena lozinke
        </h2>
        <ChangePasswordForm />
      </section>

      {ctx.role === "ADMIN" ? (
        <>
          <section id="firma" className="card scroll-mt-20 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">
              Postavke firme
            </h2>
            <CompanyForm name={tenant?.name ?? ""} />
          </section>
          <section id="obavijesti" className="card scroll-mt-20 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">
              Obavijesti
            </h2>
            <NotificationsForm
              notifyNewDocument={tenant?.notifyNewDocument ?? true}
            />
          </section>
        </>
      ) : null}
    </div>
  );
}

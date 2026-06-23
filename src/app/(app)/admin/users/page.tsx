import { requireAdminContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { createInviteToken } from "@/lib/invite";
import { InviteUserForm } from "@/components/InviteUserForm";
import { UserRow } from "@/components/UserRow";

export default async function UsersPage() {
  const ctx = await requireAdminContext();

  const users = await prisma.user.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      acceptedAt: true,
    },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Korisnici</h1>
        <p className="text-sm text-slate-500">
          Pozovite članove firme i upravljajte ulogama.
        </p>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">
          Pozovi korisnika
        </h2>
        <InviteUserForm />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Korisnik</th>
              <th className="px-4 py-3 font-medium">Uloga</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Akcije</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <UserRow
                key={u.id}
                id={u.id}
                name={u.name}
                email={u.email}
                role={u.role}
                accepted={!!u.acceptedAt}
                isSelf={u.id === ctx.userId}
                inviteLink={
                  u.acceptedAt
                    ? null
                    : `${base}/invite/${createInviteToken(u.id)}`
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

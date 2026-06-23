"use client";

import { useState } from "react";
import { changeRole, removeUser } from "@/app/actions/users";

export function UserRow({
  id,
  name,
  email,
  role,
  accepted,
  isSelf,
  inviteLink,
}: {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  accepted: boolean;
  isSelf: boolean;
  inviteLink: string | null;
}) {
  const nextRole: "ADMIN" | "MEMBER" = role === "ADMIN" ? "MEMBER" : "ADMIN";
  const toggleRole = changeRole.bind(null, id, nextRole);
  const remove = removeUser.bind(null, id);
  const [copied, setCopied] = useState(false);

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <div className="font-medium text-slate-800">
          {name}{" "}
          {isSelf ? <span className="text-xs text-slate-400">(vi)</span> : null}
        </div>
        <div className="text-xs text-slate-500">{email}</div>
        {!accepted && inviteLink ? (
          <button
            type="button"
            className="mt-1 text-xs font-medium text-brand-600 hover:underline"
            onClick={async () => {
              await navigator.clipboard.writeText(inviteLink);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Pozivni link kopiran!" : "Kopiraj pozivni link"}
          </button>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <span className="pill bg-slate-100 text-slate-700">
          {role === "ADMIN" ? "Administrator" : "Član"}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`pill ${
            accepted
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {accepted ? "Aktivan" : "Pozvan"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {isSelf ? (
          <span className="text-xs text-slate-400">—</span>
        ) : (
          <div className="flex justify-end gap-2">
            <form action={toggleRole}>
              <button type="submit" className="btn-secondary btn-sm">
                {role === "ADMIN" ? "Postavi člana" : "Postavi admina"}
              </button>
            </form>
            <form
              action={remove}
              onSubmit={(e) => {
                if (!confirm(`Ukloniti korisnika ${name}?`)) e.preventDefault();
              }}
            >
              <button type="submit" className="btn-danger btn-sm">
                Ukloni
              </button>
            </form>
          </div>
        )}
      </td>
    </tr>
  );
}

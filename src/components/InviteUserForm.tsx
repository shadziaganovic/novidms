"use client";

import { useActionState, useState } from "react";
import { inviteUser, type UserActionState } from "@/app/actions/users";

function InviteLinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
      <p className="mb-2 font-medium text-green-700">
        Korisnik je pozvan. Proslijedite mu ovaj link da postavi lozinku:
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="input flex-1 text-xs"
        />
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Kopirano!" : "Kopiraj"}
        </button>
      </div>
    </div>
  );
}

export function InviteUserForm() {
  const [state, action, pending] = useActionState<UserActionState, FormData>(
    inviteUser,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input name="name" className="input" placeholder="Ime i prezime" required />
        <input
          name="email"
          type="email"
          className="input"
          placeholder="Email"
          required
        />
        <select name="role" className="input" defaultValue="MEMBER">
          <option value="MEMBER">Član</option>
          <option value="ADMIN">Administrator</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Pozivanje…" : "Pozovi korisnika"}
        </button>
        {state?.error ? (
          <span className="text-sm text-red-600">{state.error}</span>
        ) : null}
      </div>
      {state?.ok && state.inviteLink ? (
        <InviteLinkBox link={state.inviteLink} />
      ) : null}
    </form>
  );
}

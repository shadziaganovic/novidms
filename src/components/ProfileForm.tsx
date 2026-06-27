"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "@/app/actions/profile";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    undefined,
  );

  return (
    <form action={action} className="flex max-w-sm flex-col gap-4">
      <div>
        <label className="label" htmlFor="name">
          Ime i prezime
        </label>
        <input
          id="name"
          name="name"
          className="input"
          required
          minLength={2}
          defaultValue={name}
        />
      </div>
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="input bg-slate-50 text-slate-500"
          defaultValue={email}
          disabled
        />
        <p className="mt-1 text-xs text-slate-400">Email se ne može mijenjati.</p>
      </div>
      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm font-medium text-green-700">Spremljeno.</p>
      ) : null}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Spremanje…" : "Spremi"}
      </button>
    </form>
  );
}

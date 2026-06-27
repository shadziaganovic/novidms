"use client";

import { useActionState } from "react";
import { updateCompany, type ProfileState } from "@/app/actions/profile";

export function CompanyForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateCompany,
    undefined,
  );

  return (
    <form action={action} className="flex max-w-sm flex-col gap-4">
      <div>
        <label className="label" htmlFor="company">
          Naziv firme
        </label>
        <input
          id="company"
          name="name"
          className="input"
          required
          minLength={2}
          defaultValue={name}
        />
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

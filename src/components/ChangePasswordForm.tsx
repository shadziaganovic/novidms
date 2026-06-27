"use client";

import { useActionState } from "react";
import { changePassword, type PasswordState } from "@/app/actions/auth";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(
    changePassword,
    undefined,
  );

  return (
    <form action={action} className="flex max-w-sm flex-col gap-4">
      <div>
        <label className="label" htmlFor="currentPassword">
          Trenutna lozinka
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          className="input"
          required
          autoComplete="current-password"
        />
      </div>
      <div>
        <label className="label" htmlFor="newPassword">
          Nova lozinka
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          className="input"
          required
          autoComplete="new-password"
          minLength={8}
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm font-medium text-green-700">
          Lozinka je promijenjena.
        </p>
      ) : null}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Spremanje…" : "Promijeni lozinku"}
      </button>
    </form>
  );
}

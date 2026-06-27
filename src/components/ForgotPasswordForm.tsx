"use client";

import { useActionState } from "react";
import { requestPasswordReset, type PasswordState } from "@/app/actions/auth";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(
    requestPasswordReset,
    undefined,
  );

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
        Ako račun s tim emailom postoji, poslali smo poveznicu za promjenu
        lozinke. Provjerite inbox (i mapu neželjene pošte).
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          className="input"
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      <button className="btn-primary w-full" type="submit" disabled={pending}>
        {pending ? "Šaljem…" : "Pošalji poveznicu"}
      </button>
    </form>
  );
}

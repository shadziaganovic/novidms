"use client";

import { useActionState } from "react";
import { resetPassword, type PasswordState } from "@/app/actions/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(
    resetPassword,
    undefined,
  );

  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="password">
          Nova lozinka
        </label>
        <input
          id="password"
          name="password"
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
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Spremanje…" : "Postavi novu lozinku"}
      </button>
    </form>
  );
}

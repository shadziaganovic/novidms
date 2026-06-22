"use client";

import { useActionState } from "react";
import { login, type AuthState } from "@/app/actions/auth";

export function LoginForm({ from }: { from?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    login,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      {from ? <input type="hidden" name="from" value={from} /> : null}
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
      <div>
        <label className="label" htmlFor="password">
          Lozinka
        </label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      <button className="btn-primary w-full" type="submit" disabled={pending}>
        {pending ? "Prijava…" : "Prijava"}
      </button>
    </form>
  );
}

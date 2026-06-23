"use client";

import { useActionState } from "react";
import { acceptInvite, type UserActionState } from "@/app/actions/users";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<UserActionState, FormData>(
    acceptInvite,
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
        {pending ? "Spremanje…" : "Postavi lozinku i prijavi se"}
      </button>
    </form>
  );
}

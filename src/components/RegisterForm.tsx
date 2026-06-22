"use client";

import { useActionState } from "react";
import { registerCompany, type AuthState } from "@/app/actions/auth";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return <p className="mt-1 text-sm text-red-600">{messages[0]}</p>;
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    registerCompany,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="company">
          Naziv firme
        </label>
        <input className="input" id="company" name="company" required />
        <FieldError messages={state?.fieldErrors?.company} />
      </div>
      <div>
        <label className="label" htmlFor="name">
          Vaše ime
        </label>
        <input className="input" id="name" name="name" required />
        <FieldError messages={state?.fieldErrors?.name} />
      </div>
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
        <FieldError messages={state?.fieldErrors?.email} />
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
          autoComplete="new-password"
        />
        <FieldError messages={state?.fieldErrors?.password} />
      </div>
      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      <button className="btn-primary w-full" type="submit" disabled={pending}>
        {pending ? "Kreiranje…" : "Kreiraj firmu i račun"}
      </button>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCategory, type CatFormState } from "@/app/actions/categories";

export function CategoryCreateForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<CatFormState, FormData>(
    createCategory,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex items-start gap-2">
      <div className="flex-1">
        <input
          name="name"
          className="input"
          placeholder="Naziv nove kategorije"
          required
        />
        {state?.error ? (
          <p className="mt-1 text-sm text-red-600">{state.error}</p>
        ) : null}
      </div>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Dodavanje…" : "Dodaj"}
      </button>
    </form>
  );
}

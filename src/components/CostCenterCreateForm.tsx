"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCostCenter, type CcFormState } from "@/app/actions/cost-centers";

export function CostCenterCreateForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<CcFormState, FormData>(
    createCostCenter,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-start gap-2">
      <input
        name="name"
        className="input min-w-[14rem] flex-1"
        placeholder="Naziv (npr. Stan A-101)"
        required
      />
      <input
        name="code"
        className="input w-40"
        placeholder="Šifra (neobavezno)"
      />
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Dodavanje…" : "Dodaj"}
      </button>
      {state?.error ? (
        <p className="w-full text-sm text-red-600">{state.error}</p>
      ) : null}
    </form>
  );
}

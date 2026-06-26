"use client";

import { useActionState } from "react";
import { extractDocumentInvoice, type AiState } from "@/app/actions/ai";

export function AiExtractButton({ id }: { id: string }) {
  const action = extractDocumentInvoice.bind(null, id);
  const [state, formAction, pending] = useActionState<AiState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <button type="submit" className="btn-secondary btn-sm" disabled={pending}>
        {pending ? "AI izvlači…" : "Popuni iz dokumenta (AI)"}
      </button>
      {state?.ok ? (
        state.filled && state.filled.length > 0 ? (
          <span className="text-xs text-green-600">
            Popunjeno: {state.filled.join(", ")}. Provjeri i spremi.
          </span>
        ) : (
          <span className="text-xs text-slate-500">
            AI nije našao podatke u dokumentu.
          </span>
        )
      ) : null}
      {state?.error ? (
        <span className="text-xs text-red-600">{state.error}</span>
      ) : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { reprocessDocumentOcr, type ReprocessState } from "@/app/actions/ocr";

export function ReprocessOcrButton({ id }: { id: string }) {
  const action = reprocessDocumentOcr.bind(null, id);
  const [state, formAction, pending] = useActionState<ReprocessState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <button type="submit" className="btn-secondary btn-sm" disabled={pending}>
        {pending ? "Obrađujem… (može potrajati)" : "Ponovi OCR"}
      </button>
      {state?.ok ? (
        <span className="text-xs text-green-600">{state.message}</span>
      ) : null}
      {state?.error ? (
        <span className="text-xs text-red-600">{state.error}</span>
      ) : null}
    </form>
  );
}

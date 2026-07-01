"use client";

import { useActionState, useState } from "react";
import {
  approveStep,
  rejectStep,
  type ApprovalState,
} from "@/app/actions/workflows";

export function ApprovalActions({ stepId }: { stepId: string }) {
  const [aState, approve, aPending] = useActionState<ApprovalState, FormData>(
    approveStep,
    undefined,
  );
  const [rState, reject, rPending] = useActionState<ApprovalState, FormData>(
    rejectStep,
    undefined,
  );
  const [showReject, setShowReject] = useState(false);
  const err = aState?.error || rState?.error;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <form action={approve}>
          <input type="hidden" name="stepId" value={stepId} readOnly />
          <button className="btn-primary btn-sm" disabled={aPending}>
            {aPending ? "…" : "Odobri"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setShowReject((v) => !v)}
          className="btn-ghost btn-sm text-red-600"
        >
          Odbij
        </button>
      </div>
      {showReject ? (
        <form action={reject} className="flex flex-col gap-2">
          <input type="hidden" name="stepId" value={stepId} readOnly />
          <textarea
            name="comment"
            rows={2}
            className="input"
            placeholder="Razlog odbijanja (neobavezno)"
          />
          <button
            className="btn-secondary btn-sm w-fit text-red-600"
            disabled={rPending}
          >
            {rPending ? "…" : "Potvrdi odbijanje"}
          </button>
        </form>
      ) : null}
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
    </div>
  );
}

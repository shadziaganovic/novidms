"use client";

import { useActionState, useState } from "react";
import { startWorkflow, type StartWorkflowState } from "@/app/actions/workflows";

type Def = { id: string; name: string; steps: string[] };
type U = { id: string; name: string };

export function StartWorkflowForm({
  documentId,
  definitions,
  users,
}: {
  documentId: string;
  definitions: Def[];
  users: U[];
}) {
  const [state, action, pending] = useActionState<StartWorkflowState, FormData>(
    startWorkflow,
    undefined,
  );
  const [defId, setDefId] = useState("");
  const def = definitions.find((d) => d.id === defId);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="documentId" value={documentId} readOnly />
      <div>
        <label className="label" htmlFor="definitionId">
          Proces
        </label>
        <select
          id="definitionId"
          name="definitionId"
          className="input"
          value={defId}
          onChange={(e) => setDefId(e.target.value)}
          required
        >
          <option value="">— odaberi proces —</option>
          {definitions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {def ? (
        <div className="flex flex-col gap-3">
          {def.steps.map((label, i) => (
            <div key={`${def.id}-${i}`}>
              <label className="label" htmlFor={`approver_${i}`}>
                {i + 1}. {label} — odobravatelj
              </label>
              <select
                id={`approver_${i}`}
                name={`approver_${i}`}
                className="input"
                defaultValue=""
                required
              >
                <option value="">— odaberi osobu —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : null}

      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <button
        type="submit"
        className="btn-primary w-fit"
        disabled={pending || !def}
      >
        {pending ? "Pokrećem…" : "Pokreni odobravanje"}
      </button>
    </form>
  );
}

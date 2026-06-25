"use client";

import { useActionState } from "react";
import {
  renameCostCenter,
  deleteCostCenter,
  type CcFormState,
} from "@/app/actions/cost-centers";

export function CostCenterRow({
  id,
  name,
  code,
  count,
}: {
  id: string;
  name: string;
  code: string | null;
  count: number;
}) {
  const rename = renameCostCenter.bind(null, id);
  const [state, action, pending] = useActionState<CcFormState, FormData>(
    rename,
    undefined,
  );
  const del = deleteCostCenter.bind(null, id);

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input
            name="name"
            defaultValue={name}
            className="input max-w-xs"
            required
          />
          <input
            name="code"
            defaultValue={code ?? ""}
            placeholder="Šifra"
            className="input w-32"
          />
          <button
            type="submit"
            className="btn-secondary btn-sm"
            disabled={pending}
          >
            Spremi
          </button>
          {state?.ok ? (
            <span className="text-xs text-green-600">Spremljeno</span>
          ) : null}
          {state?.error ? (
            <span className="text-xs text-red-600">{state.error}</span>
          ) : null}
        </form>
      </td>
      <td className="px-4 py-3 text-slate-600">{count}</td>
      <td className="px-4 py-3 text-right">
        <form
          action={del}
          onSubmit={(e) => {
            if (
              !confirm(
                `Obrisati troškovni centar "${name}"? Dokumenti ostaju, ali bez centra.`,
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <button type="submit" className="btn-danger btn-sm">
            Obriši
          </button>
        </form>
      </td>
    </tr>
  );
}

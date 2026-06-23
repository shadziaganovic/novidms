"use client";

import { useActionState } from "react";
import {
  renameCategory,
  deleteCategory,
  type CatFormState,
} from "@/app/actions/categories";

export function CategoryRow({
  id,
  name,
  count,
}: {
  id: string;
  name: string;
  count: number;
}) {
  const rename = renameCategory.bind(null, id);
  const [state, action, pending] = useActionState<CatFormState, FormData>(
    rename,
    undefined,
  );
  const del = deleteCategory.bind(null, id);

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <form action={action} className="flex items-center gap-2">
          <input name="name" defaultValue={name} className="input max-w-xs" />
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
                `Obrisati kategoriju "${name}"? Dokumenti ostaju, ali bez kategorije.`,
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

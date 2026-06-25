"use client";

import { useActionState } from "react";
import { updateDocument, type DocFormState } from "@/app/actions/documents";

interface Props {
  doc: {
    id: string;
    title: string;
    description: string | null;
    partner: string | null;
    documentDateValue: string; // yyyy-mm-dd or ""
    categoryId: string | null;
    costCenterId: string | null;
  };
  categories: { id: string; name: string }[];
  costCenters: { id: string; name: string; code: string | null }[];
}

export function DocumentMetaForm({ doc, categories, costCenters }: Props) {
  const action = updateDocument.bind(null, doc.id);
  const [state, formAction, pending] = useActionState<DocFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="title">
          Naziv
        </label>
        <input
          id="title"
          name="title"
          className="input"
          defaultValue={doc.title}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="description">
          Opis
        </label>
        <textarea
          id="description"
          name="description"
          className="input"
          rows={2}
          defaultValue={doc.description ?? ""}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="partner">
            Partner
          </label>
          <input
            id="partner"
            name="partner"
            className="input"
            defaultValue={doc.partner ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="documentDate">
            Datum dokumenta
          </label>
          <input
            id="documentDate"
            name="documentDate"
            type="date"
            className="input"
            defaultValue={doc.documentDateValue}
          />
        </div>
        <div>
          <label className="label" htmlFor="categoryId">
            Kategorija
          </label>
          <select
            id="categoryId"
            name="categoryId"
            className="input"
            defaultValue={doc.categoryId ?? ""}
          >
            <option value="">— bez kategorije —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="costCenterId">
            Troškovni centar
          </label>
          <select
            id="costCenterId"
            name="costCenterId"
            className="input"
            defaultValue={doc.costCenterId ?? ""}
          >
            <option value="">— bez centra —</option>
            {costCenters.map((cc) => (
              <option key={cc.id} value={cc.id}>
                {cc.code ? `${cc.code} · ${cc.name}` : cc.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary btn-sm" disabled={pending}>
          {pending ? "Spremanje…" : "Spremi izmjene"}
        </button>
        {state?.ok ? (
          <span className="text-sm text-green-600">Spremljeno.</span>
        ) : null}
        {state?.error ? (
          <span className="text-sm text-red-600">{state.error}</span>
        ) : null}
      </div>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import {
  createTemplate,
  updateTemplate,
  type TemplateState,
} from "@/app/actions/templates";
import {
  FIELD_TYPE_LABELS,
  FIELD_TYPES,
  normalizeKey,
  type TemplateField,
} from "@/lib/templates";

type Initial = {
  id: string;
  name: string;
  description: string;
  body: string;
  fields: TemplateField[];
};

export function TemplateForm({ template }: { template?: Initial }) {
  const editing = !!template;
  const [state, action, pending] = useActionState<TemplateState, FormData>(
    editing ? updateTemplate : createTemplate,
    undefined,
  );
  const [fields, setFields] = useState<TemplateField[]>(
    template?.fields ?? [],
  );

  const addField = () =>
    setFields((f) => [...f, { key: "", label: "", type: "text", required: false }]);
  const patchField = (i: number, patch: Partial<TemplateField>) =>
    setFields((f) => f.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeField = (i: number) =>
    setFields((f) => f.filter((_, idx) => idx !== i));

  return (
    <form action={action} className="flex flex-col gap-5">
      {editing ? <input type="hidden" name="id" value={template.id} /> : null}
      <input
        type="hidden"
        name="fields"
        value={JSON.stringify(fields)}
        readOnly
      />

      <div>
        <label className="label" htmlFor="name">
          Naziv predloška
        </label>
        <input
          id="name"
          name="name"
          className="input"
          required
          minLength={2}
          defaultValue={template?.name ?? ""}
          placeholder="npr. Odluka o otpisu osnovnih sredstava"
        />
      </div>

      <div>
        <label className="label" htmlFor="description">
          Opis (neobavezno)
        </label>
        <input
          id="description"
          name="description"
          className="input"
          defaultValue={template?.description ?? ""}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label" htmlFor="body">
            Tekst predloška
          </label>
          <span className="text-xs text-slate-400">
            Polje umetni s {"{{kljuc}}"}
          </span>
        </div>
        <textarea
          id="body"
          name="body"
          rows={10}
          required
          className="input font-mono text-sm"
          defaultValue={template?.body ?? ""}
          placeholder={
            "Na temelju ... donosi se\n\nODLUKA\n\no otpisu osnovnog sredstva {{naziv_sredstva}} u vrijednosti {{vrijednost}} EUR.\n\nU {{mjesto}}, {{datum}}"
          }
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            Polja za popunjavanje
          </h3>
          <button
            type="button"
            onClick={addField}
            className="btn-secondary btn-sm"
          >
            + Dodaj polje
          </button>
        </div>
        {fields.length === 0 ? (
          <p className="text-sm text-slate-400">
            Još nema polja. Dodaj polja koja korisnik popunjava (npr.
            naziv_sredstva, vrijednost, datum) i referenciraj ih u tekstu s{" "}
            {"{{kljuc}}"}.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {fields.map((f, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2"
              >
                <input
                  className="input min-w-[8rem] flex-1"
                  placeholder="ključ (npr. datum)"
                  value={f.key}
                  onChange={(e) =>
                    patchField(i, { key: normalizeKey(e.target.value) })
                  }
                />
                <input
                  className="input min-w-[8rem] flex-1"
                  placeholder="oznaka (npr. Datum)"
                  value={f.label}
                  onChange={(e) => patchField(i, { label: e.target.value })}
                />
                <select
                  className="input w-40"
                  value={f.type}
                  onChange={(e) =>
                    patchField(i, {
                      type: e.target.value as TemplateField["type"],
                    })
                  }
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {FIELD_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) =>
                      patchField(i, { required: e.target.checked })
                    }
                  />
                  obavezno
                </label>
                <button
                  type="button"
                  onClick={() => removeField(i)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Ukloni
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <div>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending
            ? "Spremanje…"
            : editing
              ? "Spremi promjene"
              : "Kreiraj predložak"}
        </button>
      </div>
    </form>
  );
}

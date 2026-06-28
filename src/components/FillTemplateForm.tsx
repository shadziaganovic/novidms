"use client";

import { useActionState } from "react";
import { createFromTemplate, type FillState } from "@/app/actions/templates";
import { type TemplateField } from "@/lib/templates";

export function FillTemplateForm({
  templateId,
  fields,
}: {
  templateId: string;
  fields: TemplateField[];
}) {
  const [state, action, pending] = useActionState<FillState, FormData>(
    createFromTemplate,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="templateId" value={templateId} readOnly />

      {fields.length === 0 ? (
        <p className="text-sm text-slate-500">
          Ovaj predložak nema polja — dokument se generira kakav jest.
        </p>
      ) : (
        fields.map((f) => (
          <div key={f.key}>
            <label className="label" htmlFor={f.key}>
              {f.label}
              {f.required ? <span className="text-red-500"> *</span> : null}
            </label>
            {f.type === "textarea" ? (
              <textarea
                id={f.key}
                name={f.key}
                rows={3}
                className="input"
                required={f.required}
              />
            ) : (
              <input
                id={f.key}
                name={f.key}
                type={
                  f.type === "number"
                    ? "number"
                    : f.type === "date"
                      ? "date"
                      : "text"
                }
                step={f.type === "number" ? "any" : undefined}
                className="input"
                required={f.required}
              />
            )}
          </div>
        ))
      )}

      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <button type="submit" className="btn-primary w-fit" disabled={pending}>
        {pending ? "Generiranje…" : "Generiraj dokument (PDF)"}
      </button>
    </form>
  );
}

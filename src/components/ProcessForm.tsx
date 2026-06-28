"use client";

import { useActionState, useState } from "react";
import {
  createWorkflow,
  updateWorkflow,
  type WorkflowState,
} from "@/app/actions/workflows";

type Initial = {
  id: string;
  name: string;
  description: string;
  steps: string[];
};

export function ProcessForm({ workflow }: { workflow?: Initial }) {
  const editing = !!workflow;
  const [state, action, pending] = useActionState<WorkflowState, FormData>(
    editing ? updateWorkflow : createWorkflow,
    undefined,
  );
  const [steps, setSteps] = useState<string[]>(
    workflow?.steps && workflow.steps.length > 0 ? workflow.steps : [""],
  );

  const addStep = () => setSteps((s) => [...s, ""]);
  const setStep = (i: number, v: string) =>
    setSteps((s) => s.map((x, idx) => (idx === i ? v : x)));
  const removeStep = (i: number) =>
    setSteps((s) => (s.length <= 1 ? s : s.filter((_, idx) => idx !== i)));
  const move = (i: number, dir: -1 | 1) =>
    setSteps((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const c = [...s];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const clean = steps.map((s) => s.trim()).filter(Boolean);

  return (
    <form action={action} className="flex flex-col gap-5">
      {editing ? <input type="hidden" name="id" value={workflow.id} /> : null}
      <input type="hidden" name="steps" value={JSON.stringify(clean)} readOnly />

      <div>
        <label className="label" htmlFor="name">
          Naziv procesa
        </label>
        <input
          id="name"
          name="name"
          className="input"
          required
          minLength={2}
          defaultValue={workflow?.name ?? ""}
          placeholder="npr. Standardno odobravanje"
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
          defaultValue={workflow?.description ?? ""}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">
              Koraci odobravanja
            </h3>
            <p className="text-xs text-slate-400">
              Redoslijed odozgo prema dolje. Tko odobrava bira se pri pokretanju.
            </p>
          </div>
          <button
            type="button"
            onClick={addStep}
            className="btn-secondary btn-sm"
          >
            + Dodaj korak
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-xs text-slate-400">
                Korak {i + 1}
              </span>
              <input
                className="input flex-1"
                placeholder="npr. Voditelj odjela"
                value={s}
                onChange={(e) => setStep(i, e.target.value)}
              />
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="px-1 text-slate-500 disabled:opacity-30"
                aria-label="Gore"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === steps.length - 1}
                className="px-1 text-slate-500 disabled:opacity-30"
                aria-label="Dolje"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeStep(i)}
                disabled={steps.length <= 1}
                className="text-sm text-red-600 hover:underline disabled:opacity-30"
              >
                Ukloni
              </button>
            </div>
          ))}
        </div>
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
              : "Kreiraj proces"}
        </button>
      </div>
    </form>
  );
}

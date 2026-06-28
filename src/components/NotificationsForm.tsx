"use client";

import { useActionState } from "react";
import { updateNotifications, type ProfileState } from "@/app/actions/profile";

export function NotificationsForm({
  notifyNewDocument,
  notifyTrialExpiry,
}: {
  notifyNewDocument: boolean;
  notifyTrialExpiry: boolean;
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateNotifications,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="notifyNewDocument"
          defaultChecked={notifyNewDocument}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          Email obavijest administratorima kad netko doda novi dokument
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="notifyTrialExpiry"
          defaultChecked={notifyTrialExpiry}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          Email podsjetnik administratorima par dana prije isteka probnog
          razdoblja
        </span>
      </label>
      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm font-medium text-green-700">Spremljeno.</p>
      ) : null}
      <button type="submit" className="btn-primary w-fit" disabled={pending}>
        {pending ? "Spremanje…" : "Spremi"}
      </button>
    </form>
  );
}

"use client";

import { deleteDocument } from "@/app/actions/documents";

export function DeleteDocumentButton({ id }: { id: string }) {
  const action = deleteDocument.bind(null, id);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Obrisati dokument? Ova radnja je trajna.")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="btn-danger btn-sm">
        Obriši
      </button>
    </form>
  );
}

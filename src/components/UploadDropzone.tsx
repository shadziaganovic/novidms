"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ACCEPT_ATTR } from "@/lib/documents";

type Status = "pending" | "uploading" | "done" | "error";
type Item = { name: string; status: Status; error?: string };

export function UploadDropzone() {
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const upload = useCallback(
    async (files: File[]) => {
      if (!files.length || busy) return;
      setBusy(true);
      setItems(files.map((f) => ({ name: f.name, status: "pending" })));

      let allOk = true;
      for (let i = 0; i < files.length; i++) {
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: "uploading" } : it,
          ),
        );
        try {
          const fd = new FormData();
          fd.append("file", files[i]);
          const res = await fetch("/api/documents", {
            method: "POST",
            body: fd,
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            throw new Error(body.error ?? "Greška pri uploadu.");
          }
          setItems((prev) =>
            prev.map((it, idx) =>
              idx === i ? { ...it, status: "done" } : it,
            ),
          );
        } catch (e) {
          allOk = false;
          setItems((prev) =>
            prev.map((it, idx) =>
              idx === i
                ? {
                    ...it,
                    status: "error",
                    error: e instanceof Error ? e.message : "Greška.",
                  }
                : it,
            ),
          );
        }
      }

      setBusy(false);
      if (allOk) {
        router.push("/documents");
        router.refresh();
      }
    },
    [busy, router],
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          upload(Array.from(e.dataTransfer.files));
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center transition ${
          dragOver
            ? "border-brand-500 bg-brand-50"
            : "border-slate-300 bg-white hover:border-brand-400"
        }`}
      >
        <p className="text-sm font-medium text-slate-700">
          Povucite datoteke ovdje ili kliknite za odabir
        </p>
        <p className="text-xs text-slate-400">PDF, DOCX, PNG, JPG — do 20 MB</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            upload(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {items.map((it, idx) => (
            <li
              key={idx}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <span className="truncate text-slate-700">{it.name}</span>
              <span
                className={
                  it.status === "done"
                    ? "text-green-600"
                    : it.status === "error"
                      ? "text-red-600"
                      : "text-slate-400"
                }
              >
                {it.status === "uploading"
                  ? "Učitavanje…"
                  : it.status === "done"
                    ? "Gotovo"
                    : it.status === "error"
                      ? (it.error ?? "Greška")
                      : "Čeka"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

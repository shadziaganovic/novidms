"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logout } from "@/app/actions/auth";

/** Header profile dropdown: name + menu (account / password / company / logout). */
export function ProfileMenu({
  name,
  email,
  isAdmin,
}: {
  name: string;
  email: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "block w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 font-medium text-slate-600 hover:text-brand-600"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="max-w-[10rem] truncate">{name}</span>
        <span className="text-xs text-slate-400">▾</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="border-b border-slate-100 px-4 py-2">
            <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
            <p className="truncate text-xs text-slate-400">{email}</p>
          </div>
          <Link href="/account" role="menuitem" className={item} onClick={() => setOpen(false)}>
            Osobni podatci
          </Link>
          <Link
            href="/account#lozinka"
            role="menuitem"
            className={item}
            onClick={() => setOpen(false)}
          >
            Izmjena lozinke
          </Link>
          {isAdmin ? (
            <Link
              href="/account#firma"
              role="menuitem"
              className={item}
              onClick={() => setOpen(false)}
            >
              Postavke firme
            </Link>
          ) : null}
          <form action={logout} className="border-t border-slate-100">
            <button type="submit" role="menuitem" className={item}>
              Odjava
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

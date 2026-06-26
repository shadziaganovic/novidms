import "server-only";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";

// Storage abstraction.
//  - "disk"  (default): local filesystem — for development.
//  - "blob": Vercel Blob — for the Vercel deployment (serverless has no
//    persistent disk). Files are served only through authenticated app routes
//    (/api/documents/[id]/raw|download), never by exposing the blob URL.
// Swapping providers means implementing the three functions below; nothing else
// in the app touches the filesystem.

const PROVIDER = process.env.STORAGE_PROVIDER ?? "disk";
const STORAGE_DIR = process.env.STORAGE_DIR ?? "./uploads";

/** Build a tenant-namespaced, collision-free storage key for a file. */
export function buildStorageKey(tenantId: string, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase().slice(0, 12);
  return `${tenantId}/${nanoid()}${ext}`;
}

function diskPath(key: string): string {
  // Keys are generated server-side, but still guard against path traversal.
  const safe = key
    .split("/")
    .filter((s) => s && s !== "." && s !== "..")
    .join("/");
  return path.join(path.resolve(STORAGE_DIR), safe);
}

/**
 * Store the data and return the reference to persist as `Document.fileKey`.
 * For disk this is the key; for blob this is the (unguessable) blob URL.
 */
export async function storagePut(key: string, data: Buffer): Promise<string> {
  if (PROVIDER === "disk") {
    const full = diskPath(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
    return key;
  }
  if (PROVIDER === "blob") {
    const { put } = await import("@vercel/blob");
    const { url } = await put(key, data, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/octet-stream",
    });
    return url;
  }
  throw new Error(
    `Storage provider '${PROVIDER}' nije podržan (koristi 'disk' ili 'blob').`,
  );
}

export async function storageGet(ref: string): Promise<Buffer> {
  if (PROVIDER === "disk") {
    return readFile(diskPath(ref));
  }
  if (PROVIDER === "blob") {
    const res = await fetch(ref);
    if (!res.ok) throw new Error(`Blob dohvat nije uspio (${res.status}).`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error(`Storage provider '${PROVIDER}' nije podržan.`);
}

export async function storageDelete(ref: string): Promise<void> {
  if (PROVIDER === "disk") {
    const full = diskPath(ref);
    if (existsSync(full)) await unlink(full);
    return;
  }
  if (PROVIDER === "blob") {
    const { del } = await import("@vercel/blob");
    await del(ref);
    return;
  }
  throw new Error(`Storage provider '${PROVIDER}' nije podržan.`);
}

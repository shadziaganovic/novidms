import "server-only";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";

// Storage abstraction.
//  - "disk"  (default): local filesystem — for development.
//  - "blob": Vercel Blob (PRIVATE) — for the Vercel deployment. Blobs are stored
//    private (require auth to read), and read back server-side via get() using
//    BLOB_READ_WRITE_TOKEN. Files are only ever served through authenticated app
//    routes (/api/documents/[id]/raw|download), never by exposing a blob URL.
// fileKey is the storage pathname (`tenantId/nanoid.ext`) for BOTH providers.

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

/** Store the data and return the reference to persist as `Document.fileKey`. */
export async function storagePut(key: string, data: Buffer): Promise<string> {
  if (PROVIDER === "disk") {
    const full = diskPath(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
    return key;
  }
  if (PROVIDER === "blob") {
    const { put } = await import("@vercel/blob");
    await put(key, data, {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/octet-stream",
    });
    return key; // store the pathname; read back via get()
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
    const { get } = await import("@vercel/blob");
    const res = await get(ref, { access: "private" });
    if (!res || res.statusCode !== 200 || !res.stream) {
      throw new Error(`Blob nije pronađen: ${ref}`);
    }
    return Buffer.from(await new Response(res.stream).arrayBuffer());
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
    await del(ref); // del accepts a pathname
    return;
  }
  throw new Error(`Storage provider '${PROVIDER}' nije podržan.`);
}

import "server-only";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";

// Storage abstraction. Faza 1 ships a local-disk provider for development.
// Swapping to an S3-compatible provider (R2/Backblaze/S3) means implementing the
// three branches below — nothing else in the app references the filesystem.

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

export async function storagePut(key: string, data: Buffer): Promise<void> {
  if (PROVIDER === "disk") {
    const full = diskPath(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
    return;
  }
  throw new Error(
    `Storage provider '${PROVIDER}' nije implementiran u Fazi 1 (dodajte S3/R2 u lib/storage.ts).`,
  );
}

export async function storageGet(key: string): Promise<Buffer> {
  if (PROVIDER === "disk") {
    return readFile(diskPath(key));
  }
  throw new Error(`Storage provider '${PROVIDER}' nije implementiran.`);
}

export async function storageDelete(key: string): Promise<void> {
  if (PROVIDER === "disk") {
    const full = diskPath(key);
    if (existsSync(full)) await unlink(full);
    return;
  }
  throw new Error(`Storage provider '${PROVIDER}' nije implementiran.`);
}

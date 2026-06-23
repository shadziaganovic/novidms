import Link from "next/link";
import { getTenantContext } from "@/lib/tenant";
import { UploadDropzone } from "@/components/UploadDropzone";

export default async function NewDocumentPage() {
  // Any authenticated member may upload (spec: MEMBER can upload).
  await getTenantContext();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dodaj dokument</h1>
          <p className="text-sm text-slate-500">
            Datoteka se sprema i šalje na OCR obradu (indeksiranje sadržaja).
          </p>
        </div>
        <Link href="/documents" className="btn-secondary btn-sm">
          Natrag na dokumente
        </Link>
      </div>
      <UploadDropzone />
    </div>
  );
}

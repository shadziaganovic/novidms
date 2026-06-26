import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { getOptionalTenantContext } from "@/lib/tenant";
import { listDocumentsForExport } from "@/lib/document-list";

const OCR_LABEL: Record<string, string> = {
  PENDING: "Na čekanju",
  PROCESSING: "U obradi",
  DONE: "Obrađeno",
  FAILED: "Neuspješno",
};

// Export the currently-filtered documents (q / category / cost center) to .xlsx.
// Tenant-scoped; reuses the same filter as the documents list.
export async function GET(req: NextRequest) {
  const ctx = await getOptionalTenantContext();
  if (!ctx) {
    return NextResponse.json({ error: "Neautorizirano" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const rows = await listDocumentsForExport({
    tenantId: ctx.tenantId,
    q: sp.get("q") ?? undefined,
    categoryId: sp.get("cat") ?? undefined,
    costCenterId: sp.get("cc") ?? undefined,
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "NOVIDMS";
  const ws = wb.addWorksheet("Dokumenti");
  ws.columns = [
    { header: "Naziv", key: "title", width: 32 },
    { header: "Kategorija", key: "category", width: 18 },
    { header: "Troškovni centar", key: "costCenter", width: 24 },
    { header: "Partner", key: "partner", width: 26 },
    { header: "Broj računa", key: "invoiceNumber", width: 16 },
    { header: "Iznos (€)", key: "amount", width: 14 },
    { header: "Datum dokumenta", key: "documentDate", width: 16 },
    { header: "Dospijeće", key: "dueDate", width: 14 },
    { header: "OCR", key: "ocrStatus", width: 12 },
    { header: "Dodano", key: "createdAt", width: 18 },
  ];
  ws.getRow(1).font = { bold: true };

  let total = 0;
  for (const d of rows) {
    if (d.amount != null) total += d.amount;
    ws.addRow({
      title: d.title,
      category: d.categoryName ?? "",
      costCenter: d.costCenterName
        ? d.costCenterCode
          ? `${d.costCenterCode} · ${d.costCenterName}`
          : d.costCenterName
        : "",
      partner: d.partner ?? "",
      invoiceNumber: d.invoiceNumber ?? "",
      amount: d.amount ?? null,
      documentDate: d.documentDate ? new Date(d.documentDate) : null,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      ocrStatus: OCR_LABEL[d.ocrStatus] ?? d.ocrStatus,
      createdAt: new Date(d.createdAt),
    });
  }

  ws.getColumn("amount").numFmt = "#,##0.00";
  ws.getColumn("documentDate").numFmt = "dd.mm.yyyy";
  ws.getColumn("dueDate").numFmt = "dd.mm.yyyy";
  ws.getColumn("createdAt").numFmt = "dd.mm.yyyy hh:mm";

  const totalRow = ws.addRow({
    title: "UKUPNO",
    amount: Math.round(total * 100) / 100,
  });
  totalRow.font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="novidms-dokumenti-${date}.xlsx"`,
    },
  });
}

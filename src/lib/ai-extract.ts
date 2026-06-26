import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// AI extraction of invoice fields from a document's OCR text, via the Anthropic
// API (structured output). Model is env-overridable; default is the most capable
// Opus. For cheaper/faster high-volume extraction set ANTHROPIC_MODEL=claude-haiku-4-5.

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

const InvoiceSchema = z.object({
  partner: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  amount: z.number().nullable(),
  documentDate: z.string().nullable(),
  dueDate: z.string().nullable(),
});

export type ExtractedInvoice = z.infer<typeof InvoiceSchema>;

// Raw JSON schema for the API's structured-output constraint. (We don't use the
// SDK's zodOutputFormat helper — it requires Zod 4, the app is on Zod 3.)
const jsonSchema = {
  type: "object",
  properties: {
    partner: {
      type: ["string", "null"],
      description: "Naziv dobavljača / izdavatelja računa (tvrtka).",
    },
    invoiceNumber: { type: ["string", "null"], description: "Broj računa." },
    amount: {
      type: ["number", "null"],
      description:
        "Ukupan iznos za platiti s PDV-om, kao broj bez valute i bez separatora tisućica.",
    },
    documentDate: {
      type: ["string", "null"],
      description: "Datum izdavanja računa, format YYYY-MM-DD.",
    },
    dueDate: {
      type: ["string", "null"],
      description: "Datum dospijeća, format YYYY-MM-DD.",
    },
  },
  required: ["partner", "invoiceNumber", "amount", "documentDate", "dueDate"],
  additionalProperties: false,
};

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start >= 0 && end > start ? body.slice(start, end + 1) : "";
}

/** Extract invoice fields from OCR text. Returns null if nothing usable. */
export async function extractInvoiceData(
  ocrText: string,
): Promise<ExtractedInvoice | null> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      "Ti si asistent za izvlačenje podataka s računa (faktura) na hrvatskom jeziku. " +
      "Iz danog OCR teksta izvuci tražena polja. Ako neki podatak ne postoji ili nisi " +
      "siguran, vrati null za to polje. Iznos je UKUPAN iznos za platiti (s PDV-om) kao " +
      "broj, bez valute i bez separatora tisućica. Datume vrati u formatu YYYY-MM-DD. " +
      "Vrati isključivo JSON objekt prema shemi.",
    messages: [
      { role: "user", content: `Tekst računa:\n\n${ocrText.slice(0, 20000)}` },
    ],
    // Structured output (not in the SDK's typed params on this version).
    output_config: { format: { type: "json_schema", schema: jsonSchema } },
  } as unknown as Anthropic.MessageCreateParamsNonStreaming);

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text",
  );
  const json = extractJson(textBlock?.text ?? "");
  if (!json) return null;

  const parsed = InvoiceSchema.safeParse(JSON.parse(json));
  return parsed.success ? parsed.data : null;
}

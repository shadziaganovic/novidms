import "server-only";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

/**
 * Fill {{placeholder}} tags in a .docx template with the given values and return
 * the rendered .docx as a buffer. Pure JS (works on serverless); preserves the
 * Word formatting of the uploaded template.
 */
export function fillDocx(
  template: Buffer,
  values: Record<string, string>,
): Buffer {
  const zip = new PizZip(template);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
    nullGetter: () => "", // missing tag → empty, never the literal "undefined"
  });
  doc.render(values);
  return doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
}

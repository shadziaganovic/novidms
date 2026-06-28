import {
  Document,
  Page,
  Text,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import { ROBOTO_REGULAR, ROBOTO_BOLD } from "./pdf-fonts";

// Built-in PDF Helvetica can't encode ć/č/đ/š/ž — embed Roboto (Latin Extended-A).
Font.register({
  family: "Roboto",
  fonts: [
    { src: ROBOTO_REGULAR, fontWeight: "normal" },
    { src: ROBOTO_BOLD, fontWeight: "bold" },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    paddingVertical: 56,
    paddingHorizontal: 56,
    fontFamily: "Roboto",
    fontSize: 11,
    color: "#0f172a",
    lineHeight: 1.5,
  },
  para: {
    marginBottom: 6,
  },
});

/** Renders the filled template body as a simple A4 text document. */
function TemplateDocument({ body }: { body: string }) {
  const lines = body.split(/\r?\n/);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {lines.map((line, i) => (
          <Text key={i} style={styles.para}>
            {line.length > 0 ? line : " "}
          </Text>
        ))}
      </Page>
    </Document>
  );
}

/** Render a filled template body to a PDF buffer (Croatian-safe via Roboto). */
export async function renderTemplatePdf(body: string): Promise<Buffer> {
  return renderToBuffer(TemplateDocument({ body }));
}

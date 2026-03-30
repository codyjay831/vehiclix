/**
 * Server-safe PDF text extraction using pdfjs-dist legacy build.
 *
 * The legacy build does NOT require DOMMatrix, @napi-rs/canvas, or any
 * browser-style DOM polyfills — safe for Vercel serverless, GCP, etc.
 *
 * Only extracts text content (no rendering), so canvas is never loaded.
 */

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import(
    /* webpackIgnore: true */
    "pdfjs-dist/legacy/build/pdf.mjs"
  );

  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
    verbosity: 0,
  }).promise;

  const pageTexts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item: Record<string, unknown>) => typeof item.str === "string")
      .map((item: Record<string, unknown>) => item.str as string)
      .join(" ");
    pageTexts.push(text);
  }

  doc.destroy();
  return pageTexts.join("\n");
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { recognizeText } from "../packages/storage/recognize.ts";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { deflateSync } from "node:zlib";
test("On-device image preview retains recognized text and source bounds", async () => {
  if (process.platform !== "darwin") return;
  const image = createCanvas(1000, 300),
    ctx = image.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 1000, 300);
  ctx.fillStyle = "#111";
  ctx.font = "48px Helvetica";
  ctx.fillText("Gradients describe local change.", 40, 130);
  const pages = await recognizeText(image.toBuffer("image/png"), ".png");
  assert.match(pages[0]!.text, /Gradients describe local change/i);
  assert.equal(pages[0]!.method, "apple-vision");
  assert.equal(pages[0]!.lines[0]!.bounds.length, 4);
});

function pdf(objects: Buffer[]) {
  const parts = [Buffer.from("%PDF-1.4\n")],
    offsets = [0];
  let offset = parts[0]!.length;
  objects.forEach((data, i) => {
    offsets.push(offset);
    const b = Buffer.concat([
      Buffer.from(`${i + 1} 0 obj\n`),
      data,
      Buffer.from("\nendobj\n"),
    ]);
    parts.push(b);
    offset += b.length;
  });
  const xref = offset;
  parts.push(
    Buffer.from(
      `xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((o) => String(o).padStart(10, "0") + " 00000 n \n")
        .join(
          "",
        )}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`,
    ),
  );
  return Buffer.concat(parts);
}
const text = (s: string) => Buffer.from(s);
const stream = (dict: string, b: Buffer) =>
  Buffer.concat([
    text(`<< ${dict} /Length ${b.length} >>\nstream\n`),
    b,
    text("\nendstream"),
  ]);
test("Mixed PDFs preserve native text, recognize scanned pages, and retain original page identities", async () => {
  if (process.platform !== "darwin") return;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-mixed-"));
  process.env.COQUI_DATA_DIR = path.join(root, "library");
  const { previewImport } = await import("../packages/storage/library.ts");
  const { closeDatabase } = await import("../packages/storage/index.ts");
  try {
    const image = createCanvas(1000, 300),
      ctx = image.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 1000, 300);
    ctx.fillStyle = "black";
    ctx.font = "48px Helvetica";
    ctx.fillText("Scanned page: preserve equality.", 40, 130);
    const rgba = ctx.getImageData(0, 0, 1000, 300).data,
      rgb = Buffer.alloc(1000 * 300 * 3);
    for (let i = 0, j = 0; i < rgba.length; i += 4) {
      rgb[j++] = rgba[i]!;
      rgb[j++] = rgba[i + 1]!;
      rgb[j++] = rgba[i + 2]!;
    }
    const bytes = pdf([
      text("<< /Type /Catalog /Pages 2 0 R >>"),
      text("<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>"),
      text(
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1000 300] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>",
      ),
      text(
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1000 300] /Resources << /XObject << /Im1 7 0 R >> >> /Contents 8 0 R >>",
      ),
      text("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
      stream(
        "",
        text(
          "BT /F1 30 Tf 40 160 Td (Native text must remain unchanged.) Tj ET",
        ),
      ),
      stream(
        "/Type /XObject /Subtype /Image /Width 1000 /Height 300 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode",
        deflateSync(rgb),
      ),
      stream("", text("q 1000 0 0 300 0 0 cm /Im1 Do Q")),
    ]);
    const [result]: any = await previewImport([
      { id: "mixed", name: "Mixed.pdf", bytes },
    ]);
    assert.equal(result.id, "mixed");
    assert.equal(result.pages.length, 2);
    assert.equal(result.pages[0].text, "Native text must remain unchanged.");
    assert.match(result.pages[1].text, /preserve equality/i);
    assert.equal(result.anchors[0].method, "text");
    assert.equal(result.anchors[1].method, "apple-vision");
    assert.equal(result.anchors[1].page, 2);
    assert.equal(result.needsVision, false);
    const original = process.env.COQUI_RESOURCE_ROOT;
    process.env.COQUI_RESOURCE_ROOT = root;
    try {
      const [unavailable]: any = await previewImport([
        { id: "no-ocr", name: "Scan.png", bytes: image.toBuffer("image/png") },
      ]);
      assert.equal(unavailable.status, "ready");
      assert.equal(unavailable.needsVision, true);
      assert.match(unavailable.processingNote, /unavailable/);
    } finally {
      if (original === undefined) delete process.env.COQUI_RESOURCE_ROOT;
      else process.env.COQUI_RESOURCE_ROOT = original;
    }
  } finally {
    closeDatabase();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

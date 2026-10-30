import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
const require = createRequire(import.meta.url),
  root = path.dirname(require.resolve("pdfjs-dist/package.json"));
/** Electron utility processes need explicit Node factories: PDF.js detects them as browsers. */
class CanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext("2d") };
  }
  reset(value: any, width: number, height: number) {
    value.canvas.width = width;
    value.canvas.height = height;
  }
  destroy(value: any) {
    value.canvas.width = 0;
    value.canvas.height = 0;
    value.canvas = null;
    value.context = null;
  }
}
class FontFactory {
  async fetch({ filename }: { filename: string }) {
    return new Uint8Array(
      await fs.readFile(
        path.join(root, "standard_fonts", path.basename(filename)),
      ),
    );
  }
}
class CMapFactory {
  async fetch({ name }: { name: string }) {
    return {
      cMapData: new Uint8Array(
        await fs.readFile(
          path.join(root, "cmaps", path.basename(name) + ".bcmap"),
        ),
      ),
      compressionType: 1,
    };
  }
}
class WasmFactory {
  async fetch({ filename }: { filename: string }) {
    return new Uint8Array(
      await fs.readFile(path.join(root, "wasm", path.basename(filename))),
    );
  }
}
export async function loadPdfjs() {
  const globals = globalThis as any;
  globals.DOMMatrix ??= DOMMatrix;
  globals.ImageData ??= ImageData;
  globals.Path2D ??= Path2D;
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ).href;
  return pdfjs;
}
export function pdfOptions() {
  return {
    CanvasFactory,
    StandardFontDataFactory: FontFactory,
    CMapReaderFactory: CMapFactory,
    WasmFactory,
    useWorkerFetch: false,
    isEvalSupported: false,
  };
}

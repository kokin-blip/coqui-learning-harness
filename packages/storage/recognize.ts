import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execute = promisify(execFile);
export async function recognizeText(bytes: Uint8Array, extension: string) {
  const helper = path.join(
    process.env.COQUI_RESOURCE_ROOT ?? path.resolve("dist/engine"),
    "native/coqui-ocr",
  );
  await fs.access(helper);
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "coqui-preview-"));
  try {
    const file = path.join(folder, "material" + extension);
    await fs.writeFile(file, bytes, { mode: 0o600 });
    const { stdout } = await execute(helper, [file], {
      timeout: 60000,
      maxBuffer: 8 * 1024 * 1024,
    });
    return JSON.parse(stdout) as {
      page: number;
      text: string;
      method: string;
      lines: { text: string; confidence: number; bounds: number[] }[];
    }[];
  } finally {
    await fs.rm(folder, { recursive: true, force: true });
  }
}

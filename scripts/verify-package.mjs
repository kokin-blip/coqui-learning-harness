import fs from "node:fs";
import { spawnSync } from "node:child_process";

if (!process.env.COQUI_EXECUTABLE) throw new Error("Set COQUI_EXECUTABLE");
// Native UI lanes run sequentially so focus, native dialogs and profiling do
// not compete. Every lane owns an isolated temporary library.
for (const suite of [
  "acceptance",
  "parity-acceptance",
  "closure-acceptance",
  "setup-acceptance",
  "distribution-acceptance",
  "profile-streaming-graph",
]) {
  const result = spawnSync(process.execPath, [`scripts/${suite}.mjs`], {
    env: process.env,
    encoding: "utf8",
    timeout: 600000,
    maxBuffer: 8 * 1024 * 1024,
  });
  const output = (result.stdout ?? "") + (result.stderr ?? "");
  fs.writeFileSync(`artifacts/implementation/${suite}.log`, output);
  console.log(`${result.status === 0 ? "PASS" : "FAIL"} ${suite}`);
  if (result.status !== 0) {
    console.error(output.slice(-5000));
    process.exit(result.status ?? 1);
  }
}

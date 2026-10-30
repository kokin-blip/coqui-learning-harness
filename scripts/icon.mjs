import fs from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { execFileSync } from "node:child_process";
fs.mkdirSync("apps/desktop/resources/CoquiLearn.iconset", { recursive: true });
const mark = fs
  .readFileSync("apps/desktop/renderer/assets/3-139-34dbe.svg", "utf8")
  .match(/<g[\s\S]*<\/g>/)[0];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs><linearGradient id="forest" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#3b5c50"/><stop offset="1" stop-color="#172127"/></linearGradient><linearGradient id="glass" x2="0" y2="1"><stop stop-color="#cfe8d9" stop-opacity=".3"/><stop offset="1" stop-color="#cfe8d9" stop-opacity=".04"/></linearGradient></defs><rect x="72" y="72" width="880" height="880" rx="198" fill="url(#forest)"/><rect x="86" y="86" width="852" height="852" rx="185" fill="none" stroke="url(#glass)" stroke-width="6"/><g transform="translate(226 194) scale(26)">${mark}</g></svg>`;
fs.writeFileSync("apps/desktop/resources/icon.svg", svg);
for (const n of [16, 32, 64, 128, 256, 512, 1024]) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: n } })
    .render()
    .asPng();
  const names = [];
  if (n <= 512 && n !== 64) names.push(`icon_${n}x${n}.png`);
  if (n >= 32) names.push(`icon_${n / 2}x${n / 2}@2x.png`);
  for (const name of names)
    fs.writeFileSync("apps/desktop/resources/CoquiLearn.iconset/" + name, png);
}
execFileSync("iconutil", [
  "-c",
  "icns",
  "apps/desktop/resources/CoquiLearn.iconset",
  "-o",
  "apps/desktop/resources/CoquiLearn.icns",
]);

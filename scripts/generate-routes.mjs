import fs from "node:fs";
import path from "node:path";
const root = "packages/engine/app/api";
const files = [];
function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name === "route.ts") files.push(p);
  }
}
walk(root);
// Static routes must win over siblings such as settings/[section].
files.sort(
  (a, b) =>
    (a.match(/\[/g)?.length ?? 0) - (b.match(/\[/g)?.length ?? 0) ||
    b.split(path.sep).length - a.split(path.sep).length,
);
const imports = [],
  rows = [];
for (const [i, file] of files.entries()) {
  const route =
    "/api/" + path.relative(root, path.dirname(file)).replaceAll(path.sep, "/");
  const keys = [];
  const pattern = route.replace(/\[([^\]]+)\]/g, (_, k) => {
    keys.push(k);
    return k.startsWith("...") ? "(.+)" : "([^/]+)";
  });
  imports.push(
    `import * as route${i} from './${path.relative("packages/engine", file)}';`,
  );
  rows.push(
    `{pattern:new RegExp(${JSON.stringify("^" + pattern.replace(/\/$/, "") + "/?$")}),keys:${JSON.stringify(keys)},module:route${i}}`,
  );
}
fs.writeFileSync(
  "packages/engine/routes.generated.ts",
  imports.join("\n") + "\nexport const routes=[" + rows.join(",\n") + "];\n",
);

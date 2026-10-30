import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const filename = `CoquiLearn-${version}-arm64.dmg`;
const file = path.resolve("release", filename);
const size = fs.statSync(file).size;
const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(
      `<title>CoquiLearn download acceptance</title><h1>CoquiLearn ${version}</h1><p>Local browser-download test of the exact release DMG.</p><a href="/${filename}">Download macOS DMG</a>`,
    );
  } else if (req.url === "/" + filename) {
    res.writeHead(200, {
      "Content-Type": "application/x-apple-diskimage",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": size,
    });
    fs.createReadStream(file).pipe(res);
  } else {
    res.writeHead(404);
    res.end();
  }
});
server.listen(0, "127.0.0.1", () => {
  const state = { url: `http://127.0.0.1:${server.address().port}/`, filename };
  fs.mkdirSync("out", { recursive: true });
  fs.writeFileSync("out/download-test-server.json", JSON.stringify(state));
  console.log(JSON.stringify(state));
});

const path = require("node:path");
module.exports = async function afterSign(context) {
  const { verifyMacOSSignature } = await import("./macos-signature.mjs");
  const appPath = path.join(
    context.appOutDir,
    context.packager.appInfo.productFilename + ".app",
  );
  const result = verifyMacOSSignature(appPath);
  console.log(
    "Verified macOS bundle signature:",
    result.identifier,
    result.kind,
  );
};

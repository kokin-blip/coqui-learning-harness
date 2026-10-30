import { safeStorage } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
/** OS-protected encryption. Only Electron main opens this store. */
export function createVault(directory: string) {
  let tail = Promise.resolve();
  const file = (key: string) => {
    if (!/^[a-z0-9-]+$/.test(key)) throw new Error("Invalid credential slot");
    return path.join(directory, key + ".encrypted");
  };
  async function read(key: string) {
    try {
      if (!safeStorage.isEncryptionAvailable())
        throw new Error("macOS credential storage is unavailable.");
      return JSON.parse(
        safeStorage.decryptString(await fs.readFile(file(key))),
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }
  async function write(key: string, value: unknown) {
    const next = tail.then(async () => {
      if (!safeStorage.isEncryptionAvailable())
        throw new Error("macOS credential storage is unavailable.");
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      const temp = file(key) + ".tmp";
      const handle = await fs.open(temp, "w", 0o600);
      try {
        await handle.writeFile(
          safeStorage.encryptString(JSON.stringify(value)),
        );
        await handle.sync();
      } finally {
        await handle.close();
      }
      await fs.rename(temp, file(key));
      const folder = await fs.open(directory, "r");
      try {
        await folder.sync();
      } finally {
        await folder.close();
      }
    });
    tail = next.catch(() => {});
    return next;
  }
  return {
    read,
    write,
    store: (key: string) => ({
      read: () => read(key),
      write: (value: unknown) => write(key, value),
    }),
  };
}

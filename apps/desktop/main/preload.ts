import { contextBridge, ipcRenderer, webUtils } from "electron";
import type {
  CoquiBridge,
  DesktopEvent,
} from "../../../packages/contracts/index.ts";
const api: CoquiBridge = {
  getPathForFile: (file) => webUtils.getPathForFile(file),
  sessions: {
    list: () => ipcRenderer.invoke("coqui:request", { path: "/api/chats" }),
    create: (title, kind, operationId) =>
      ipcRenderer.invoke("coqui:request", {
        path: "/api/chats",
        method: "POST",
        body: { title, kind },
        operationId,
      }),
    get: (id) =>
      ipcRenderer.invoke("coqui:request", {
        path: "/api/chats/" + encodeURIComponent(id),
      }),
    send: (id, input, operationId) =>
      ipcRenderer.invoke("coqui:request", {
        path: "/api/chat",
        method: "POST",
        body: { chatId: id, input },
        operationId,
      }),
  },
  request: (input) => ipcRenderer.invoke("coqui:request", input),
  host: (action, payload) =>
    ipcRenderer.invoke("coqui:host", { action, payload }),
  subscribe(listener) {
    const fn = (_event: unknown, value: DesktopEvent) => listener(value);
    ipcRenderer.on("coqui:event", fn);
    return () => ipcRenderer.removeListener("coqui:event", fn);
  },
};
contextBridge.exposeInMainWorld("coqui", api);

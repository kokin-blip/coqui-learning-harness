import {
  recoveringRequest,
  DesktopRequestError,
} from "./operation-recovery.ts";
import type { CoquiBridge } from "../../../packages/contracts/index.ts";
declare global {
  interface Window {
    coqui: CoquiBridge;
  }
}
export async function api(
  path: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
) {
  const r = await recoveringRequest({ path, method, body });
  if (r.status >= 400)
    throw new DesktopRequestError(
      r.body?.error ?? "This action could not be completed.",
      r.body?.code,
      r.operationId,
      r.status,
    );
  return r.streamId ? { ...r.body, streamId: r.streamId } : r.body;
}
export const host = (action: string, payload?: unknown) =>
  window.coqui.host(action, payload);
export const connectionStatus = (): Promise<
  import("../../../packages/contracts/index.ts").ConnectionStatus
> => host("connections");
export const chatGPTControl = async (
  command: import("../../../packages/engine/src/core/contracts/chatgpt.ts").ChatGPTCommand,
): Promise<
  import("../../../packages/engine/src/core/contracts/chatgpt.ts").ChatGPTStatus
> => {
  const status = await host("chatgpt", command);
  if (typeof status?.available !== "boolean")
    throw new Error(
      status?.error ?? "The account action could not be completed.",
    );
  return status;
};
export const nativeAccountControl = (
  command: import("../../../packages/contracts/index.ts").NativeAccountCommand,
): Promise<{ started: true }> => host("subscription", command);
export const registerArtifact = (
  html: string,
  policyVersion?: number,
): Promise<
  import("../../../packages/contracts/index.ts").ArtifactRegistration
> => host("artifact.register", { html, policyVersion });

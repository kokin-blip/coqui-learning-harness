import type {
  DesktopRequest,
  DesktopResponse,
  DesktopEvent,
} from "../../../packages/contracts/index.ts";
export class DesktopRequestError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly operationId?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "DesktopRequestError";
  }
}
type StoragePort = Pick<Storage, "getItem" | "setItem">;
const canonical = (value: any): any =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((k) => [k, canonical(value[k])]),
        )
      : value;
/** Store only command digests/identities; learner text and credentials never enter this retry registry. */
export class OperationRegistry {
  constructor(private storage: StoragePort) {}
  async identity(request: DesktopRequest) {
    const key = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(
            JSON.stringify(canonical({ ...request, operationId: undefined })),
          ),
        ),
      ),
    )
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const entries = JSON.parse(
      this.storage.getItem("coqui.pending-operations") ?? "{}",
    );
    const id = request.operationId ?? entries[key] ?? crypto.randomUUID();
    entries[key] = id;
    this.storage.setItem("coqui.pending-operations", JSON.stringify(entries));
    return { key, id };
  }
  settle(key: string, id: string) {
    const entries = JSON.parse(
      this.storage.getItem("coqui.pending-operations") ?? "{}",
    );
    if (entries[key] === id) {
      delete entries[key];
      this.storage.setItem("coqui.pending-operations", JSON.stringify(entries));
    }
  }
}
export async function recoveringRequest(
  request: DesktopRequest,
): Promise<DesktopResponse> {
  if (
    !request.method ||
    request.method === "GET" ||
    request.path.startsWith("/coqui/draft")
  )
    return window.coqui.request(request);
  const registry = new OperationRegistry(localStorage),
    operation = await registry.identity(request);
  let response: DesktopResponse;
  try {
    response = await window.coqui.request({
      ...request,
      operationId: operation.id,
    });
  } catch (error) {
    throw new DesktopRequestError(
      (error as Error).message,
      "transport_interrupted",
      operation.id,
    );
  }
  if (response.body?.code !== "operation_uncertain")
    registry.settle(operation.key, operation.id);
  return { ...response, operationId: operation.id };
}
export class EventCursor {
  private previous?: { sequence: number; epoch?: string; cursor: number };
  observe(event: DesktopEvent) {
    const old = this.previous,
      cursor = event.cursor ?? old?.cursor ?? 0,
      epoch = event.serviceEpoch;
    const stale =
      !!old && old.epoch === epoch && event.sequence <= old.sequence;
    if (stale) return { stale: true, resync: false };
    const resync =
      !!old &&
      (old.epoch !== epoch ||
        event.sequence !== old.sequence + 1 ||
        cursor < old.cursor);
    this.previous = { sequence: event.sequence, epoch, cursor };
    return { stale: false, resync };
  }
}

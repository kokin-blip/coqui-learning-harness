import { recoveringRequest } from "./operation-recovery.ts";
import type { DesktopEvent } from "../../../packages/contracts/index.ts";
/** The tested engine session state machine consumes SSE; IPC is its transport. */
export const sessionFetch: typeof fetch = async (input, init) => {
  const value =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  const url = new URL(value, "http://coqui.local");
  let streamId: string | undefined,
    ended = false,
    controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  const queued: DesktopEvent[] = [],
    encoder = new TextEncoder();
  const accept = (event: DesktopEvent) => {
    if (ended) return;
    if (streamId && event.type === "service-error") {
      ended = true;
      controller?.error(
        new Error(
          "The learning service restarted. Reopen the saved session to reconnect.",
        ),
      );
      unsubscribe();
      return;
    }
    if (event.streamId !== streamId) return;
    if (event.type === "stream")
      controller?.enqueue(
        encoder.encode("data: " + JSON.stringify(event.data.event) + "\n\n"),
      );
    if (event.type === "stream-end") {
      ended = true;
      controller?.close();
      unsubscribe();
    }
  };
  const unsubscribe = window.coqui.subscribe((event) => {
    if (!streamId) queued.push(event);
    else accept(event);
  });
  try {
    const response = await recoveringRequest({
      path: url.pathname + url.search,
      method: (init?.method ?? "GET") as any,
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    });
    if (response.replayed && response.streamId) {
      unsubscribe();
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
      if (!body.chatId)
        throw new Error("Reopen the saved session to recover this operation.");
      return sessionFetch(
        "/api/chats/" + encodeURIComponent(body.chatId) + "/stream",
        { signal: init?.signal },
      );
    }
    if (!response.streamId) {
      unsubscribe();
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: { "content-type": "application/json", ...response.headers },
      });
    }
    streamId = response.streamId;
    const cancel = () => {
      unsubscribe();
      if (!ended) {
        ended = true;
        void window.coqui.request({
          path: "/coqui/stream/cancel",
          method: "POST",
          body: { streamId },
        });
      }
    };
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
        for (const event of queued) accept(event);
        queued.length = 0;
        if (init?.signal?.aborted) {
          cancel();
          c.error(new DOMException("Aborted", "AbortError"));
        } else
          init?.signal?.addEventListener(
            "abort",
            () => {
              cancel();
              try {
                c.error(new DOMException("Aborted", "AbortError"));
              } catch {}
            },
            { once: true },
          );
      },
      cancel,
    });
    return new Response(stream, {
      status: response.status,
      headers: { "content-type": "text/event-stream" },
    });
  } catch (error) {
    unsubscribe();
    throw error;
  }
};

export type DesktopRequest = {
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: { "if-match"?: string };
  operationId?: string;
};
export type ExtractionAction = {
  state: "running" | "completed" | "partial" | "failed" | "interrupted";
  startedAt: string;
  finishedAt?: string;
  remaining?: number;
  message?: string;
};
export type DesktopResponse = {
  status: number;
  body?: any;
  streamId?: string;
  replayed?: boolean;
  operationId?: string;
  headers?: Record<string, string>;
};
export type DesktopEvent = {
  sequence: number;
  type: string;
  data?: any;
  streamId?: string;
  serviceEpoch?: string;
  cursor?: number;
};
export type UndoAction = {
  id: string;
  title: string;
  createdAt: string;
  sessions: number;
  concepts: number;
};
export type UndoHistory = {
  items: UndoAction[];
  nextOffset: number;
  hasMore: boolean;
};
export type ImportPickedFile = {
  id: string;
  name: string;
  base64?: string;
  error?: string;
};
export type SourcePage = {
  page: number;
  text: string;
  method?: string;
  lines?: { text: string; confidence: number; bounds: number[] }[];
};
export type ImportPreview = {
  id: string;
  name: string;
  status: "ready" | "error";
  error?: string;
  digest?: string;
  ext?: string;
  bytes?: number;
  pages?: SourcePage[];
  text?: string;
  duplicate?: boolean;
  image?: boolean;
  needsVision?: boolean;
  processingNote?: string;
  anchors?: {
    source: string;
    page: number;
    method: string;
    lines: unknown[];
  }[];
};
export type ImportItem = ImportPreview & {
  selected: boolean;
  duplicateChoice?: "reuse" | "update";
  phase: "processing" | "ready" | "saving" | "saved" | "error";
};
export type RecoveryCode =
  | "operation_conflict"
  | "operation_uncertain"
  | "turn_conflict"
  | "stale_question"
  | "stale_problem"
  | "pending_question"
  | "transport_interrupted"
  | "library_maintenance"
  | "authority_changed";
export type ProviderDiagnostic = {
  status?: number;
  code?: string;
  requestId?: string;
  retryable: boolean;
  bodyShape?: "error" | "detail" | "text" | "unknown";
  category:
    | "quota"
    | "permission"
    | "eligibility"
    | "unavailable"
    | "unsupported"
    | "expired"
    | "interrupted"
    | "unknown";
};
export type ConnectionStatus = {
  chatgpt?: import("../engine/src/core/contracts/chatgpt.ts").ChatGPTStatus;
  native?: import("../engine/src/core/contracts/subscriptions.ts").NativeSubscriptionStatus[];
};
export type ArtifactRegistration = {
  url: string;
  token: string;
  policyVersion: number;
};
export type NativeAccountCommand = {
  providerId: import("../engine/src/core/contracts/subscriptions.ts").NativeSubscriptionProviderId;
} & (
  | { op: "login"; enabled?: boolean }
  | { op: "cancel" | "retry" | "disconnect" }
  | { op: "consent"; enabled: boolean }
  | { op: "open"; attemptId: string; actionId: string }
  | { op: "respond"; attemptId: string; promptId: string; value: string }
);
export interface CoquiBridge {
  getPathForFile(file: File): string;
  sessions: {
    list(): Promise<DesktopResponse>;
    create(
      title: string,
      kind?: "teach" | "practice",
      operationId?: string,
    ): Promise<DesktopResponse>;
    get(id: string): Promise<DesktopResponse>;
    send(
      id: string,
      input: import("../engine/src/core/input-events.ts").ChatInput,
      operationId: string,
    ): Promise<DesktopResponse>;
  };
  request(input: DesktopRequest): Promise<DesktopResponse>;
  subscribe(listener: (event: DesktopEvent) => void): () => void;
  host(action: string, payload?: any): Promise<any>;
}

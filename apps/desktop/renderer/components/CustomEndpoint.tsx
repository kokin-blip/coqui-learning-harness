import { useEffect, useState } from "react";
import { host } from "../api.ts";
export function CustomEndpoint({
  refresh,
  notify,
}: {
  refresh: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [config, setConfig] = useState<any>({
      baseUrl: "",
      authMode: "keyless",
      manualModels: [],
      models: [],
    }),
    [key, setKey] = useState(""),
    [busy, setBusy] = useState(false),
    [overrides, setOverrides] = useState("");
  async function load() {
    const response = await window.coqui.request({
      path: "/api/custom-provider",
    });
    if (response.status >= 400) throw new Error(response.body.error);
    setConfig({ ...response.body, etag: response.headers?.etag });
    setOverrides(JSON.stringify(response.body.overrides ?? {}, null, 2));
  }
  useEffect(() => {
    void load().catch((e) => notify(e.message));
  }, []);
  async function mutate(method: "POST" | "PATCH" | "DELETE", body: any) {
    setBusy(true);
    try {
      const response = await window.coqui.request({
        path: "/api/custom-provider",
        method,
        headers: { "if-match": config.etag },
        body,
        operationId: crypto.randomUUID(),
      });
      if (response.status >= 400) throw new Error(response.body.error);
      setKey("");
      await load();
      await refresh();
      notify(
        method === "DELETE"
          ? "Custom endpoint disconnected."
          : "Custom endpoint saved.",
      );
    } catch (e) {
      notify((e as Error).message);
      await load();
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="settings-section">
      <summary>Custom model endpoint</summary>
      <p className="caption">
        Connect one OpenAI-compatible server. Credentials are bound to its exact
        address.
      </p>
      <label className="field">
        Server address
        <input
          type="url"
          value={config.baseUrl}
          placeholder="http://127.0.0.1:1234/v1"
          onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
        />
      </label>
      <label className="field">
        Authentication
        <select
          value={config.authMode}
          onChange={(e) => setConfig({ ...config, authMode: e.target.value })}
        >
          <option value="keyless">No API key</option>
          <option value="apiKey">API key</option>
        </select>
      </label>
      {config.authMode === "apiKey" && (
        <>
          <label className="field">
            API key
            <input
              type="password"
              value={key}
              autoComplete="off"
              onChange={(e) => setKey(e.target.value)}
              placeholder={
                config.keyPresent
                  ? "Enter a replacement or choose reuse below"
                  : "Enter the server key"
              }
            />
          </label>
          {config.keyPresent && (
            <label className="toggle">
              <input
                type="checkbox"
                checked={config.reuseKey ?? false}
                onChange={(e) =>
                  setConfig({ ...config, reuseKey: e.target.checked })
                }
              />
              Allow the saved key at this address
            </label>
          )}
        </>
      )}
      <label className="field">
        Model IDs, when discovery is unavailable
        <textarea
          value={
            Array.isArray(config.manualModels)
              ? config.manualModels.join("\n")
              : config.manualModels
          }
          onChange={(e) =>
            setConfig({ ...config, manualModels: e.target.value })
          }
          placeholder="One model ID per line"
        />
      </label>
      <div className="inline-actions">
        <button
          disabled={busy || !config.baseUrl}
          className="primary"
          onClick={() =>
            void mutate("POST", {
              baseUrl: config.baseUrl,
              authMode: config.authMode,
              manualModels: config.manualModels,
              ...(key ? { key } : {}),
              reuseKey: config.reuseKey,
            })
          }
        >
          {busy ? "Connecting…" : "Discover and connect"}
        </button>
        <button
          disabled={busy || !config.models?.length}
          onClick={() => void mutate("DELETE", {})}
        >
          Disconnect endpoint
        </button>
      </div>
      {config.models?.length > 0 && (
        <details>
          <summary>{config.models.length} available models</summary>
          <p className="caption">
            {config.models.map((m: any) => m.id).join(", ")}
          </p>
          <label className="field">
            Context, output and capability overrides
            <textarea
              className="code-editor"
              value={overrides}
              onChange={(e) => setOverrides(e.target.value)}
            />
          </label>
          <button
            disabled={busy}
            onClick={() => {
              try {
                void mutate("PATCH", { overrides: JSON.parse(overrides) });
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            Save model overrides
          </button>
        </details>
      )}
    </details>
  );
}

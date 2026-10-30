import { manageChatGPTUsage } from "./ChatGPTPlan.tsx";
import { useDictationLanguage } from "./dictation-preference.ts";
import { useDictationActive } from "./dictation-state.ts";
import type { DictationLanguage } from "../../../../packages/engine/src/core/dictation.ts";
import { ModelPicker } from "./ModelPicker.tsx";
import { CustomEndpoint } from "./CustomEndpoint.tsx";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Download,
  Upload,
  Link2,
} from "lucide-react";
import { api, host } from "../api.ts";
import { DICTATION_LANGUAGES } from "../../../../packages/engine/src/core/dictation.ts";
import {
  SHORTCUTS,
  bindingFor,
  eventBinding,
  validateBinding,
} from "../shortcuts.ts";
const providers = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    detail: "Use eligible models from your ChatGPT plan.",
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    detail: "Sign in with your GitHub account and Copilot subscription.",
  },
  {
    id: "xai",
    name: "Grok",
    detail: "Connect your eligible Grok or X subscription.",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    detail: "Use your own Claude Code installation and its account.",
  },
];
function ThinkingChoice({
  label,
  value,
  spec,
  models,
  onChange,
}: {
  label: string;
  value?: string;
  spec?: { provider: string; id: string };
  models: any[];
  onChange: (value: string) => void;
}) {
  const levels: string[] =
    models.find((m) => m.id === spec?.id && m.provider === spec?.provider)
      ?.supportedLevels ?? [];
  return (
    <select
      aria-label={label}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Use default thinking</option>
      {value && !levels.includes(value) && (
        <option value={value} disabled>
          Unavailable · {value}
        </option>
      )}
      {levels.map((level) => (
        <option key={level} value={level}>
          {level}
        </option>
      ))}
    </select>
  );
}
function modelChoice(previous: any, model: any, models: any[]) {
  const next = { ...previous };
  if (model) next.model = { provider: model.provider, id: model.id };
  else delete next.model;
  const levels =
    models.find((m) => m.id === model?.id && m.provider === model?.provider)
      ?.supportedLevels ?? [];
  if (model && next.thinkingLevel && !levels.includes(next.thinkingLevel))
    delete next.thinkingLevel;
  return Object.keys(next).length ? next : undefined;
}
export function Settings({
  settings,
  catalog,
  connections,
  appearance,
  shortcuts,
  onRefresh,
  onAppearance,
  notify,
}: {
  settings: any;
  catalog: any;
  connections: any;
  appearance: any;
  shortcuts: Record<string, string>;
  onRefresh: () => Promise<void>;
  onAppearance: (v: any) => void;
  notify: (s: string) => void;
}) {
  const [fonts, setFonts] = useState<string[]>([]);
  const [deletions, setDeletions] = useState<
    import("../../../../packages/contracts/index.ts").UndoHistory
  >({ items: [], nextOffset: 0, hasMore: false });
  const dictationPreference = useDictationLanguage(),
    dictationActive = useDictationActive();
  const [tab, setTab] = useState("Connections"),
    [keys, setKeys] = useState<any>({ providers: [], keys: [] }),
    [prompts, setPrompts] = useState<any[]>([]),
    [editor, setEditor] = useState<any>(null),
    [secret, setSecret] = useState(""),
    [keyId, setKeyId] = useState(""),
    [status, setStatus] = useState<any>(null),
    [custom, setCustom] = useState("");
  const run = async (fn: () => Promise<any>) => {
    try {
      await fn();
      if (tab === "Prompts") {
        const v = await api("/api/settings/prompts");
        setPrompts(
          Array.from(
            new Map(
              [
                ...(v.prober ?? []),
                ...(v.teacher ?? []),
                ...(v.practice ?? []),
              ].map((p) => [p.path, p]),
            ).values(),
          ),
        );
      }
      await onRefresh();
      if (tab === "Data") setDeletions(await api("/coqui/undo"));
    } catch (e) {
      notify((e as Error).message);
    }
  };
  useEffect(() => {
    if (tab === "Data")
      void api("/coqui/undo")
        .then(setDeletions)
        .catch((e) => notify(e.message));
  }, [tab]);
  useEffect(() => {
    void api("/api/keys")
      .then(setKeys)
      .catch((e) => notify(e.message));
  }, []);
  const saveSection = (section: string, value: any) =>
    run(() => api("/api/settings/" + section, "PUT", value));
  const begin = (p: string, op: string, fields: any = {}) =>
    run(() =>
      host(p === "chatgpt" ? "chatgpt" : "subscription", {
        op,
        ...(p === "chatgpt" ? {} : { providerId: p }),
        ...fields,
      }),
    );
  return (
    <div className="settings-view">
      <header className="page-heading">
        <h1>Make this space yours.</h1>
        <p>Connected models, thoughtful defaults, and data you own.</p>
      </header>
      <div className="settings-tabs segmented">
        {["Connections", "Models", "Experience", "Prompts", "Data"].map((t) => (
          <button
            key={t}
            aria-pressed={t === tab}
            onClick={() => {
              setTab(t);
              if (t === "Prompts")
                void api("/api/settings/prompts").then((v) =>
                  setPrompts(
                    v.segments ??
                      v.prompts ??
                      Array.from(
                        new Map(
                          [
                            ...(v.prober ?? []),
                            ...(v.teacher ?? []),
                            ...(v.practice ?? []),
                          ].map((p) => [p.path, p]),
                        ).values(),
                      ),
                  ),
                );
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Connections" && (
        <>
          <div className="connection-list">
            {providers.map((p) => {
              const state =
                p.id === "chatgpt"
                  ? connections?.chatgpt
                  : p.id === "claude-code"
                    ? null
                    : connections?.native?.find(
                        (s: any) => s.providerId === p.id,
                      );
              const active =
                p.id === "chatgpt"
                  ? state?.accounts?.some(
                      (a: any) => a.id === state.activeId && a.connected,
                    )
                  : state?.connected;
              return (
                <section className="connection-row glass mist" key={p.id}>
                  <div className="connection-title">
                    <div>
                      <h2>{p.name}</h2>
                      <p>{p.detail}</p>
                    </div>
                    <span className={"pill " + (active ? "selected" : "")}>
                      {active
                        ? "Connected"
                        : state?.pending
                          ? "Connecting…"
                          : p.id === "claude-code" &&
                              settings?.claudeCode?.enabled
                            ? "Enabled"
                            : "Not connected"}
                    </span>
                  </div>
                  {p.id === "claude-code" ? (
                    <div className="inline-actions">
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={settings?.claudeCode?.enabled ?? false}
                          onChange={(e) =>
                            void saveSection("claudeCode", {
                              enabled: e.target.checked,
                            })
                          }
                        />
                        Enable Claude Code
                      </label>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={
                            settings.claudeCode?.allowBackgroundUse !== false
                          }
                          onChange={(e) =>
                            void run(() =>
                              api("/coqui/background", "PUT", {
                                provider: "claude-code",
                                enabled: e.target.checked,
                              }),
                            )
                          }
                        />
                        Allow background learning work
                      </label>
                      <button
                        onClick={() => void run(() => host("claude.login"))}
                      >
                        Sign in using Claude Code <ArrowUpRight size={14} />
                      </button>
                      <button
                        onClick={() =>
                          void run(async () =>
                            setStatus(await api("/coqui/claude")),
                          )
                        }
                      >
                        Check installation
                      </button>
                      {status && (
                        <span className="caption">
                          {status.state === "update-required"
                            ? "Update Claude Code to " +
                              status.minimumVersion +
                              " or later. Installed: " +
                              status.version
                            : status.state === "meets-minimum"
                              ? "Compatible installation: " + status.version
                              : status.state === "not-found"
                                ? "Claude Code was not found. Install it using its published instructions."
                                : "The installed version could not be checked."}
                        </span>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="inline-actions">
                        <button
                          className={active ? "secondary" : "primary"}
                          disabled={state?.pending}
                          onClick={() =>
                            void begin(
                              p.id,
                              "login",
                              p.id === "chatgpt" && active
                                ? { fresh: true }
                                : {},
                            )
                          }
                        >
                          {p.id === "chatgpt"
                            ? active
                              ? "Add ChatGPT account"
                              : "Continue with ChatGPT"
                            : active
                              ? "Add / reconnect account"
                              : "Connect " + p.name}
                          <ArrowUpRight size={15} />
                        </button>
                        {state?.pending && (
                          <button onClick={() => void begin(p.id, "cancel")}>
                            Cancel sign-in
                          </button>
                        )}
                        {active && (
                          <button
                            aria-label={"Disconnect " + p.name}
                            onClick={() =>
                              void begin(
                                p.id,
                                "disconnect",
                                p.id === "chatgpt"
                                  ? { id: state.activeId }
                                  : {},
                              )
                            }
                          >
                            <LogOut size={15} />
                            Disconnect
                          </button>
                        )}
                        <label className="toggle">
                          <input
                            type="checkbox"
                            checked={state?.allowBackgroundUse ?? true}
                            onChange={(e) =>
                              void begin(p.id, "consent", {
                                enabled: e.target.checked,
                              })
                            }
                          />
                          Allow background learning work
                        </label>
                      </div>
                      {p.id === "chatgpt" && (
                        <>
                          {state?.hasPendingRegistration && !state.pending && (
                            <p className="caption">
                              An unfinished connection can be resumed.{" "}
                              <button
                                className="text-button"
                                onClick={() =>
                                  void begin("chatgpt", "login", {
                                    fresh: true,
                                  })
                                }
                              >
                                Start a new connection instead
                              </button>
                            </p>
                          )}
                          {state?.accounts?.map((a: any) => (
                            <div
                              className="account account-controls"
                              key={a.id}
                            >
                              <div>
                                <strong>{a.email}</strong>
                                <p className="caption">
                                  {state.activeId === a.id ? "Selected · " : ""}
                                  {a.connected
                                    ? "Plan connected"
                                    : a.planEnabled === false
                                      ? "Plan permission or sign-in needed"
                                      : "Reconnect needed"}
                                </p>
                              </div>
                              <div className="inline-actions">
                                <button
                                  aria-label={
                                    "Select ChatGPT account " + a.email
                                  }
                                  disabled={
                                    !a.connected ||
                                    state.activeId === a.id ||
                                    state.pending
                                  }
                                  onClick={() =>
                                    void begin("chatgpt", "select", {
                                      id: a.id,
                                    })
                                  }
                                >
                                  {state.activeId === a.id
                                    ? "Selected"
                                    : "Use account"}
                                </button>
                                <button
                                  disabled={state.pending}
                                  onClick={() =>
                                    void begin("chatgpt", "login", { id: a.id })
                                  }
                                >
                                  Reconnect
                                </button>
                                <button
                                  disabled={state.pending}
                                  onClick={() =>
                                    void begin("chatgpt", "logout", {
                                      id: a.id,
                                    })
                                  }
                                >
                                  Sign out
                                </button>
                                <button
                                  disabled={state.pending}
                                  className="danger text-button"
                                  onClick={() =>
                                    void begin("chatgpt", "disconnect", {
                                      id: a.id,
                                    })
                                  }
                                >
                                  Forget account
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            className="text-button"
                            onClick={() => void manageChatGPTUsage()}
                          >
                            Manage ChatGPT usage <ArrowUpRight size={14} />
                          </button>
                        </>
                      )}
                      {state?.diagnostic && (
                        <details className="caption">
                          <summary>Connection diagnostic</summary>
                          <p>
                            {state.diagnostic.category}
                            {state.diagnostic.status
                              ? " · HTTP " + state.diagnostic.status
                              : ""}
                            {state.diagnostic.code
                              ? " · " + state.diagnostic.code
                              : ""}
                          </p>
                          {state.diagnostic.requestId && (
                            <p>Request {state.diagnostic.requestId}</p>
                          )}
                        </details>
                      )}
                      {state?.interaction && (
                        <div className="auth-interaction">
                          {state.interaction.userCode && (
                            <p>
                              Enter code{" "}
                              <strong>{state.interaction.userCode}</strong> in
                              the provider’s sign-in page.
                            </p>
                          )}
                          {state.interaction.progress && (
                            <p>{state.interaction.progress}</p>
                          )}
                          {state.interaction.browser && (
                            <button
                              onClick={() =>
                                void begin(p.id, "open", {
                                  attemptId: state.interaction.attemptId,
                                  actionId: state.interaction.browser.id,
                                })
                              }
                            >
                              Open sign-in page <ArrowUpRight size={14} />
                            </button>
                          )}
                          {state.interaction.prompt && (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                void begin(p.id, "respond", {
                                  attemptId: state.interaction.attemptId,
                                  promptId: state.interaction.prompt.id,
                                  value: secret,
                                });
                                setSecret("");
                              }}
                            >
                              <label className="field">
                                {state.interaction.prompt.message}
                                {state.interaction.prompt.type === "select" ? (
                                  <select
                                    value={secret}
                                    onChange={(e) => setSecret(e.target.value)}
                                  >
                                    <option value="">Choose…</option>
                                    {state.interaction.prompt.options?.map(
                                      (o: any) => (
                                        <option value={o.id} key={o.id}>
                                          {o.label}
                                        </option>
                                      ),
                                    )}
                                  </select>
                                ) : (
                                  <input
                                    type={
                                      state.interaction.prompt.type === "secret"
                                        ? "password"
                                        : "text"
                                    }
                                    value={secret}
                                    onChange={(e) => setSecret(e.target.value)}
                                    autoComplete="off"
                                  />
                                )}
                              </label>
                              <button type="submit">Continue</button>
                            </form>
                          )}
                        </div>
                      )}
                      {state?.error && (
                        <p className="inline-error" role="status">
                          {state.error}
                        </p>
                      )}
                    </>
                  )}
                </section>
              );
            })}
          </div>
          <details className="settings-section">
            <summary>API keys and service credentials</summary>
            <p className="caption">
              Optional model APIs, search, and dictation. Subscription requests
              use their own connection.
            </p>
            <form
              className="inline-actions"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await api("/api/keys/" + encodeURIComponent(keyId), "PUT", {
                    value: secret,
                  });
                  setSecret("");
                  setKeys(await api("/api/keys"));
                });
              }}
            >
              <select
                aria-label="Service"
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
              >
                <option value="">Choose service…</option>
                {[
                  ...(keys.providers ?? []),
                  ...(keys.keys ?? []).filter(
                    (k: any) =>
                      !keys.providers?.some((p: any) => p.envVar === k.id),
                  ),
                ].map((p: any) => (
                  <option key={p.envVar ?? p.id} value={p.envVar ?? p.id}>
                    {p.label ?? p.name ?? p.id}
                  </option>
                ))}
              </select>
              <input
                type="password"
                aria-label="API key"
                placeholder="Paste key"
                autoComplete="off"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
              <button disabled={!keyId || !secret} type="submit">
                Save key
              </button>
              <button
                type="button"
                disabled={!keyId}
                onClick={() =>
                  void run(() =>
                    api("/api/keys/" + encodeURIComponent(keyId), "DELETE"),
                  )
                }
              >
                Remove key
              </button>
            </form>
          </details>
          <CustomEndpoint refresh={onRefresh} notify={notify} />
        </>
      )}
      {tab === "Models" && (
        <section className="settings-section reading">
          <h2>A model for each kind of work.</h2>
          <p>
            Your connected account controls which models are available.
            Background work can use a separate model.
          </p>
          {["strong", "cheap", "vision"].map((slot) => (
            <label className="setting-row" key={slot}>
              <span>
                <strong>
                  {slot === "strong"
                    ? "Teaching and practice"
                    : slot === "cheap"
                      ? "Background learning work"
                      : "Images and visual material"}
                </strong>
                <small>
                  {slot === "strong"
                    ? "The starting model for new sessions."
                    : "Used when the corresponding task needs it."}
                </small>
              </span>
              <div className="model-choice-controls">
                <ModelPicker
                  label={slot + " model"}
                  models={
                    catalog.models?.filter(
                      (m: any) =>
                        slot !== "vision" || m.input?.includes("image"),
                    ) ?? []
                  }
                  value={settings.models?.[slot]?.model}
                  placeholder="Choose a model…"
                  onChange={(m) =>
                    void saveSection("models", {
                      ...(settings.models ?? {}),
                      [slot]: modelChoice(
                        settings.models?.[slot],
                        m,
                        catalog.models,
                      ),
                    })
                  }
                />
                <ThinkingChoice
                  label={slot + " thinking"}
                  value={settings.models?.[slot]?.thinkingLevel}
                  spec={settings.models?.[slot]?.model}
                  models={catalog.models}
                  onChange={(value) => {
                    const next = { ...settings.models?.[slot] };
                    if (value) next.thinkingLevel = value;
                    else delete next.thinkingLevel;
                    void saveSection("models", {
                      ...settings.models,
                      [slot]: next,
                    });
                  }}
                />
              </div>
            </label>
          ))}
          <h3>Background role overrides</h3>
          {[
            ["researcher", "Research"],
            ["demoBuilder", "Demonstrations"],
            ["visualMaker", "Visual explanations"],
            ["extractor", "Extraction"],
            ["auditor", "Knowledge audit"],
          ].map(([role, label]) => (
            <label key={role} className="setting-row">
              <span>{label}</span>
              <div className="model-choice-controls">
                <ModelPicker
                  label={label + " model"}
                  models={catalog.models}
                  value={settings.agent?.models?.[role]?.model}
                  placeholder="Use role’s default slot"
                  onChange={(m) => {
                    const models = { ...(settings.agent?.models ?? {}) };
                    const chosen = modelChoice(models[role], m, catalog.models);
                    if (chosen) models[role] = chosen;
                    else delete models[role];
                    void saveSection("agent", {
                      ...(settings.agent ?? {}),
                      models,
                    });
                  }}
                />
                <ThinkingChoice
                  label={label + " thinking"}
                  value={settings.agent?.models?.[role]?.thinkingLevel}
                  spec={catalog.rolePins?.[role]?.model}
                  models={catalog.models}
                  onChange={(value) => {
                    const models = { ...settings.agent?.models },
                      next = { ...models[role] };
                    if (value) next.thinkingLevel = value;
                    else delete next.thinkingLevel;
                    if (Object.keys(next).length) models[role] = next;
                    else delete models[role];
                    void saveSection("agent", { ...settings.agent, models });
                  }}
                />
              </div>
            </label>
          ))}
          <button onClick={() => void onRefresh()}>
            <RefreshCw size={15} />
            Refresh available models
          </button>
        </section>
      )}
      {tab === "Experience" && (
        <section className="settings-section reading">
          <h2>A comfortable place to think.</h2>
          <label className="setting-row">
            <span>Appearance</span>
            <select
              value={appearance.mode}
              onChange={(e) =>
                onAppearance({ ...appearance, mode: e.target.value })
              }
            >
              <option value="system">Follow macOS</option>
              <option value="dark">Moonforest</option>
              <option value="light">Dew</option>
            </select>
          </label>
          {[
            ["reduceMotion", "Reduce motion"],
            ["reduceTransparency", "Reduce transparency"],
          ].map(([key, label]) => (
            <label className="setting-row" key={key}>
              <span>{label}</span>
              <input
                type="checkbox"
                checked={appearance[key] ?? false}
                onChange={(e) =>
                  onAppearance({ ...appearance, [key]: e.target.checked })
                }
              />
            </label>
          ))}
          <h3>Learning tools</h3>
          <label className="setting-row">
            <span>Dictation language</span>
            <select
              aria-label="Dictation language"
              value={dictationPreference.language ?? "en"}
              disabled={
                dictationActive ||
                dictationPreference.saving ||
                dictationPreference.language === undefined
              }
              onChange={(e) =>
                void run(async () => {
                  if (
                    !(await dictationPreference.save(
                      e.target.value as DictationLanguage,
                    ))
                  )
                    throw new Error(
                      "Could not save dictation language. Try again.",
                    );
                })
              }
            >
              {DICTATION_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          {dictationPreference.error && (
            <p role="alert" className="inline-error">
              {dictationPreference.error}
              <button
                onClick={() => void run(() => dictationPreference.load(true))}
              >
                Retry language settings
              </button>
            </p>
          )}
          <label className="setting-row">
            <span>Reading text size</span>
            <input
              aria-label="Reading text size"
              type="number"
              min="12"
              max="24"
              value={settings.appearance?.proseFontSize ?? 15}
              onChange={(e) =>
                void saveSection("appearance", {
                  ...(settings.appearance ?? {}),
                  proseFontSize: Number(e.target.value),
                })
              }
            />
          </label>
          <details className="reading-style-settings">
            <summary>Reading style and colors</summary>
            <label className="setting-row">
              <span>Reading font</span>
              <input
                aria-label="Reading font"
                list="installed-reading-fonts"
                placeholder="macOS system font"
                defaultValue={settings.appearance?.fontFamily ?? ""}
                onBlur={(e) =>
                  void saveSection("appearance", {
                    ...settings.appearance,
                    fontFamily: e.target.value.trim() || null,
                  })
                }
              />
              <datalist id="installed-reading-fonts">
                {fonts.map((font) => (
                  <option key={font} value={font} />
                ))}
              </datalist>
            </label>
            <button
              onClick={() =>
                void run(async () => {
                  const query = (window as any).queryLocalFonts;
                  if (!query)
                    throw new Error(
                      "Font browsing is unavailable. Enter an installed font name instead.",
                    );
                  const values = await query();
                  setFonts(
                    [...new Set<string>(values.map((f: any) => f.family))].sort(
                      (a, b) => a.localeCompare(b),
                    ),
                  );
                })
              }
            >
              Browse installed fonts
            </button>
            <label className="setting-row">
              <span>Serif session titles</span>
              <input
                type="checkbox"
                checked={settings.appearance?.sessionNameSerif ?? false}
                onChange={(e) =>
                  void saveSection("appearance", {
                    ...settings.appearance,
                    sessionNameSerif: e.target.checked,
                  })
                }
              />
            </label>
            <label className="setting-row">
              <span>Heading weight</span>
              <input
                aria-label="Heading weight"
                type="number"
                min="100"
                max="900"
                step="100"
                value={settings.appearance?.mdRendering?.headingWeight ?? 600}
                onChange={(e) =>
                  void saveSection("appearance", {
                    ...settings.appearance,
                    mdRendering: {
                      ...settings.appearance?.mdRendering,
                      headingWeight: Number(e.target.value),
                    },
                  })
                }
              />
            </label>
            {[
              ["background", "Workspace background"],
              ["boldColor", "Bold text"],
              ["italicColor", "Italic text"],
            ].map(([key, label]) => (
              <label className="setting-row" key={key}>
                <span>{label}</span>
                <input
                  aria-label={label}
                  type="color"
                  value={
                    (key === "background"
                      ? settings.appearance?.background
                      : settings.appearance?.mdRendering?.[key]) ??
                    getComputedStyle(document.documentElement)
                      .getPropertyValue(
                        key === "background" ? "--canvas" : "--ink",
                      )
                      .trim()
                  }
                  onChange={(e) =>
                    void saveSection(
                      "appearance",
                      key === "background"
                        ? { ...settings.appearance, background: e.target.value }
                        : {
                            ...settings.appearance,
                            mdRendering: {
                              ...settings.appearance?.mdRendering,
                              [key]: e.target.value,
                            },
                          },
                    )
                  }
                />
              </label>
            ))}
            <button
              onClick={() =>
                void saveSection("appearance", {
                  ...settings.appearance,
                  fontFamily: null,
                  background: null,
                  sessionNameSerif: false,
                  mdRendering: {
                    headingWeight: 600,
                    boldColor: null,
                    italicColor: null,
                  },
                })
              }
            >
              Reset reading style
            </button>
          </details>
          <h3>Keyboard shortcuts</h3>
          <p className="caption">
            Tab and Shift Tab follow standard focus order. Click a shortcut and
            press its replacement; Backspace disables it. macOS menu shortcuts
            are reserved.
          </p>
          {SHORTCUTS.map((s) => (
            <label className="setting-row" key={s.id}>
              <span>{s.label}</span>
              <input
                className="shortcut-input"
                aria-label={s.label + " shortcut"}
                readOnly
                value={bindingFor(s.id, shortcuts)
                  .replaceAll("mod+", "⌘ ")
                  .replaceAll("shift+", "⇧ ")
                  .replaceAll("alt+", "⌥ ")}
                onKeyDown={(e) => {
                  if (e.key === "Tab") return;
                  e.preventDefault();
                  const value =
                      e.key === "Backspace" ? "" : eventBinding(e.nativeEvent),
                    error = validateBinding(s.id, value, shortcuts);
                  if (error) {
                    notify(error);
                    return;
                  }
                  void run(() =>
                    api("/coqui/shortcuts", "PUT", {
                      ...shortcuts,
                      [s.id]: value,
                    }),
                  );
                }}
              />
            </label>
          ))}
          <button
            onClick={() => void run(() => api("/coqui/shortcuts", "PUT", {}))}
          >
            Reset shortcuts
          </button>
          {["research", "demo", "visual", "pdf"].map((key) => (
            <label className="setting-row" key={key}>
              <span>
                {
                  (
                    {
                      research: "Source research",
                      demo: "Interactive demonstrations",
                      visual: "Visual explanations",
                      pdf: "PDF reader",
                    } as any
                  )[key]
                }
              </span>
              <input
                type="checkbox"
                checked={settings?.agent?.tools?.[key] !== false}
                onChange={(e) =>
                  void saveSection("agent", {
                    ...(settings.agent ?? {}),
                    tools: {
                      ...(settings.agent?.tools ?? {}),
                      [key]: e.target.checked,
                    },
                  })
                }
              />
            </label>
          ))}
          <label className="setting-row">
            <span>Search service preference</span>
            <select
              aria-label="Search service preference"
              value={settings.agent?.search?.engine ?? ""}
              onChange={(e) =>
                void saveSection("agent", {
                  ...(settings.agent ?? {}),
                  search: e.target.value ? { engine: e.target.value } : {},
                })
              }
            >
              <option value="">Automatically use a connected service</option>
              <option value="tavily">Tavily</option>
              <option value="brave">Brave</option>
            </select>
          </label>
          <label className="setting-row">
            <span>Compaction threshold (tokens)</span>
            <input
              type="number"
              min="32000"
              value={settings.compaction?.thresholdTokens ?? 150000}
              onChange={(e) =>
                void saveSection("compaction", {
                  thresholdTokens: Number(e.target.value),
                })
              }
            />
          </label>
          <label className="setting-row">
            <span>Extract knowledge from lessons</span>
            <input
              type="checkbox"
              checked={settings.graph?.enabled !== false}
              onChange={(e) =>
                void saveSection("graph", {
                  ...(settings.graph ?? {}),
                  enabled: e.target.checked,
                })
              }
            />
          </label>
          <label className="setting-row">
            <span>Extraction chunk budget (tokens)</span>
            <input
              type="number"
              min="500"
              value={settings.graph?.extractionChunkTokens ?? 4096}
              onChange={(e) =>
                void saveSection("graph", {
                  ...(settings.graph ?? {}),
                  extractionChunkTokens: Number(e.target.value),
                })
              }
            />
          </label>
          <h3>Advanced preferences</h3>
          <p className="caption">
            Edit a supported settings section. Changes are validated before
            saving.
          </p>
          <div className="inline-actions">
            <select
              aria-label="Settings section"
              onChange={(e) =>
                setEditor({
                  section: e.target.value,
                  text: JSON.stringify(
                    settings?.[e.target.value] ?? {},
                    null,
                    2,
                  ),
                })
              }
            >
              <option value="">Choose section…</option>
              {["appearance", "graph", "agent", "general"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          {editor && (
            <>
              <textarea
                className="code-editor"
                aria-label="Settings JSON"
                value={editor.text}
                onChange={(e) => setEditor({ ...editor, text: e.target.value })}
              />
              <button
                onClick={() =>
                  void saveSection(editor.section, JSON.parse(editor.text))
                }
              >
                Save preferences
              </button>
            </>
          )}
        </section>
      )}
      {tab === "Prompts" && (
        <section className="settings-section reading">
          <h2>Inspect and tune the teaching.</h2>
          <p>
            Source prompts remain recoverable. Overrides apply to future turns.
          </p>
          {prompts.map((p: any) => (
            <details
              key={p.path + Boolean(p.overrideText) + p.enabled}
              className="prompt-editor"
            >
              <summary>{p.path ?? p.name}</summary>
              <textarea
                defaultValue={p.overrideText ?? p.sourceText}
                aria-label={p.path}
                onChange={(e) =>
                  setEditor({ path: p.path, text: e.target.value })
                }
              />
              <div className="inline-actions">
                <label className="toggle">
                  <input
                    type="checkbox"
                    aria-label={"Enable " + p.path}
                    checked={settings.agent?.prompts?.[p.path] === true}
                    disabled={p.overrideText === null}
                    onChange={(e) =>
                      void saveSection("agent", {
                        ...(settings.agent ?? {}),
                        prompts: {
                          ...(settings.agent?.prompts ?? {}),
                          [p.path]: e.target.checked,
                        },
                      })
                    }
                  />
                  Use override
                </label>
                <button
                  onClick={() =>
                    void run(() =>
                      api(
                        "/api/settings/prompts/" + encodeURIComponent(p.path),
                        "PUT",
                        {
                          text:
                            editor?.path === p.path
                              ? editor.text
                              : (p.overrideText ?? p.sourceText),
                        },
                      ),
                    )
                  }
                >
                  Save override
                </button>
                <button
                  onClick={() =>
                    void run(() =>
                      api(
                        "/api/settings/prompts/" + encodeURIComponent(p.path),
                        "DELETE",
                      ),
                    )
                  }
                >
                  Reset to source
                </button>
              </div>
            </details>
          ))}
        </section>
      )}
      {tab === "Data" && (
        <section className="settings-section reading">
          <ShieldCheck size={30} strokeWidth={1.3} />
          <h2>Your learning belongs to you.</h2>
          <p>
            Sessions, reasoning, materials, and review history stay in your
            local library. Provider credentials are stored separately.
          </p>
          <div className="inline-actions">
            <button
              onClick={() =>
                void run(async () => {
                  const r = await host("backup.save");
                  if (r.saved) notify("Backup saved and ready to restore.");
                })
              }
            >
              <Download size={16} />
              Export backup
            </button>
            <button onClick={() => void run(() => host("backup.restore"))}>
              <Upload size={16} />
              Restore backup
            </button>
          </div>
          <h3>Recently deleted</h3>
          <p className="caption">
            Restore deleted sessions and ideas, including after restarting
            CoquiLearn. Other deletions and newer edits stay intact.
          </p>
          {deletions.items.length ? (
            deletions.items.map((entry) => (
              <div className="setting-row" key={entry.id}>
                <span>
                  {entry.title}
                  <small className="caption">
                    {new Date(entry.createdAt).toLocaleString()} ·{" "}
                    {entry.concepts} ideas
                  </small>
                </span>
                <button
                  aria-label={"Restore " + entry.title}
                  onClick={() =>
                    void run(async () => {
                      await api("/coqui/undo", "POST", { id: entry.id });
                      notify("Deleted learning restored.");
                    })
                  }
                >
                  Restore
                </button>
              </div>
            ))
          ) : (
            <p className="caption">No deleted learning to restore.</p>
          )}
          {deletions.hasMore && (
            <button
              onClick={() =>
                void api("/coqui/undo?offset=" + deletions.nextOffset)
                  .then((next) =>
                    setDeletions((previous) => ({
                      ...next,
                      items: [...previous.items, ...next.items],
                    })),
                  )
                  .catch((e) => notify(e.message))
              }
            >
              Show older deletions
            </button>
          )}
          <h3>Application updates</h3>
          <p>New versions are downloaded and installed manually.</p>
          <button
            onClick={() =>
              void run(async () => {
                const r = await host("updates");
                if (r.available) await host("open", { url: r.url });
                else notify("There is no newer published CoquiLearn release.");
              })
            }
          >
            Check for updates <ArrowUpRight size={14} />
          </button>
        </section>
      )}
    </div>
  );
}

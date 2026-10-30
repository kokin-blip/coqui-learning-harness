import { applyBackground } from "./appearance.ts";
import {
  ChatGPTPlanBadge,
  ChatGPTPlanConfirmation,
} from "./components/ChatGPTPlan.tsx";
import {
  PlanDiagram,
  PlanFocus,
  PlanSnapshot,
} from "./components/LearningPlan.tsx";
import { SessionHistory } from "./components/SessionHistory.tsx";
import { Dialog } from "./components/Dialog.tsx";
import { ImportWorkbench } from "./components/ImportWorkbench.tsx";
import { SourceViewer } from "./components/SourceViewer.tsx";
import type {
  ImportItem,
  ImportPickedFile,
  ImportPreview,
} from "../../../packages/contracts/index.ts";
import { EventCursor, DesktopRequestError } from "./operation-recovery.ts";
import { BackgroundWork, JobDispatch } from "./components/BackgroundWork.tsx";
import type { JobRecord } from "../../../packages/engine/src/core/contracts/jobs.ts";
import { PracticeMetadata } from "./components/PracticeMetadata.tsx";
import { SessionUsage } from "./components/UsageDetails.tsx";
import { AnswerFeedback } from "./components/AnswerFeedback.tsx";
import { dismissedAnswer } from "../../../packages/engine/src/core/question-core.ts";
import { PathInput } from "../../../packages/engine/components/path-input.tsx";
import { useTranscriptFind } from "./components/useTranscriptFind.ts";
import { ModelPicker } from "./components/ModelPicker.tsx";
import { EvidenceHistory } from "./components/EvidenceHistory.tsx";
import { SessionModel } from "../../../packages/engine/components/session-core.ts";
import {
  danglingQuestionOf,
  activeProblemOf,
} from "../../../packages/engine/src/core/native-messages.ts";
import { sessionFetch } from "./session-transport.ts";
import { Artifact } from "./components/Artifact.tsx";
import {
  useDictation,
  finishDictation,
  appendToPrimaryInput,
} from "./components/dictation.tsx";
import {
  Fragment,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { phaseTimeline } from "../../../packages/engine/src/core/phases.ts";
import { ProbeAssessment } from "./components/ProbeAssessment.tsx";
import { notifySettingsSaved } from "./components/settings-signal.ts";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Settings as SettingsIcon,
  BookOpen,
  Network,
  Library,
  RotateCcw,
  ShieldCheck,
  ArrowUpRight,
  ArrowRight,
  Mic,
  Paperclip,
  Check,
  X,
  Menu,
  SunMoon,
  LoaderCircle,
  Upload,
  Download,
  Trash2,
  ChevronDown,
  Square,
  SlidersHorizontal,
} from "lucide-react";
import {
  quoteFilePath,
  parseFilePaths,
  filePathLabel,
} from "../../../packages/engine/src/core/file-paths.ts";
import { api, host, connectionStatus } from "./api.ts";
import { Question } from "./components/Question.tsx";
import { RichText } from "./components/RichText.tsx";
import { KnowledgeMap } from "./components/KnowledgeMap.tsx";
import { Settings } from "./components/Settings.tsx";
import {
  derivePlanStatusesLh,
  derivedNodeStatus,
} from "../../../packages/engine/src/core/contracts/plan.ts";
import { SHORTCUTS, bindingFor, eventBinding } from "./shortcuts.ts";
const spring = {
  type: "spring" as const,
  stiffness: 180,
  damping: 28,
  mass: 1,
};
const names: Record<string, string> = {
  map: "Map",
  learn: "Learn",
  practice: "Practice",
  review: "Review",
  library: "Library",
  settings: "Settings",
};
const asset = (name: string) =>
  new URL("assets/" + name, document.baseURI).href;
const logo = asset("3-139-34dbe.svg");
function IconAsset({ file, size = 20 }: { file: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="asset-icon"
      style={{
        width: size,
        height: size,
        maskImage: `url(${asset(file)})`,
        WebkitMaskImage: `url(${asset(file)})`,
      }}
    />
  );
}
function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children?: any;
  action?: any;
}) {
  return (
    <div className="empty-state">
      <BookOpen size={36} strokeWidth={1.2} />
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function App() {
  const [view, setView] = useState("map"),
    [chats, setChats] = useState<any[]>([]),
    [session, setSession] = useState<any>(null),
    [graph, setGraph] = useState<any>({
      nodes: [],
      propositions: [],
      chains: [],
      edges: [],
    }),
    [state, setState] = useState<any>({
      library: [],
      review: [],
      evidence: [],
    }),
    [settings, setSettings] = useState<any>({}),
    [catalog, setCatalog] = useState<any>({ models: [] }),
    [connections, setConnections] = useState<
      import("../../../packages/contracts/index.ts").ConnectionStatus
    >({}),
    [environment, setEnvironment] = useState<any>({}),
    [appearance, setAppearance] = useState<any>({
      mode: "system",
      reduceMotion: false,
      reduceTransparency: false,
    }),
    [goal, setGoalState] = useState(""),
    [kind, setKind] = useState("teach"),
    [selected, setSelected] = useState<any>(null),
    [picks, setPicks] = useState<any[]>([]),
    [pickingContext, setPickingContext] = useState(false),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [stream, setStream] = useState(""),
    [activity, setActivity] = useState<any[]>([]),
    [jobs, setJobs] = useState<JobRecord[]>([]),
    [search, setSearch] = useState(""),
    [showSearch, setShowSearch] = useState(false),
    [results, setResults] = useState<any[]>([]),
    [sidebar, setSidebar] = useState(
      () =>
        innerWidth >= 1100 &&
        localStorage.getItem("coqui.sidebar-open") !== "false",
    ),
    [shortcutHelp, setShortcutHelp] = useState(false),
    [planOpen, setPlanOpen] = useState(false),
    [deleteNodes, setDeleteNodes] = useState<string[]>([]),
    [inspectorOpen, setInspectorOpen] = useState(() => innerWidth >= 1260),
    [dockExpanded, setDockExpanded] = useState(true),
    [imports, setImports] = useState<ImportItem[]>([]),
    [files, setFiles] = useState<ImportPickedFile[]>([]),
    [sourceViewer, setSourceViewer] = useState<{
      source: ImportPreview;
      saved: boolean;
    } | null>(null),
    [reveal, setReveal] = useState(false),
    [reviewIndex, setReviewIndex] = useState(0),
    [find, setFind] = useState(""),
    [menu, setMenu] = useState(false),
    [undo, setUndo] = useState<string | null>(null),
    [reviewText, setReviewText] = useState(""),
    [deleteMode, setDeleteMode] = useState("preserve-graph");
  const eventCursor = useRef(new EventCursor());
  const goalDirty = useRef(false);
  const [draftLoaded, setDraftLoaded] = useState("");
  function setGoal(value: React.SetStateAction<string>) {
    goalDirty.current = true;
    setGoalState(value);
  }
  const dictation = useDictation({
    append: (text) =>
      setGoal((previous) => {
        const next = previous + (previous ? " " : "") + text;
        goalRef.current = next;
        return next;
      }),
  });
  const manualDock = useRef(false);
  const transcriptScroll = useRef<HTMLDivElement>(null),
    readingAway = useRef(false);
  const sessionModel = useRef<SessionModel | null>(null);
  const current = useRef<any>(null);
  current.current = session;
  const refreshTimer = useRef<any>(null),
    composer = useRef<any>(null);
  const prefersMotion = useReducedMotion();
  const notify = (text: string) => setNotice(text);
  useEffect(() => {
    if (view !== "map") setPickingContext(false);
  }, [view]);
  const refreshConnections = useCallback(async () => {
    try {
      setConnections(await connectionStatus());
      setCatalog(await api("/api/models"));
    } catch (e) {
      notify((e as Error).message);
    }
  }, []);
  const refresh = useCallback(async () => {
    try {
      const [c, g, s, p, a] = await Promise.all([
        api("/api/chats"),
        api("/api/graph"),
        api("/coqui/state"),
        api("/api/settings"),
        api("/api/activity"),
      ]);
      setChats(c.chats ?? []);
      setGraph(g);
      setState(s);
      setSettings({
        ...p.settings,
        claudeCode: {
          ...p.settings?.claudeCode,
          allowBackgroundUse: s.backgroundPolicy?.["claude-code"] !== false,
        },
      });
      setActivity([
        ...(a.jobs ?? []),
        ...(a.extractions ?? []).map((e: any) => ({
          ...e,
          kind: "extraction",
          status: "running",
        })),
      ]);
      setAppearance(s.appearance);
      if (current.current) {
        try {
          const id = current.current.id;
          const [r, j] = await Promise.all([
            api("/api/chats/" + id),
            api("/api/jobs?chatId=" + id),
          ]);
          if (current.current?.id === id) setJobs(j.jobs ?? []);
          if (current.current?.id !== r.id) return;
          const model = sessionModel.current;
          if (model && model.chatId === r.id) {
            model.adoptRecord(r.messages);
            if (
              r.turnInFlight &&
              !["submitted", "streaming"].includes(model.getState().status)
            )
              void model.resumeStream();
            else if (!r.turnError) void model.continueIfOwed(r.messages);
            const state = model.getState();
            setSession({
              ...r,
              view: state.messages,
              messages: state.nativeMessages,
              pending: danglingQuestionOf(state.nativeMessages),
              problem: activeProblemOf(state.nativeMessages),
              turnError: state.error ?? r.turnError,
            });
          } else setSession(r);
        } catch (error) {
          if (error instanceof DesktopRequestError && error.status === 404)
            setSession(null);
          else notify((error as Error).message);
        }
      }
    } catch (e) {
      notify((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh();
    void refreshConnections();
    void host("environment").then(setEnvironment);

    const unsub = window.coqui.subscribe((event) => {
      const tracking = eventCursor.current.observe(event);
      if (tracking.stale) return;
      if (event.type === "service-ready") notifySettingsSaved("dictation");
      if (tracking.resync) {
        void refresh();
        void refreshConnections();
      }
      if (event.type === "connections-changed") {
        void refreshConnections();
        return;
      }
      if (event.type === "appearance-system") {
        setEnvironment((e: any) => ({ ...e, ...event.data }));
        return;
      }
      if (event.type === "zoom-changed") {
        setEnvironment((e: any) => ({ ...e, zoom: event.data.factor }));
        return;
      }
      if (event.type === "navigate") {
        if (event.data.view === "import") {
          void run(importPick);
          return;
        }
        if (event.data.view === "new") {
          setSession(null);
          setView("learn");
          setTimeout(() => composer.current?.focus(), 0);
        } else setView(event.data.view);
        return;
      }
      if (event.type === "host-error") {
        notify(event.data.error);
        return;
      }
      if (event.type === "service-ready") {
        void refresh();
        return;
      }
      if (event.type === "service-error") {
        notify(event.data.error);
        setBusy(false);
        return;
      }
      if (event.type === "stream" || event.type === "stream-end") return;
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => void refresh(), 90);
    });
    return () => {
      unsub();
      clearTimeout(refreshTimer.current);
    };
  }, [refresh, refreshConnections]);
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const id = setTimeout(
      () =>
        void api("/coqui/search?q=" + encodeURIComponent(search)).then((r) =>
          setResults(r.results),
        ),
      140,
    );
    return () => clearTimeout(id);
  }, [search]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      if (e.key === "Escape") {
        if (showSearch) setShowSearch(false);
        else if (menu) setMenu(false);
        else if (dictation.active) dictation.cancel();
        else if (selected) setSelected(null);
        else if (busy) sessionModel.current?.stop();
        else if (session?.pending || session?.problem) void run(dismissCurrent);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [
    session,
    showSearch,
    menu,
    dictation.active,
    dictation.cancel,
    selected,
    busy,
  ]);
  useEffect(() => {
    if (dictation.error) setNotice(dictation.error);
  }, [dictation.error]);
  const dark =
      appearance.mode === "dark" ||
      (appearance.mode === "system" && environment.dark),
    reduced = !!(
      appearance.reduceMotion ||
      environment.reduceMotion ||
      prefersMotion
    );
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.setProperty(
      "--app-zoom",
      String(environment.zoom ?? 1),
    );
    document.documentElement.dataset.transparency =
      appearance.reduceTransparency || environment.reduceTransparency
        ? "reduced"
        : "full";
  }, [
    dark,
    appearance.reduceTransparency,
    environment.reduceTransparency,
    environment.zoom,
  ]);
  useEffect(() => {
    const a = settings.appearance ?? {},
      root = document.documentElement;
    root.style.setProperty("--prose-size", (a.proseFontSize ?? 15) + "px");
    root.style.setProperty(
      "--prose-font",
      a.fontFamily
        ? JSON.stringify(a.fontFamily) + ", -apple-system, sans-serif"
        : "-apple-system, BlinkMacSystemFont, sans-serif",
    );
    root.style.setProperty(
      "--session-title-font",
      a.sessionNameSerif ? "Georgia, serif" : "inherit",
    );
    root.style.setProperty(
      "--heading-weight",
      String(a.mdRendering?.headingWeight ?? 600),
    );
    root.style.setProperty(
      "--bold-color",
      a.mdRendering?.boldColor ?? "inherit",
    );
    root.style.setProperty(
      "--italic-color",
      a.mdRendering?.italicColor ?? "inherit",
    );
    applyBackground(root, a.background);
  }, [settings.appearance]);
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? "reduced" : "full";
  }, [reduced]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const action = SHORTCUTS.find(
        (s) => bindingFor(s.id, state.shortcuts) === eventBinding(e),
      )?.id;
      if (!action) return;
      if (
        action === "help" &&
        (e.target as HTMLElement)?.closest(
          'input,textarea,[contenteditable="true"]',
        )
      )
        return;
      e.preventDefault();
      if (action === "search") setShowSearch(true);
      if (action === "map") setView("map");
      if (action === "model")
        document
          .querySelector<HTMLButtonElement>(
            session && ["learn", "practice"].includes(view)
              ? ".composer-model-control .model-picker-trigger"
              : ".home-composer .model-picker-trigger",
          )
          ?.click();
      if (action === "sessions") {
        setSidebar(true);
        setTimeout(
          () => window.dispatchEvent(new Event("coqui:session-search")),
          0,
        );
      }
      if (
        action === "rename" &&
        session &&
        ["learn", "practice"].includes(view)
      ) {
        setMenu(true);
        setTimeout(() => document.getElementById("session-title")?.focus(), 0);
      }
      if (action === "userThinking") {
        const blocks = [
          ...document.querySelectorAll<HTMLDetailsElement>(
            "details[data-user-thinking]",
          ),
        ];
        const open = blocks.some((b) => !b.open);
        blocks.forEach((b) => (b.open = open));
      }
      if (action === "help") setShortcutHelp(true);
      if (action === "sidebar") setSidebar((v) => !v);
      if (action === "dictation") dictation.toggle();
      if (action === "submit")
        document
          .querySelector<HTMLButtonElement>(
            ".question .answer-actions .primary",
          )
          ?.click();
      if (action === "find" && view === "map") {
        document
          .querySelector<HTMLInputElement>(
            'input[aria-label="Search propositions"]',
          )
          ?.focus();
      } else if (
        action === "find" &&
        session &&
        ["learn", "practice"].includes(view)
      ) {
        setMenu(true);
        setTimeout(
          () => document.getElementById("transcript-find")?.focus(),
          0,
        );
      }
      if (action === "thinking") {
        const activeSession = ["learn", "practice"].includes(view)
          ? session
          : null;
        const spec = activeSession?.settings?.model ?? catalog.defaults?.model;
        const levels =
          catalog.models.find(
            (m: any) => m.provider === spec?.provider && m.id === spec?.id,
          )?.supportedLevels ?? [];
        if (!levels.length) {
          notify("This model uses its provider’s default thinking behavior.");
          return;
        }
        const current = activeSession
          ? activeSession.settings?.thinkingLevel
          : settings.models?.strong?.thinkingLevel;
        const thinkingLevel =
          levels[(levels.indexOf(current) + 1) % levels.length];
        void run(async () => {
          if (activeSession)
            await api("/api/chats/" + activeSession.id + "/settings", "PUT", {
              ...activeSession.settings,
              thinkingLevel,
            });
          else
            await api("/api/settings/models", "PUT", {
              ...settings.models,
              strong: { ...settings.models?.strong, thinkingLevel },
            });
          await refresh();
        });
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [state.shortcuts, session, dictation, catalog, settings, view]);
  useEffect(() => {
    if (innerWidth >= 1100)
      localStorage.setItem("coqui.sidebar-open", String(sidebar));
  }, [sidebar]);
  const changeAppearance = (a: any) => {
    setAppearance(a);
    void api("/coqui/appearance", "PUT", a);
  };
  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      setBusy(false);
      notify((e as Error).message);
    }
  };
  const goalRef = useRef(goal);
  const starting = useRef(false);
  goalRef.current = goal;
  const draftKey =
    session && ["learn", "practice"].includes(view)
      ? "composer:" + session.id
      : "home";
  const draftReady = useRef<string | null>(null);
  useEffect(() => {
    draftReady.current = null;
    goalDirty.current = false;
    setDraftLoaded("");
    let active = true;
    void api("/coqui/draft?id=" + encodeURIComponent(draftKey)).then((d) => {
      if (active) {
        if (!goalDirty.current) setGoalState(d.text ?? "");
        draftReady.current = draftKey;
        setDraftLoaded(draftKey);
      }
    });
    return () => {
      active = false;
    };
  }, [draftKey]);
  useEffect(() => {
    if (draftReady.current === draftKey)
      void api("/coqui/draft?id=" + encodeURIComponent(draftKey), "PUT", {
        text: goal,
      });
  }, [goal, draftKey, draftLoaded]);
  async function openSession(id: string, anchor?: string) {
    if (id.startsWith("src_")) {
      setView("library");
      const source = graph.fileSources?.[id];
      const asset = state.library?.find((f: any) => source?.includes(f.digest));
      if (asset) setSourceViewer({ source: asset, saved: true });
      else
        notify(
          source
            ? "Source: " + decodeURIComponent(source.split("/").at(-1))
            : "This source is preserved in your library.",
        );
      return;
    }
    if (innerWidth < 1100) setSidebar(false);
    setStream("");
    const [r, j] = await Promise.all([
      api("/api/chats/" + id),
      api("/api/jobs?chatId=" + id),
    ]);
    setJobs(j.jobs ?? []);
    if (sessionModel.current?.chatId !== id) {
      const model = new SessionModel({
        chatId: id,
        initialMessages: r.messages,
        initialError: r.turnError ?? undefined,
        fetch: sessionFetch,
        onReattachSettled: () => void refresh(),
      });
      model.onChange = () => {
        if (sessionModel.current !== model || current.current?.id !== id)
          return;
        const next = model.getState();
        setBusy(next.status === "submitted" || next.status === "streaming");
        setSession((previous: any) =>
          previous?.id === id
            ? {
                ...previous,
                messages: next.nativeMessages,
                view: next.messages,
                pending: danglingQuestionOf(next.nativeMessages),
                problem: activeProblemOf(next.nativeMessages),
                turnError: next.error,
              }
            : previous,
        );
      };
      sessionModel.current = model;
    } else sessionModel.current.adoptRecord(r.messages);
    current.current = r;
    setSession(r);
    setBusy(!!r.turnInFlight);
    setFind("");
    setView(r.kind === "practice" ? "practice" : "learn");
    if (anchor)
      setTimeout(
        () =>
          document.getElementById(anchor)?.scrollIntoView({ block: "center" }),
        100,
      );
    if (r.turnInFlight) {
      setBusy(true);
      void sessionModel.current?.resumeStream();
    } else if (!r.turnError)
      void sessionModel.current?.continueIfOwed(r.messages);
  }
  async function sendInput(input: any, id = session?.id) {
    if (current.current?.id === id && current.current.compacting)
      throw new Error(
        "Context is being summarized. Your draft is saved; send it when summarization finishes.",
      );
    if (!id) return;
    await finishDictation();
    const model = sessionModel.current;
    if (!model || model.chatId !== id)
      throw new Error("Reopen this session to continue.");
    if (
      input.type === "text" &&
      ["submitted", "streaming"].includes(model.getState().status)
    ) {
      await model.steer(input.text);
      return;
    }
    const accepted = await model.send(input);
    if (!accepted && model.getState().error)
      throw new Error(model.getState().error!.message);
    await refresh();
  }
  async function dismissCurrent() {
    const record = current.current,
      model = sessionModel.current;
    if (!record || !model) return;
    if (record.pending) {
      const p = record.pending,
        kind = ["quiz", "probe"].includes(p.tool)
          ? "quiz"
          : ["recall", "explain"].includes(p.tool)
            ? "explain"
            : "ask";
      await model.dismissQuestion(
        p.toolCallId,
        dismissedAnswer(kind, p.input.question),
      );
    } else if (record.problem)
      await model.dismissProblem(record.problem.toolCallId);
    await refresh();
  }
  async function start() {
    if (starting.current) return;
    starting.current = true;
    try {
      await finishDictation();
      const text = goalRef.current;
      if (!text.trim()) return;
      if (picks.length > 64) {
        return;
      }
      await api("/coqui/draft?id=home", "PUT", { text });
      if (!environment.fixture && !state.fixture) {
        const next = await api("/api/models");
        setCatalog(next);
        const missing = ["strong", "cheap", "vision"].filter(
          (slot) => !next.slots?.[slot],
        );
        const model = next.defaults?.model;
        if (
          missing.length ||
          !model ||
          !next.models.some(
            (m: any) => m.provider === model.provider && m.id === model.id,
          )
        ) {
          setView("settings");
          notify(
            missing.length
              ? "Choose your " +
                  missing.join(", ") +
                  " model slots to continue. Your goal is saved."
              : "Choose an available teaching model to continue. Your goal is saved.",
          );
          return;
        }
      }
      setBusy(true);
      const r = await api("/api/chats", "POST", {
        title: text,
        kind: kind === "practice" ? "practice" : undefined,
        graphContext:
          picks.length || selected
            ? {
                propositions: (picks.length ? picks : [selected]).map(
                  (n: any) => ({
                    id: n.id,
                    name: n.name,
                    statement: n.statement,
                  }),
                ),
              }
            : undefined,
      });
      await api("/coqui/draft?id=composer:" + r.id, "PUT", { text });
      await openSession(r.id);
      await sendInput({ type: "text", text }, r.id);
      setGoal("");
      await api("/coqui/draft?id=composer:" + r.id, "PUT", { text: "" });
      await api("/coqui/draft?id=home", "PUT", { text: "" });
    } finally {
      starting.current = false;
    }
  }
  async function sendComposer(input: any) {
    await finishDictation();
    await sendInput({ ...input, text: goalRef.current });
    setGoal("");
  }
  async function attachFiles() {
    const paths = await host("file.pick");
    await referencePaths(paths);
  }
  async function referencePaths(paths: string[]) {
    const result = await host("file.validate", { paths });
    if (result.paths.length)
      appendToPrimaryInput(result.paths.map(quoteFilePath).join(" "));
    if (result.errors.length)
      notify(
        result.errors
          .map(
            (e: { name: string; reason: string }) => e.name + ": " + e.reason,
          )
          .join(" · "),
      );
  }
  const fileChips = parseFilePaths(goal).filter((p) => p.kind === "path");
  function fileKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (
      e.key === "Backspace" &&
      e.currentTarget.selectionStart === e.currentTarget.selectionEnd
    ) {
      const at = e.currentTarget.selectionStart,
        part = fileChips.find((p) => p.end === at);
      if (part) {
        e.preventDefault();
        setGoal(goal.slice(0, part.start) + goal.slice(part.end));
      }
    }
  }
  const updateImport = (id: string, patch: Partial<ImportItem>) =>
    setImports((old) => old.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  async function previewFile(file: ImportPickedFile) {
    updateImport(file.id, { phase: "processing", error: undefined });
    try {
      if (file.error || !file.base64)
        throw new Error(file.error ?? "Choose this file again.");
      const [result] = await api("/coqui/import/preview", "POST", {
        files: [file],
      });
      updateImport(file.id, {
        ...result,
        id: file.id,
        selected: result.status === "ready" && !result.duplicate,
        phase: result.status === "ready" ? "ready" : "error",
      });
    } catch (error) {
      updateImport(file.id, {
        phase: "error",
        selected: false,
        error: (error as Error).message,
      });
    }
  }
  async function importPick() {
    const picked: ImportPickedFile[] = await host("import.pick");
    if (!picked.length) return;
    setFiles((old) => [...old, ...picked]);
    setImports((old) => [
      ...old,
      ...picked.map((f) => ({
        id: f.id,
        name: f.name,
        status: "ready" as const,
        phase: "processing" as const,
        selected: false,
      })),
    ]);
    setView("library");
    for (const file of picked) await previewFile(file);
  }
  async function retryImport(id: string) {
    const file: ImportPickedFile = await host("import.retry", { id });
    setFiles((old) => old.map((f) => (f.id === id ? file : f)));
    await previewFile(file);
  }
  async function commitImports() {
    for (const item of imports.filter(
      (i) => i.selected && i.phase === "ready",
    )) {
      updateImport(item.id, { phase: "saving" });
      try {
        const file = files.find((f) => f.id === item.id);
        if (!file?.base64) throw new Error("Choose this file again.");
        await api("/coqui/import/commit", "POST", {
          item,
          base64: file.base64,
        });
        updateImport(item.id, {
          phase: "saved",
          selected: false,
          error: undefined,
        });
      } catch (error) {
        updateImport(item.id, {
          phase: "error",
          selected: false,
          error: (error as Error).message,
        });
      }
    }
    await refresh();
  }
  async function removeSession() {
    if (!session) return;
    const r = await api(
      "/api/chats/" + session.id + "?mode=" + deleteMode,
      "DELETE",
    );
    setUndo(r.undoId);
    setSession(null);
    setBusy(false);
    setView("map");
    setMenu(false);
    await refresh();
  }
  const pending = session?.pending;
  const plan = session?.tree;
  let statuses: any = {};
  try {
    if (plan) statuses = derivePlanStatusesLh(plan, session.messages ?? []);
  } catch {}
  const due = (state.review ?? []).filter(
    (c: any) => new Date(c.due) <= new Date(),
  );
  const review = due[reviewIndex % due.length];
  const nav = [
    { id: "map", icon: "3-139-61601.svg" },
    { id: "learn", icon: "3-139-c8519.svg" },
    { id: "review", icon: "3-139-d66a0.svg" },
    { id: "library", icon: "3-139-544be.svg" },
  ];
  useEffect(() => {
    setDockExpanded(true);
    manualDock.current = false;
    readingAway.current = false;
  }, [session?.id, session?.pending?.toolCallId, session?.problem?.toolCallId]);
  useEffect(() => {
    if (!readingAway.current && transcriptScroll.current)
      transcriptScroll.current.scrollTop =
        transcriptScroll.current.scrollHeight;
  }, [session?.view, dockExpanded]);
  useEffect(() => {
    let wide = innerWidth >= 1260,
      side = innerWidth >= 1100;
    const resize = () => {
      const next = innerWidth >= 1260,
        nextSide = innerWidth >= 1100;
      if (wide !== next) {
        wide = next;
        setInspectorOpen(next);
      }
      if (side !== nextSide) {
        side = nextSide;
        setSidebar(nextSide);
      }
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const views = session?.view ?? [];
  const phaseMarks = useMemo(() => {
    const entries = views.flatMap((m: any) =>
      m.parts.map((p: any, i: number) => ({ key: m.id + ":" + i, part: p })),
    );
    const timeline = phaseTimeline(
      entries.map((e: any) => ({ parts: [e.part] })),
    );
    const marks = new Map<string, string>();
    if (session?.kind === "practice") return marks;
    entries.forEach((entry: any, i: number) => {
      if (i === 0 || timeline[i] !== timeline[i - 1])
        marks.set(
          entry.key,
          {
            probe: "Exploring your starting point",
            plan: "Planning your learning path",
            teach: "Teaching",
          }[timeline[i]!],
        );
    });
    return marks;
  }, [views, session?.kind]);
  const transcriptFind = useTranscriptFind(find, session?.view);
  return (
    <MotionConfig reducedMotion={reduced ? "always" : "never"}>
      <div
        className={"app-shell " + (sidebar ? "sidebar-open" : "sidebar-closed")}
      >
        {dictation.active && (
          <div className="dictation-status glass lens" role="status">
            <Mic size={16} />
            <span>
              {dictation.phase === "connecting"
                ? "Connecting microphone…"
                : "Listening…"}
            </span>
            <button onClick={dictation.stop}>Stop and keep</button>
            <button onClick={dictation.cancel}>Cancel</button>
          </div>
        )}
        <header className="workspace-header glass canopy app-titlebar">
          <button
            className="sidebar-toggle icon-button"
            aria-label="Toggle sidebar"
            onClick={() => setSidebar(!sidebar)}
          >
            <Menu size={19} />
          </button>
          <span className="breadcrumb">
            <BookOpen size={16} />
            <span>
              {session && ["learn", "practice"].includes(view)
                ? `${view === "practice" ? "Practice" : "Learning"} / ${session.title}`
                : view === "map"
                  ? "Your learning space"
                  : names[view]}
            </span>
          </span>
          <button
            className="model-status glass lens"
            onClick={() => setView("settings")}
          >
            {settings?.models?.strong?.model
              ? settings.models.strong.model.id.split("/").at(-1)
              : "Connect a learning model"}
            <ChevronDown size={13} />
          </button>
          <button
            className="icon-button glass lens"
            aria-label="Search your learning"
            onClick={() => setShowSearch(true)}
          >
            <IconAsset file="3-195-0d510.svg" />
          </button>
          <button
            className="icon-button glass lens"
            aria-label="Session actions"
            disabled={!session}
            onClick={() => setMenu(!menu)}
          >
            <IconAsset file="3-195-abab4.svg" />
          </button>
          {session && ["learn", "practice"].includes(view) && (
            <button
              className="icon-button"
              aria-label="Toggle lesson inspector"
              aria-pressed={inspectorOpen}
              onClick={() => setInspectorOpen(!inspectorOpen)}
            >
              <SlidersHorizontal size={17} />
            </button>
          )}
          <button
            className="icon-button glass lens appearance-button"
            aria-label={dark ? "Switch to Dew" : "Switch to Moonforest"}
            onClick={() =>
              changeAppearance({
                ...appearance,
                mode: dark ? "light" : "dark",
              })
            }
          >
            <IconAsset file="3-195-dfd82.svg" size={20} />
          </button>
        </header>
        <nav className="app-rail" aria-label="Destinations" inert={showSearch}>
          <button
            className="rail-brand"
            aria-label="CoquiLearn home"
            onClick={() => setView("map")}
          >
            <IconAsset file="3-139-34dbe.svg" size={24} />
          </button>
          <LayoutGroup id="rail">
            <div className="rail-destinations">
              {nav.map((item) => (
                <button
                  key={item.id}
                  title={names[item.id]}
                  aria-label={names[item.id]}
                  aria-current={
                    view === item.id ||
                    (item.id === "learn" && view === "practice")
                      ? "page"
                      : undefined
                  }
                  className="rail-action"
                  onClick={() =>
                    setView(
                      item.id === "learn" && session?.kind === "practice"
                        ? "practice"
                        : item.id,
                    )
                  }
                >
                  {(view === item.id ||
                    (item.id === "learn" && view === "practice")) && (
                    <motion.span
                      className="rail-selection"
                      layoutId="rail-selection"
                      transition={spring}
                    />
                  )}
                  <IconAsset file={item.icon} />
                  {item.id === "review" && due.length > 0 && (
                    <i className="rail-review-dot" />
                  )}
                </button>
              ))}
            </div>
          </LayoutGroup>
          <button
            className="rail-action rail-settings"
            title="Settings"
            aria-label="Application settings"
            onClick={() => setView("settings")}
          >
            <IconAsset file="3-139-9d19a.svg" />
          </button>
        </nav>
        <aside
          inert={showSearch}
          className={"sidebar glass canopy " + (sidebar ? "expanded" : "")}
        >
          <div className="window-clearance" />
          <div className="brand">
            <span className="app-mark">
              <img src={logo} width="22" height="22" alt="" />
            </span>
            <span>CoquiLearn</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.985 }}
            className="primary new-session"
            onClick={() => {
              setSession(null);
              setBusy(false);
              setView("learn");
              setKind("teach");
              setGoal("");
              setTimeout(() => composer.current?.focus(), 0);
            }}
          >
            <Plus size={20} />
            New session
          </motion.button>
          <LayoutGroup id="navigation">
            <nav aria-label="Main navigation">
              {nav.map((n) => (
                <button
                  className={
                    "nav-item " +
                    (view === n.id || (view === "practice" && n.id === "learn")
                      ? "active"
                      : "")
                  }
                  key={n.id}
                  onClick={() => {
                    setView(n.id);
                    if (innerWidth < 1100) setSidebar(false);
                  }}
                >
                  {(view === n.id ||
                    (view === "practice" && n.id === "learn")) && (
                    <motion.span
                      className="selection-lens"
                      layoutId="navigation-selection"
                      transition={spring}
                    />
                  )}
                  <IconAsset file={n.icon} />
                  <span>{names[n.id]}</span>
                  {n.id === "review" && due.length > 0 && (
                    <span className="nav-count">{due.length}</span>
                  )}
                </button>
              ))}
            </nav>
          </LayoutGroup>
          <div className="sidebar-divider" />
          <SessionHistory
            chats={chats}
            activeId={session?.id}
            onOpen={(id) => void run(() => openSession(id))}
            onActions={(id) =>
              void run(async () => {
                await openSession(id);
                setMenu(true);
                setTimeout(
                  () => document.getElementById("session-title")?.focus(),
                  0,
                );
              })
            }
          />
          <div className="sidebar-bottom">
            <p>
              <IconAsset file="3-139-3877c.svg" size={16} />
              <span>Saved on this device</span>
            </p>
            <span className="caption">
              {environment.fixture
                ? "Offline fixture library"
                : "Your keys · Your data"}
            </span>
            <button
              className={"nav-item " + (view === "settings" ? "active" : "")}
              onClick={() => setView("settings")}
            >
              <IconAsset file="3-139-9d19a.svg" />
              <span>Settings</span>
            </button>
          </div>
        </aside>
        <main
          className="workspace"
          inert={showSearch}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const paths = Array.from(e.dataTransfer.files)
              .map((file) => window.coqui.getPathForFile(file))
              .filter(Boolean);
            if (paths.length) void run(() => referencePaths(paths));
          }}
        >
          {menu && session && (
            <section className="session-menu glass mist">
              <label className="field">
                Knowledge when deleting
                <select
                  value={deleteMode}
                  onChange={(e) => setDeleteMode(e.target.value)}
                >
                  <option value="preserve-graph">
                    Keep contributed knowledge
                  </option>
                  <option value="delete-nodes">
                    Remove this session’s contributions
                  </option>
                </select>
              </label>
              <label className="field">
                Session title
                <input
                  id="session-title"
                  value={session.title}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      e.currentTarget.blur();
                      setMenu(false);
                    }
                  }}
                  onChange={(e) =>
                    setSession({ ...session, title: e.target.value })
                  }
                  onBlur={() =>
                    void run(async () => {
                      if (session.title.trim())
                        await api("/api/chats/" + session.id, "PUT", {
                          title: session.title,
                        });
                      await refresh();
                    })
                  }
                />
              </label>
              <label className="field">
                Find in transcript
                <input
                  id="transcript-find"
                  value={find}
                  onChange={(e) => {
                    readingAway.current = true;
                    setFind(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.shiftKey) transcriptFind.previous();
                      else transcriptFind.next();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      e.stopPropagation();
                      setFind("");
                      setMenu(false);
                    }
                  }}
                  placeholder="Find exact text…"
                />
              </label>
              <div className="inline-actions">
                <span className="caption">
                  {transcriptFind.current} of {transcriptFind.count} matches
                </span>
                <button
                  disabled={!transcriptFind.count}
                  onClick={transcriptFind.previous}
                >
                  Previous
                </button>
                <button
                  disabled={!transcriptFind.count}
                  onClick={transcriptFind.next}
                >
                  Next
                </button>
                <button onClick={() => setFind("")}>Clear</button>
              </div>
              <div className="inline-actions">
                <button
                  onClick={() =>
                    void run(async () => {
                      const text = await api(
                        "/api/chats/" + session.id + "/markdown",
                      );
                      await host("export", {
                        title: session.title,
                        text: typeof text === "string" ? text : text.markdown,
                      });
                    })
                  }
                >
                  <Download size={15} />
                  Export Markdown
                </button>
                <button
                  className="danger"
                  onClick={() => void run(removeSession)}
                >
                  <Trash2 size={15} />
                  Delete session
                </button>
              </div>
            </section>
          )}
          <motion.div
            className={
              "workspace-content " +
              (["learn", "practice"].includes(view) && session
                ? "lesson-workspace"
                : view === "map"
                  ? "map-workspace"
                  : view === "learn"
                    ? "start-workspace"
                    : "")
            }
            key={view}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {view === "settings" ? (
              <Settings
                settings={settings}
                shortcuts={state.shortcuts ?? {}}
                catalog={catalog}
                connections={connections}
                appearance={appearance}
                onAppearance={changeAppearance}
                onRefresh={async () => {
                  await refresh();
                  await refreshConnections();
                }}
                notify={notify}
              />
            ) : view === "review" ? (
              <>
                <header className="page-heading">
                  <h1>Keep it within reach.</h1>
                  <p>Bring an idea back before it slips away.</p>
                </header>
                {review ? (
                  <section className="review-surface reading">
                    <div className="question-phase">
                      <span className="pill selected">{review.title}</span>
                      <span className="caption">
                        {due.length} due {due.length === 1 ? "idea" : "ideas"}
                      </span>
                    </div>
                    <h2>{review.prompt}</h2>
                    <label className="field">
                      Your thinking
                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Recall it in your own words before revealing the answer."
                      />
                    </label>
                    {reveal ? (
                      <>
                        <RichText text={review.answer} />
                        <p className="caption">How did the retrieval feel?</p>
                        <div className="review-ratings">
                          {["Again", "Hard", "Good", "Easy"].map((g, i) => (
                            <button
                              key={g}
                              onClick={() =>
                                void run(async () => {
                                  await api("/coqui/review/rate", "POST", {
                                    id: review.id,
                                    grade: i + 1,
                                    expectedDue: review.due,
                                    attempt: reviewText,
                                  });
                                  setReveal(false);
                                  setReviewText("");
                                  await refresh();
                                })
                              }
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <button
                        className="primary"
                        onClick={() => setReveal(true)}
                      >
                        Reveal explanation
                      </button>
                    )}
                    <button
                      className="text-button"
                      onClick={() =>
                        void run(async () => {
                          await api("/coqui/review/snooze", "POST", {
                            id: review.id,
                          });
                          setReveal(false);
                          await refresh();
                        })
                      }
                    >
                      Snooze for one day
                    </button>
                  </section>
                ) : (
                  <Empty
                    title="A little space to let it settle."
                    action={
                      <button
                        className="primary"
                        onClick={() => setView("map")}
                      >
                        Explore your map
                      </button>
                    }
                  >
                    No reviews are due. Add an idea from your map to begin a
                    review practice.
                  </Empty>
                )}
                <EvidenceHistory
                  items={state.evidence ?? []}
                  refresh={refresh}
                  open={openSession}
                  notify={notify}
                />
              </>
            ) : view === "library" ? (
              <>
                <header className="page-heading">
                  <div>
                    <h1>A home for your material.</h1>
                    <p>
                      Bring your notes, sources, and explanations into the
                      conversation.
                    </p>
                  </div>
                  <button
                    className="primary"
                    onClick={() => void run(importPick)}
                  >
                    <Plus size={17} />
                    Import material
                  </button>
                </header>
                {imports.length > 0 && (
                  <ImportWorkbench
                    items={imports}
                    onDuplicate={(id, choice) =>
                      updateImport(id, {
                        duplicateChoice: choice,
                        selected: choice === "update",
                      })
                    }
                    onToggle={(id, checked) =>
                      updateImport(id, { selected: checked })
                    }
                    onRetry={(id) => void run(() => retryImport(id))}
                    onInspect={(source) =>
                      setSourceViewer({
                        source,
                        saved:
                          source.duplicate === true || source.phase === "saved",
                      })
                    }
                    onCommit={() => void run(commitImports)}
                    onClose={() => {
                      setImports([]);
                      setFiles([]);
                    }}
                  />
                )}
                {state.library?.length ? (
                  <div className="library-list">
                    {state.library.map((f: any) => (
                      <article
                        className="library-item glass mist"
                        key={f.digest}
                      >
                        <Paperclip size={20} />
                        <div>
                          <h3>{f.name}</h3>
                          <p className="caption">
                            {f.pages?.length ?? 0} source pages · Imported{" "}
                            {new Date(f.importedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSession(null);
                            setSelected(null);
                            setGoal(
                              "Help me understand this material: " +
                                quoteFilePath(f.absolutePath),
                            );
                            void api("/coqui/draft?id=home", "PUT", {
                              text:
                                "Help me understand this material: " +
                                quoteFilePath(f.absolutePath),
                            });
                            setView("learn");
                          }}
                        >
                          Learn from this <ArrowRight size={15} />
                        </button>
                        <button
                          onClick={() =>
                            setSourceViewer({ source: f, saved: true })
                          }
                        >
                          Inspect source
                        </button>
                        <button
                          disabled={!f.text?.trim()}
                          onClick={() =>
                            void run(async () => {
                              await api("/coqui/import/extract", "POST", {
                                id: f.digest,
                              });
                              notify("Knowledge extraction started.");
                              await refresh();
                            })
                          }
                        >
                          Add to map
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="Start with something you’re curious about."
                    action={
                      <button onClick={() => void run(importPick)}>
                        <Upload size={16} />
                        Choose material
                      </button>
                    }
                  >
                    Your imported notes, PDFs, and images will stay here with
                    their sources.
                  </Empty>
                )}
              </>
            ) : ["learn", "practice"].includes(view) && session ? (
              <div
                className={
                  "lesson-layout " +
                  (inspectorOpen ? "with-inspector" : "without-inspector")
                }
              >
                <section className="reading lesson-document">
                  <header className="lesson-heading">
                    <h2>
                      <button
                        className="session-rename-trigger"
                        aria-label={"Rename " + session.title}
                        onClick={() => {
                          setMenu(true);
                          setTimeout(
                            () =>
                              document.getElementById("session-title")?.focus(),
                            0,
                          );
                        }}
                      >
                        {session.title}
                      </button>
                    </h2>
                    <p className="caption">
                      {session.kind === "practice"
                        ? "Work it through → hints when needed → reflect"
                        : "Explore → predict → explain → understanding check"}
                    </p>
                  </header>
                  <div
                    ref={transcriptScroll}
                    className="transcript-scroll"
                    onScroll={(e) => {
                      const element = e.currentTarget,
                        gap =
                          element.scrollHeight -
                          element.scrollTop -
                          element.clientHeight;
                      if (gap > 96) {
                        readingAway.current = true;
                        if (!document.activeElement?.closest(".lesson-input"))
                          setDockExpanded(false);
                      } else if (gap < 16) {
                        readingAway.current = false;
                        if (!manualDock.current) setDockExpanded(true);
                      }
                    }}
                  >
                    <div className="transcript">
                      {views.map((m: any) => (
                        <div
                          className={"message " + m.role}
                          id={m.id}
                          key={m.id}
                        >
                          {m.parts.map((p: any, i: number) => (
                            <Fragment key={i}>
                              {phaseMarks.has(m.id + ":" + i) && (
                                <p className="phase-divider caption">
                                  {phaseMarks.get(m.id + ":" + i)}
                                </p>
                              )}
                              {(() => {
                                if (p.type === "text" && p.text)
                                  return (
                                    <div
                                      key={i}
                                      id={
                                        p.sourceMessageId ??
                                        p.id?.replace(/-t\d+$/, "")
                                      }
                                    >
                                      <RichText text={p.text} />
                                    </div>
                                  );
                                if (p.type === "data-practice-thinking")
                                  return (
                                    <details
                                      className="practice-thinking"
                                      data-user-thinking
                                      open
                                      key={i}
                                    >
                                      <summary>Your reasoning</summary>
                                      <RichText text={p.data?.text ?? ""} />
                                    </details>
                                  );
                                if (p.type === "data-practice-next")
                                  return (
                                    <p className="caption" key={i}>
                                      Next practice problem
                                    </p>
                                  );
                                if (p.type === "data-graph-context")
                                  return (
                                    <details key={i}>
                                      <summary>
                                        Ideas chosen from your map
                                      </summary>
                                      <RichText
                                        text={(p.data?.propositions ?? [])
                                          .map(
                                            (n: any) =>
                                              "- **" +
                                              n.name +
                                              "**: " +
                                              n.statement,
                                          )
                                          .join("\n")}
                                      />
                                    </details>
                                  );
                                if (p.type === "data-probe-handoff")
                                  return null;
                                if (
                                  p.type === "tool-probe_done" &&
                                  p.state === "output-available"
                                )
                                  return <ProbeAssessment input={p.input} />;
                                if (p.type === "data-compaction")
                                  return (
                                    <details className="caption" key={i}>
                                      <summary>
                                        Earlier context was summarized
                                      </summary>
                                      <RichText text={p.data?.content ?? ""} />
                                    </details>
                                  );
                                if (p.type === "data-compaction-cut")
                                  return (
                                    <p className="caption" key={i}>
                                      Earlier messages remain saved; this turn
                                      uses their summary.
                                    </p>
                                  );
                                if (p.type === "tool-conclude" && p.input)
                                  return (
                                    <section
                                      className="practice-outcome"
                                      key={i}
                                    >
                                      <span className="pill selected">
                                        {p.input.outcome === "solved"
                                          ? "Solved"
                                          : p.input.outcome === "dismissed"
                                            ? "Set aside"
                                            : ((
                                                {
                                                  solvedWithHints:
                                                    "Solved with hints",
                                                  movedOn: "Moved on",
                                                  surrendered: "Surrendered",
                                                } as any
                                              )[p.input.outcome] ??
                                              "Reflection")}
                                      </span>
                                      {p.problemInput?.statement && (
                                        <RichText
                                          text={p.problemInput.statement}
                                        />
                                      )}
                                      <RichText text={p.input.verdict ?? ""} />
                                      <PracticeMetadata
                                        problem={p.problemInput}
                                        conclusion={p.input}
                                        concepts={
                                          graph?.propositions ??
                                          graph?.nodes ??
                                          []
                                        }
                                      />
                                      {p.reveal && (
                                        <details>
                                          <summary>Committed solution</summary>
                                          <RichText text={p.reveal} />
                                        </details>
                                      )}
                                    </section>
                                  );
                                if (p.type === "reasoning" && p.text)
                                  return (
                                    <details
                                      className="model-reasoning"
                                      key={i}
                                    >
                                      <summary>Model thinking</summary>
                                      <RichText text={p.text} />
                                    </details>
                                  );
                                if (p.type === "data-plan-block")
                                  return (
                                    <PlanSnapshot
                                      key={i}
                                      data={p.data}
                                      onOpen={() => setPlanOpen(true)}
                                    />
                                  );
                                if (p.output?.questionText)
                                  return (
                                    <AnswerFeedback key={i} answer={p.output} />
                                  );
                                if (p.type?.startsWith("tool-") && p.errorText)
                                  return (
                                    <p className="inline-error" key={i}>
                                      This step could not be prepared. The saved
                                      conversation is available for recovery.
                                    </p>
                                  );
                                if (
                                  [
                                    "tool-research",
                                    "tool-demo",
                                    "tool-visual",
                                    "tool-pdf",
                                  ].includes(p.type)
                                )
                                  return (
                                    <JobDispatch
                                      key={i}
                                      part={p}
                                      jobs={jobs}
                                      onFocus={() => {
                                        setInspectorOpen(true);
                                        setTimeout(
                                          () =>
                                            document
                                              .getElementById("background-work")
                                              ?.focus(),
                                          0,
                                        );
                                      }}
                                    />
                                  );
                                if (p.type === "data-subagent-aborted")
                                  return (
                                    <p className="caption" key={i}>
                                      Background work was cancelled. Your lesson
                                      is preserved.
                                    </p>
                                  );
                                if (p.type === "data-subagent-artifact")
                                  return (
                                    <Artifact
                                      onRepair={(text) => {
                                        setGoal(text);
                                        setDockExpanded(true);
                                        setTimeout(
                                          () => composer.current?.focus(),
                                          0,
                                        );
                                      }}
                                      key={i}
                                      data={p.data}
                                      sessionId={session.id}
                                      messageId={m.id}
                                    />
                                  );
                                return null;
                              })()}
                            </Fragment>
                          ))}
                        </div>
                      ))}
                      {stream && (
                        <div className="streaming-prose">
                          <RichText text={stream} />
                        </div>
                      )}
                    </div>
                    {session.turnError && (
                      <div className="recovery">
                        <p>
                          {typeof session.turnError === "string"
                            ? session.turnError
                            : (session.turnError.message ??
                              "The last response was interrupted. Your input is saved.")}
                        </p>
                        {session.messages?.some(
                          (m: any) => m.providerDiagnostic,
                        ) && (
                          <details className="caption">
                            <summary>Provider diagnostic</summary>
                            {session.messages
                              .filter((m: any) => m.providerDiagnostic)
                              .slice(-1)
                              .map((m: any) => (
                                <p key={m.id}>
                                  {m.providerDiagnostic.category} ·{" "}
                                  {m.providerDiagnostic.code ??
                                    "No provider code"}
                                  {m.providerDiagnostic.status
                                    ? " · HTTP " + m.providerDiagnostic.status
                                    : ""}
                                  {m.providerDiagnostic.requestId
                                    ? " · Request " +
                                      m.providerDiagnostic.requestId
                                    : ""}
                                </p>
                              ))}
                          </details>
                        )}
                        <button
                          onClick={() =>
                            void run(() => sendInput({ type: "retry" }))
                          }
                        >
                          Retry response
                        </button>
                      </div>
                    )}
                  </div>
                  <section
                    className={
                      "lesson-input glass canopy " +
                      (!pending && !session.problem ? "is-chat" : "")
                    }
                    aria-label="Lesson composer"
                  >
                    <div className="dock-bar">
                      <span role={session.compacting ? "status" : undefined}>
                        {session.compacting
                          ? "Summarizing context · Your draft is saved"
                          : pending
                            ? "Check your understanding"
                            : session.problem
                              ? "Your practice problem"
                              : "Continue learning"}
                      </span>
                      <button
                        className="text-button"
                        aria-expanded={dockExpanded}
                        aria-controls="lesson-input-content"
                        onClick={() => (
                          (manualDock.current = dockExpanded),
                          setDockExpanded(!dockExpanded)
                        )}
                      >
                        {dockExpanded ? "Collapse" : "Expand"}
                        <ChevronDown
                          size={14}
                          style={{
                            transform: dockExpanded ? "rotate(180deg)" : "none",
                          }}
                        />
                      </button>
                    </div>
                    <div
                      id="lesson-input-content"
                      className={
                        "lesson-input-content " +
                        (dockExpanded ? "expanded" : "collapsed")
                      }
                      inert={!dockExpanded}
                    >
                      {pending && !busy ? (
                        <Question
                          key={pending.toolCallId}
                          sessionId={session.id}
                          pending={pending}
                          busy={busy || session.compacting}
                          onAnswer={(input) => run(() => sendInput(input))}
                          onSkip={() => run(dismissCurrent)}
                        />
                      ) : session.problem ? (
                        <section className="practice-response">
                          <h3>
                            {session.problem.input?.title ??
                              "Work through the problem"}
                          </h3>
                          <RichText
                            text={
                              session.problem.input?.problem ??
                              session.problem.input?.statement ??
                              session.problem.input?.prompt ??
                              ""
                            }
                          />
                          <label className="field">
                            Your thinking
                            <PathInput
                              aria-label="Your thinking"
                              ref={composer}
                              value={goal}
                              onValueChange={setGoal}
                              placeholder="Show how you’re approaching the problem…"
                            />
                          </label>
                          <div className="inline-actions">
                            <button
                              className="primary"
                              disabled={
                                busy || session.compacting || !goal.trim()
                              }
                              onClick={() =>
                                void run(async () => {
                                  await sendComposer({
                                    type: "thinking",
                                    problemCallId: session.problem.toolCallId,
                                  });
                                  setGoal("");
                                })
                              }
                            >
                              Submit reasoning
                            </button>
                            <button
                              disabled={busy || session.compacting}
                              onClick={() =>
                                void run(() =>
                                  sendInput({
                                    type: "thinking",
                                    problemCallId: session.problem.toolCallId,
                                    text: "Please give me the least revealing hint I need to make progress.",
                                  }),
                                )
                              }
                            >
                              Give me a hint
                            </button>
                            <button
                              disabled={busy || session.compacting}
                              onClick={() => void run(dismissCurrent)}
                            >
                              Set this problem aside
                            </button>
                          </div>
                        </section>
                      ) : (
                        <div className="session-composer">
                          <PathInput
                            aria-label="Continue the conversation"
                            ref={composer}
                            value={goal}
                            onValueChange={setGoal}
                            placeholder="What would you like to explore next?"
                          />
                          <div className="inline-actions">
                            <button
                              className="primary"
                              disabled={
                                session.compacting || (busy && !goal.trim())
                              }
                              onClick={() =>
                                void run(async () => {
                                  await finishDictation();
                                  await sendInput(
                                    goalRef.current.trim()
                                      ? { type: "text", text: goalRef.current }
                                      : session.kind === "practice"
                                        ? { type: "next" }
                                        : { type: "continue" },
                                  );
                                  setGoal("");
                                })
                              }
                            >
                              {goal.trim()
                                ? busy
                                  ? "Send to current response"
                                  : "Send"
                                : session.kind === "practice"
                                  ? "Next problem"
                                  : "Continue"}
                              <ArrowRight size={15} />
                            </button>
                          </div>
                        </div>
                      )}
                      {busy && (
                        <div className="working-status" role="status">
                          <LoaderCircle className="spin" size={17} />
                          <span>Working through your next step…</span>
                          <button
                            onClick={() =>
                              void run(() =>
                                api("/api/activity/abort", "POST", {
                                  kind: "turn",
                                  id: session.id,
                                }),
                              )
                            }
                          >
                            <Square size={13} />
                            Stop
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="lesson-input-footer">
                      <button
                        className="text-button"
                        aria-label="Reference a file in this lesson"
                        onClick={() => void run(attachFiles)}
                      >
                        <Plus size={16} />
                      </button>
                      {(
                        session.settings?.model ??
                        settings.models?.strong?.model
                      )?.provider === "chatgpt" ? (
                        <ChatGPTPlanBadge />
                      ) : (
                        <span className="caption">
                          {session.kind === "practice"
                            ? "Deliberate practice"
                            : "Adaptive learning"}
                        </span>
                      )}
                      <div className="composer-model-control">
                        <ModelPicker
                          label="Composer model"
                          models={catalog.models}
                          value={session.settings?.model}
                          placeholder="Session model"
                          onChange={(m) =>
                            void run(async () => {
                              const next = { ...session.settings };
                              if (m)
                                next.model = { provider: m.provider, id: m.id };
                              else delete next.model;
                              await api(
                                "/api/chats/" + session.id + "/settings",
                                "PUT",
                                next,
                              );
                              await refresh();
                            })
                          }
                        />
                      </div>

                      <button
                        className="text-button"
                        aria-label="Dictate into lesson"
                        onClick={dictation.toggle}
                      >
                        <Mic size={16} />
                      </button>
                    </div>
                  </section>
                </section>
                <aside
                  className={
                    "lesson-inspector glass mist " +
                    (inspectorOpen ? "open" : "closed")
                  }
                >
                  <div className="inspector-header">
                    <strong>{session.title}</strong>
                    <button
                      className="text-button"
                      aria-label="Close lesson inspector"
                      onClick={() => setInspectorOpen(false)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <section className="glass mist inspector-section">
                    <h3>Learning path</h3>
                    {plan?.nodes?.length ? (
                      <>
                        <button
                          className="plan-inspector-preview"
                          aria-label="Open learning path diagram"
                          onClick={() => setPlanOpen(true)}
                        >
                          <PlanDiagram
                            tree={plan}
                            statuses={
                              new Map(
                                plan.nodes.map((n: any) => [
                                  n.id,
                                  statuses.current === n.id
                                    ? "current"
                                    : statuses.visited?.has(n.id)
                                      ? "visited"
                                      : "upcoming",
                                ]),
                              )
                            }
                          />
                        </button>
                        <details className="plan-inspector-details">
                          <summary>
                            <span className="status-dot" />
                            <span>
                              {plan.nodes.find(
                                (n: any) => n.id === statuses.current,
                              )?.title ?? "View learning path"}
                            </span>
                            <ChevronDown size={13} />
                          </summary>
                          <ol className="plan-list">
                            {plan.nodes.map((n: any, i: number) => (
                              <li key={n.id}>
                                <span
                                  className={
                                    "step-status " +
                                    (statuses.current === n.id ? "current" : "")
                                  }
                                >
                                  {statuses.visited?.has(n.id) ? (
                                    <Check size={17} />
                                  ) : (
                                    <i />
                                  )}
                                </span>
                                <div>
                                  <span>{n.title}</span>
                                  <small>
                                    {statuses.visited?.has(n.id)
                                      ? "Covered"
                                      : statuses.current === n.id
                                        ? "Learning now"
                                        : "Up next"}
                                  </small>
                                </div>
                              </li>
                            ))}
                          </ol>{" "}
                        </details>
                      </>
                    ) : (
                      <p className="caption">
                        Your path takes shape as we explore what you know.
                      </p>
                    )}
                  </section>
                  <BackgroundWork
                    activity={activity}
                    jobs={jobs}
                    onRefresh={refresh}
                    onSource={(id) => void run(() => openSession(id))}
                  />
                  <section className="glass mist tinted inspector-section">
                    <h3>Sources</h3>

                    <button
                      className="text-button"
                      onClick={() => setView("map")}
                    >
                      <IconAsset file="3-295-761f0.svg" size={18} />
                      Open related knowledge
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          api("/api/graph/coverage/extract", "POST", {
                            chatId: session.id,
                          }),
                        )
                      }
                    >
                      Extract this session now
                    </button>
                    {session.extractionAction && (
                      <p
                        className="caption"
                        role={
                          ["failed", "partial", "interrupted"].includes(
                            session.extractionAction.state,
                          )
                            ? "alert"
                            : "status"
                        }
                      >
                        {session.extractionAction.message ??
                          "Preparing extraction…"}
                      </p>
                    )}
                    <details className="coverage-details caption">
                      <summary>Extraction coverage</summary>
                      {session.coverage ? (
                        <dl>
                          <dt>Covered passages</dt>
                          <dd>{session.coverage.coveredCount}</dd>
                          <dt>Uncovered passages</dt>
                          <dd>{session.coverage.uncoveredCount}</dd>
                          <dt>Uncovered text</dt>
                          <dd>
                            {session.coverage.uncoveredTokens?.toLocaleString()}{" "}
                            estimated tokens
                          </dd>
                          <dt>Last extraction</dt>
                          <dd>
                            {session.coverage.lastFoldedAt
                              ? new Date(
                                  session.coverage.lastFoldedAt,
                                ).toLocaleString()
                              : "Not yet extracted"}
                          </dd>
                          <dt>Status</dt>
                          <dd>
                            {session.coverage.running
                              ? "Extraction in progress"
                              : "Idle"}
                          </dd>
                        </dl>
                      ) : (
                        <p>No extractable teaching has been recorded yet.</p>
                      )}
                    </details>
                  </section>
                  <details className="inspector-section model-controls">
                    <summary>Model and usage</summary>
                    <div className="inspector-model-body">
                      <ModelPicker
                        label="Session model"
                        models={catalog.models}
                        value={session.settings?.model}
                        placeholder="Default teaching model"
                        onChange={(m) =>
                          void run(async () => {
                            const next = { ...session.settings };
                            if (m)
                              next.model = { provider: m.provider, id: m.id };
                            else delete next.model;
                            await api(
                              "/api/chats/" + session.id + "/settings",
                              "PUT",
                              next,
                            );
                            await refresh();
                          })
                        }
                      />

                      <select
                        aria-label="Thinking level"
                        value={session.settings?.thinkingLevel ?? ""}
                        onChange={(e) =>
                          void run(async () => {
                            await api(
                              "/api/chats/" + session.id + "/settings",
                              "PUT",
                              {
                                ...session.settings,
                                thinkingLevel: e.target.value || undefined,
                              },
                            );
                            await refresh();
                          })
                        }
                      >
                        <option value="">Provider default</option>
                        {(
                          catalog.models.find(
                            (m: any) =>
                              m.provider ===
                                session.settings?.model?.provider &&
                              m.id === session.settings?.model?.id,
                          )?.supportedLevels ?? []
                        ).map((l: string) => (
                          <option key={l}>{l}</option>
                        ))}
                      </select>
                      <SessionUsage
                        session={session}
                        contextTokens={
                          sessionModel.current?.getState().contextTokens
                        }
                        contextWindow={
                          catalog.models.find(
                            (m: any) =>
                              m.id === session.settings?.model?.id &&
                              m.provider === session.settings?.model?.provider,
                          )?.contextWindow
                        }
                      />
                    </div>
                  </details>
                </aside>
              </div>
            ) : (
              <>
                <header className="page-heading">
                  <h1>
                    {view === "map"
                      ? "Your understanding, connected."
                      : "What would you like to understand?"}
                  </h1>
                  <p>
                    {view === "map"
                      ? "Explore an idea, follow its reasoning, or start with a question."
                      : "Start with a goal, a question, or a piece of material."}
                  </p>
                </header>
                {view === "map" && (
                  <KnowledgeMap
                    graph={graph}
                    selected={selected}
                    onSelect={setSelected}
                    picks={picks}
                    onPicks={(next) => {
                      setPicks(next);
                      if (!next.length) setSelected(null);
                    }}
                    notify={notify}
                    onSource={(id, messageId) =>
                      void run(() => openSession(id, messageId))
                    }
                    rendering={settings.graph?.rendering !== false}
                    onDelete={(ids) => setDeleteNodes(ids)}
                    selectMode={pickingContext}
                    onDone={() => {
                      setPickingContext(false);
                      setView("learn");
                    }}
                  />
                )}
                {!environment.fixture && !catalog.models.length && (
                  <section className="setup-intro reading">
                    <h2>Connect your learning model.</h2>
                    <p>
                      Choose a subscription connection, then select your
                      teaching, background and vision models. Your work stays in
                      this local library.
                    </p>
                    <button
                      className="primary"
                      onClick={() => setView("settings")}
                    >
                      Set up connections
                    </button>
                  </section>
                )}
                <section className="home-composer glass canopy">
                  <div className="composer-context">
                    <div className="segmented">
                      <button
                        aria-pressed={kind === "teach"}
                        onClick={() => setKind("teach")}
                      >
                        Learn
                      </button>
                      <button
                        aria-pressed={kind === "practice"}
                        onClick={() => setKind("practice")}
                      >
                        Practice
                      </button>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => {
                        setPickingContext(true);
                        setView("map");
                      }}
                    >
                      Choose ideas
                    </button>
                    {(selected || picks.length > 0) && (
                      <span className="caption">
                        {picks.length
                          ? picks.length > 64
                            ? `${picks.length} selected · Choose up to 64 for learning`
                            : picks.length + " chosen ideas as context"
                          : "Using “" + selected.name + "” as context"}
                      </span>
                    )}
                  </div>
                  {picks.length > 64 && (
                    <p className="home-context-validation" role="status">
                      Choose up to 64 ideas for a learning context. Your
                      complete selection remains available for deletion.
                    </p>
                  )}
                  <div className="composer-input">
                    <PathInput
                      ref={composer}
                      aria-label="Learning goal"
                      placeholder="What would you like to understand?"
                      value={goal}
                      onValueChange={setGoal}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          void run(start);
                        }
                      }}
                    />
                    <motion.button
                      whileTap={{ scale: 0.985 }}
                      disabled={busy || !goal.trim()}
                      className="primary"
                      onClick={() => void run(start)}
                    >
                      {busy ? (
                        <LoaderCircle className="spin" size={16} />
                      ) : null}
                      {kind === "practice"
                        ? "Start practicing"
                        : "Start learning"}
                    </motion.button>
                  </div>
                  <div className="composer-footer">
                    <div className="composer-model-control">
                      <ModelPicker
                        label="Default teaching model"
                        models={catalog.models}
                        value={settings.models?.strong?.model}
                        placeholder="Choose a teaching model"
                        onChange={(model) =>
                          void run(async () => {
                            await api("/api/settings/models", "PUT", {
                              ...settings.models,
                              strong: { ...settings.models?.strong, model },
                            });
                            await refresh();
                          })
                        }
                      />
                    </div>
                    <button
                      className="text-button"
                      onClick={() => void run(importPick)}
                    >
                      <Paperclip size={17} />
                      Add notes or files
                    </button>
                    <button
                      className="text-button"
                      onClick={() => void run(attachFiles)}
                    >
                      <Paperclip size={17} />
                      Reference a file
                    </button>
                    <button className="text-button" onClick={dictation.toggle}>
                      <Mic size={17} />
                      {dictation.active ? "Stop dictation" : "Dictate"}
                    </button>
                    <span className="caption">⌘ Enter to begin</span>
                    <span className="caption">Your keys · Your data</span>
                  </div>
                </section>
                {selected && (
                  <section className="selected-concept glass mist">
                    <div>
                      <h2>{selected.name}</h2>
                      <RichText text={selected.statement ?? ""} />
                    </div>
                    <div className="inline-actions">
                      <button
                        onClick={() =>
                          void run(async () => {
                            await api("/coqui/review", "POST", {
                              conceptId: selected.id,
                              title: selected.name,
                              prompt:
                                "Explain " +
                                selected.name +
                                " in your own words.",
                              answer: selected.statement,
                            });
                            notify("Added to your review queue.");
                            await refresh();
                          })
                        }
                      >
                        <RotateCcw size={16} />
                        Add to review
                      </button>
                      {selected.provenance?.map((p: any) => (
                        <button
                          key={p.chatId + ":" + p.messageId}
                          onClick={() =>
                            void run(() => openSession(p.chatId, p.messageId))
                          }
                        >
                          Open source session <ArrowUpRight size={14} />
                        </button>
                      ))}
                      <button
                        onClick={() =>
                          setPicks((previous) =>
                            previous.some((n) => n.id === selected.id)
                              ? previous.filter((n) => n.id !== selected.id)
                              : [...previous, selected],
                          )
                        }
                      >
                        {picks.some((n) => n.id === selected.id)
                          ? "Remove from chosen context"
                          : "Choose for new learning"}
                      </button>
                      {!pickingContext && (
                        <button
                          className="danger text-button"
                          onClick={() => setDeleteNodes([selected.id])}
                        >
                          Delete idea
                        </button>
                      )}
                    </div>
                  </section>
                )}
              </>
            )}
          </motion.div>
        </main>
        <AnimatePresence>
          {notice && (
            <motion.div
              role="status"
              className="notice glass mist"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <span>{notice}</span>
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
          {undo && (
            <motion.div
              className="undo glass mist"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span>Deleted. Your learning can be restored.</span>
              <button
                onClick={() =>
                  void run(async () => {
                    await api("/coqui/undo", "POST", { id: undo });
                    setUndo(null);
                    await refresh();
                  })
                }
              >
                <RotateCcw size={15} />
                Undo
              </button>
              <button aria-label="Dismiss undo" onClick={() => setUndo(null)}>
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {sourceViewer && (
          <SourceViewer
            source={sourceViewer.source}
            saved={sourceViewer.saved}
            onClose={() => setSourceViewer(null)}
          />
        )}
        {deleteNodes.length > 0 && (
          <Dialog
            title={
              "Delete " +
              deleteNodes.length +
              " selected " +
              (deleteNodes.length === 1 ? "idea" : "ideas") +
              "?"
            }
            onClose={() => setDeleteNodes([])}
          >
            <p>
              These ideas and reasoning chains that depend on them will be
              removed from the map. You can undo this deletion.
            </p>
            <div className="inline-actions">
              <button autoFocus onClick={() => setDeleteNodes([])}>
                Cancel
              </button>
              <button
                className="danger"
                onClick={() =>
                  void run(async () => {
                    const result = await api("/coqui/graph/delete", "POST", {
                      ids: deleteNodes,
                    });
                    setUndo(result.undoId);
                    setDeleteNodes([]);
                    setSelected(null);
                    setPicks([]);
                    await refresh();
                  })
                }
              >
                Delete ideas
              </button>
            </div>
          </Dialog>
        )}
        {planOpen && plan && (
          <PlanFocus
            tree={plan}
            statuses={
              new Map(
                plan.nodes.map((n: any) => [
                  n.id,
                  statuses.current === n.id
                    ? "current"
                    : statuses.visited?.has(n.id)
                      ? "visited"
                      : "upcoming",
                ]),
              )
            }
            onClose={() => setPlanOpen(false)}
          />
        )}
        {shortcutHelp && (
          <Dialog
            title="Keyboard shortcuts"
            onClose={() => setShortcutHelp(false)}
          >
            <dl className="shortcut-help">
              {SHORTCUTS.map((a) => (
                <div key={a.id}>
                  <dt>{a.label}</dt>
                  <dd>
                    <kbd>
                      {(bindingFor(a.id, state.shortcuts) || "Unassigned")
                        .replace(/mod/g, "⌘")
                        .replace(/shift/g, "⇧")
                        .replaceAll("+", " ")}
                    </kbd>
                  </dd>
                </div>
              ))}
              {[
                { label: "New session", binding: "⌘ N" },
                { label: "Settings", binding: "⌘ ," },
                { label: "Import material", binding: "⌘ O" },
                { label: "Move focus", binding: "Tab / ⇧ Tab" },
              ].map((a) => (
                <div key={a.label}>
                  <dt>{a.label}</dt>
                  <dd>
                    <kbd>{a.binding}</kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </Dialog>
        )}
        {connections.chatgpt?.needsPlanConfirmation && (
          <ChatGPTPlanConfirmation
            onDone={refreshConnections}
            notify={notify}
          />
        )}
        {showSearch && (
          <div className="search-overlay" onClick={() => setShowSearch(false)}>
            <section
              className="search-panel glass mist"
              role="dialog"
              aria-modal="true"
              aria-label="Search your learning"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="search-input">
                <Search size={20} />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find a session, idea, or source…"
                />
                <button
                  aria-label="Close search"
                  onClick={() => setShowSearch(false)}
                >
                  <X size={17} />
                </button>
              </div>
              <div className="search-results">
                {results.map((r) => (
                  <button
                    key={r.kind + r.id}
                    onClick={() =>
                      void run(async () => {
                        setShowSearch(false);
                        if (r.kind === "chat") await openSession(r.id);
                        else if (r.kind === "concept") {
                          setSelected(
                            graph.nodes.find((n: any) => n.id === r.id),
                          );
                          setView("map");
                        } else setView("library");
                      })
                    }
                  >
                    <span className="caption">{r.kind}</span>
                    <strong>{r.title}</strong>
                    <p>{r.excerpt}</p>
                  </button>
                ))}
                {search && !results.length && (
                  <p>No matches yet. Try another phrase.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}

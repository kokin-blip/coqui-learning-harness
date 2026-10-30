/** Read-only equivalent of LearnHarness dc4c398's sessions/graph readers. */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";
import { getGraph } from "../packages/engine/src/core/graph.ts";
import { sessionMarkdown } from "../packages/engine/src/core/session-markdown.ts";
const args = process.argv.slice(2),
  option = (name: string) => {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    const value = args[i + 1];
    if (!value || value.startsWith("--"))
      throw new Error("Missing value for " + name);
    return value;
  };
if (args.includes("--help")) {
  console.log(`CoquiLearn read-only reader
  [--library DIR] [--json | --format markdown|json] [sessions]
  [--library DIR] read ID [--include-agent-thinking] [--include-operations]
  [--library DIR] --session ID [--json]
  [--library DIR] graph sessions
  [--library DIR] graph propositions [--source ID]
  [--library DIR] graph find QUERY
  [--library DIR] graph chains [--node ID]
Never starts the app, opens credentials or referenced files/URLs, or executes stored artifacts.`);
  process.exit(0);
}
const positional: string[] = [];
for (let i = 0; i < args.length; i++) {
  const arg = args[i]!;
  if (
    ["--library", "--format", "--session", "--source", "--node"].includes(arg)
  ) {
    option(arg);
    i++;
  } else if (
    ["--json", "--include-agent-thinking", "--include-operations"].includes(arg)
  )
    continue;
  else if (arg.startsWith("--")) throw new Error("Unknown option: " + arg);
  else positional.push(arg);
}
if (positional[0] && !["sessions", "read", "graph"].includes(positional[0]))
  throw new Error("Unknown reader command: " + positional[0]);
if (positional[0] === "read" && !positional[1])
  throw new Error("Supply a session ID.");
if (option("--format") && !["json", "markdown"].includes(option("--format")!))
  throw new Error("Choose json or markdown format.");
const directory = option("--library")
  ? path.resolve(option("--library")!)
  : path.join(os.homedir(), "Library/Application Support/CoquiLearn/library");
const filename = path.join(directory, "coquilearn.sqlite");
if (!fs.existsSync(filename))
  throw new Error("No CoquiLearn library at " + directory);
const db = new DatabaseSync(filename, { readOnly: true });
const emit = (result: object, markdown?: string) => {
  const json =
    args.includes("--json") ||
    option("--format") === "json" ||
    (!markdown && option("--format") !== "markdown");
  process.stdout.write(
    json
      ? JSON.stringify({ schema: 1, library: directory, ...result }, null, 2) +
          "\n"
      : `Library: ${directory}\n\n` +
          (markdown ?? JSON.stringify(result, null, 2)) +
          "\n",
  );
};
const records = (kind: string) =>
  db
    .prepare(
      "SELECT json FROM records WHERE kind=? AND deleted_at IS NULL ORDER BY rowid",
    )
    .all(kind)
    .map((r) => JSON.parse(String(r.json)));
function checkSession(record: any) {
  if (record.version !== undefined && record.version !== 1)
    throw new Error(
      "Session requires a different CoquiLearn version: " + record.id,
    );
  if (!Array.isArray(record.messages))
    throw new Error("Invalid native history: " + record.id);
  return record;
}
function selectRecord(record: any) {
  const operations = args.includes("--include-operations"),
    reasoning = args.includes("--include-agent-thinking"),
    selected = structuredClone(record),
    omissions: { path: string; reason: string }[] = [];
  const omit = (object: any, key: string, prefix: string, reason: string) => {
    if (Object.hasOwn(object, key)) {
      delete object[key];
      omissions.push({ path: prefix + "." + key, reason });
    }
  };
  if (!operations)
    for (const key of ["turns", "extractions", "settings"])
      omit(selected, key, "session", "operational metadata");
  selected.messages = selected.messages.map((message: any, i: number) => {
    const prefix = "messages[" + i + "]";
    if (!operations)
      for (const key of [
        "usage",
        "providerMetadata",
        "providerDiagnostic",
        "responseId",
        "thinkingSignature",
      ])
        omit(message, key, prefix, "operational metadata");
    if (message.role === "assistant" && Array.isArray(message.content))
      message.content = message.content.filter((block: any, j: number) => {
        if (block.type === "thinking" && !reasoning) {
          omissions.push({
            path: prefix + ".content[" + j + "]",
            reason: "agent thinking (use --include-agent-thinking)",
          });
          return false;
        }
        if (!operations) {
          for (const key of ["signature", "thinkingSignature", "data"])
            omit(
              block,
              key,
              prefix + ".content[" + j + "]",
              "provider signature or binary payload",
            );
          if (
            block.type === "toolCall" &&
            ![
              "probe",
              "recall",
              "quiz",
              "explain",
              "ask_user_question",
              "probe_done",
              "plan_init",
              "problem",
              "conclude",
            ].includes(block.name)
          )
            omit(
              block,
              "arguments",
              prefix + ".content[" + j + "]",
              "tool operation arguments (use --include-operations)",
            );
        }
        return true;
      });
    if (
      !operations &&
      message.role === "toolResult" &&
      !message.details?.questionText
    ) {
      omit(message, "content", prefix, "routine tool result");
      omit(message, "details", prefix, "routine tool details");
    }
    if (
      !operations &&
      message.customType === "subagent-steer" &&
      message.details?.result
    )
      for (const key of ["html", "svg", "data"])
        omit(
          message.details.result,
          key,
          prefix + ".details.result",
          "artifact source (use --include-operations)",
        );
    return message;
  });
  return { session: selected, omissions };
}
try {
  const version = Number(db.prepare("PRAGMA user_version").get()!.user_version);
  if (version !== 1)
    throw new Error(
      "Unsupported library schema " + version + "; no files were changed.",
    );
  const graphAt = positional[0] === "graph" ? 0 : -1,
    id =
      option("--session") ??
      (positional[0] === "read" ? positional[1] : undefined);
  if (graphAt >= 0) {
    const read = (kind: string) =>
      db
        .prepare(
          "SELECT sequence,json FROM ledgers WHERE kind=? ORDER BY sequence",
        )
        .all(kind)
        .map((r) => {
          const value = JSON.parse(String(r.json));
          if (
            !value ||
            typeof value.id !== "string" ||
            !Array.isArray(value.provenance)
          )
            throw new Error("Invalid " + kind + " assertion at " + r.sequence);
          return value;
        });
    const graph = getGraph({
      readNodes: () => read("nodes"),
      readChains: () => read("chains"),
    });
    const chats = records("chat").map(checkSession),
      sources = records("source");
    const command = positional[1] ?? "propositions";
    if (command === "sessions") {
      const ids = [
        ...new Set(
          graph.nodes.map((n) => n.provenance[0]?.chatId).filter(Boolean),
        ),
      ];
      const selected = ids.map((id) => ({
        id,
        title:
          chats.find((c) => c.id === id)?.title ??
          sources.find((s) => s.id === id)?.filePath ??
          id,
        propositions: graph.nodes.filter((n) => n.provenance[0]?.chatId === id)
          .length,
      }));
      emit(
        { sources: selected },
        selected
          .map((s) => `- ${s.title} [${s.id}] · ${s.propositions} propositions`)
          .join("\n"),
      );
    } else if (command === "chains") {
      const node = option("--node"),
        chains = graph.chains.filter(
          (c) => !node || c.conclusion === node || c.premises.includes(node),
        ),
        names = new Map(graph.nodes.map((n) => [n.id, n.name]));
      emit(
        { chains },
        chains
          .map(
            (c) =>
              `- [${c.id}] ${c.premises.map((id) => names.get(id) ?? id).join(" AND ")} → ${names.get(c.conclusion) ?? c.conclusion}`,
          )
          .join("\n"),
      );
    } else if (command === "propositions" || command === "find") {
      const query = command === "find" ? positional[2] : undefined;
      if (command === "find" && !query)
        throw new Error("Supply a graph search query.");
      const escaped = query
          ?.split("*")
          .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join(".*"),
        pattern = escaped ? new RegExp(escaped, "i") : null,
        source = option("--source") ?? option("--session");
      const nodes = graph.nodes.filter(
        (n) =>
          (!source || n.provenance[0]?.chatId === source) &&
          (!pattern ||
            [n.name, n.statement, ...n.aliases].some((t) => pattern.test(t))),
      );
      emit(
        { propositions: nodes },
        nodes
          .map(
            (n) =>
              `## ${n.name} [${n.id}]\n${n.statement}\nSources: ${n.provenance.map((p) => p.chatId + (p.messageId ? "#" + p.messageId : "")).join(", ")}`,
          )
          .join("\n\n"),
      );
    } else throw new Error("Unknown graph command: " + command);
  } else if (id) {
    const row = db
      .prepare(
        "SELECT json FROM records WHERE kind='chat' AND id=? AND deleted_at IS NULL",
      )
      .get(id);
    if (!row) throw new Error("Session not found");
    const selected = selectRecord(checkSession(JSON.parse(String(row.json))));
    let markdown = sessionMarkdown(selected.session.messages, {
      title: selected.session.title,
      anchors: true,
    });
    if (args.includes("--include-agent-thinking"))
      for (const m of selected.session.messages)
        for (const b of Array.isArray(m.content) ? m.content : [])
          if (b.type === "thinking")
            markdown += "\n\n## Agent thinking · " + m.id + "\n" + b.thinking;
    if (args.includes("--include-operations"))
      markdown +=
        "\n\n## Operational record\n" +
        JSON.stringify(selected.session, null, 2);
    if (selected.omissions.length)
      markdown +=
        "\n\n## Omitted fields\n" +
        selected.omissions
          .map((o) => "- " + o.path + ": " + o.reason)
          .join("\n");
    emit(selected, markdown);
  } else {
    const sessions = records("chat")
      .map(checkSession)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .map(({ id, title, kind, updatedAt, messages }) => ({
        id,
        title,
        kind: kind ?? "teach",
        updatedAt,
        messageCount: messages.length,
      }));
    emit(
      { sessions },
      option("--format") === "markdown"
        ? sessions
            .map((s) => `- ${s.title} [${s.id}] · ${s.kind} · ${s.updatedAt}`)
            .join("\n")
        : undefined,
    );
  }
} finally {
  db.close();
}

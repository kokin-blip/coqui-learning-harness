/** Explicit offline fixture mode; only enabled with --fixture and a separate data directory. */
import {
  createFauxCore,
  fauxAssistantMessage,
  fauxText,
  fauxToolCall,
} from "@earendil-works/pi-ai";
import {
  createPracticeAgent,
  createProberAgent,
  createTeacherAgent,
} from "./src/agent/teacher-agent.ts";
import { handleChatRequest, handleChatInput } from "./src/server/chat-handler.ts";
import { database } from "../storage/index.ts";
import { jobStore } from "./src/store/jobs.ts";
import { chatStore } from "./src/store/chats.ts";
import { writeSettings } from "./src/store/settings.ts";
import { deliverJobResult, setTurnRunner, setJobRespawn } from "./src/server/jobs.ts";
import { createJobRunner } from "./src/agent/subagents/runner.ts";
import { hasProbeDone } from "./src/core/native-messages.ts";
function runFixtureTurn(body: any, build: Parameters<typeof handleChatRequest>[1]) {
  if (body.input.type === "steers") return handleChatInput(body.chatId, body.input, build);
  return handleChatRequest(new Request("http://fixture/api/chat", { method: "POST", body: JSON.stringify(body) }), build);
}

function fixtureJobRunner(input?: unknown) {
  return createJobRunner({ chatStore, jobStore, deliver: deliverJobResult, engineFor: (role) => {
    const slow = JSON.stringify(input).includes("slow");
    const core = createFauxCore(slow ? { tokensPerSecond: 30, tokenSize: { min: 1, max: 2 } } : { tokensPerSecond: 1000 });
    core.setResponses(role === "visualMaker" ? [
      fauxAssistantMessage([fauxToolCall("write_svg", { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="100"><style>body{background:red}</style><rect width="240" height="100" fill="white"/><text x="20" y="55">Isolated figure</text></svg>' })], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxToolCall("render_svg", {})], { stopReason: "toolUse" }),
      fauxAssistantMessage("The rendered figure is readable."),
    ] : JSON.stringify(input).includes("fail") ? [() => { throw new Error("Scripted specialist failure"); }] : [fauxAssistantMessage((slow ? "Slow background output. ".repeat(500) : "A saved research brief. ".repeat(30)))]);
    return { model: core.getModel(), streamFn: core.streamSimple };
  }});
}
export function configureFixtureRuntime() {
  setTurnRunner(async (chatId, input) => { const response = await fixtureTurn({ chatId, input }); await response.arrayBuffer(); return response.status; });
  setJobRespawn((id) => { const job = jobStore.getJob(id); if (job) void fixtureJobRunner(job.input).runJob(id); });
}
export async function fixtureCompaction(chatId: string) {
  const record = chatStore.getChat(chatId);
  if (!record) throw new Error("Fixture session not found");
  const prefix = Array.from({ length: 12 }, (_, i) => i % 2 === 0
    ? { id: "long-user-" + i, role: "user" as const, content: "Retained full-history context. ".repeat(1000), timestamp: i }
    : { ...fauxAssistantMessage("Earlier explanation. ".repeat(1000)), id: "long-assistant-" + i });
  const messages = [...prefix, ...record.messages].map(m => m.role === "assistant" ? { ...m, usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } } } : m);
  chatStore.saveMessages(chatId, messages);
  const { ensureCompacted } = await import("./src/server/compaction.ts");
  const core = createFauxCore({});
  void ensureCompacted({ chatStore, engine: { model: core.getModel(), streamFn: core.streamSimple }, modelId: "faux:faux", kind: "teach", thresholdTokens: 32000, systemPromptTokens: 0,
    summarize: async () => { await new Promise(resolve => setTimeout(resolve, 2500)); return { summary: "The learner is exploring gradients. Preserve the current plan and unanswered question.", usage: { input: 100, output: 20, cacheRead: 0, cacheWrite: 0, totalTokens: 120, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } } }; },
  }, chatId);
  return { started: true };
}
export async function fixtureTurn(body: any) {
  process.env.OPENROUTER_API_KEY = "offline-fixture-only";
  writeSettings({
    version: 1,
    models: {
      strong: {
        model: { provider: "openrouter", id: "anthropic/claude-sonnet-4.5" },
        thinkingLevel: "off",
      },
      cheap: {
        model: { provider: "openrouter", id: "anthropic/claude-sonnet-4.5" },
        thinkingLevel: "off",
      },
      vision: {
        model: { provider: "openrouter", id: "anthropic/claude-sonnet-4.5" },
        thinkingLevel: "off",
      },
    },
  });
  const record = chatStore.getChat(body.chatId);
  if (body.input.type === "text") {
    const scenario = body.input.text.match(/\[fixture:([a-z-]+)\]/)?.[1];
    if (scenario)
      database().setPreference("fixture-scenario:" + body.chatId, scenario);
  }
  const scenario = database().preference<string>(
    "fixture-scenario:" + body.chatId,
  );
  const faux = createFauxCore(
    scenario === "stream"
      ? { tokensPerSecond: 80, tokenSize: { min: 2, max: 5 } }
      : {},
  );
  if (record && !record.settings?.model)
    chatStore.saveSettings(body.chatId, {
      model: { provider: "openrouter", id: "anthropic/claude-sonnet-4.5" },
      thinkingLevel: "off",
    });
  if (record?.kind === "practice") {
    if (body.input.type === "thinking") {
      const outcome = body.input.text.match(
        /\[outcome:(solvedWithHints|movedOn|surrendered)\]/,
      )?.[1];
      if (!outcome && body.input.text.toLowerCase().includes("hint"))
        faux.setResponses([
          fauxAssistantMessage([
            fauxText(
              "Look at how the derivative changes sign around the stationary point. Which direction lowers the value?",
            ),
          ]),
        ]);
      else
        faux.setResponses([
          fauxAssistantMessage(
            [
              fauxToolCall(
                "conclude",
                {
                  outcome: outcome ?? "solved",
                  verdict:
                    "You connected the derivative to the direction of change.",
                  rung: outcome === "solvedWithHints" ? "R2" : null,
                  missClass: null,
                  retest: false,
                },
                { id: "conclude-" + crypto.randomUUID() },
              ),
            ],
            { stopReason: "toolUse" },
          ),
          fauxAssistantMessage([
            fauxText(
              "The stationary point is a local minimum. Choose Next problem when you are ready.",
            ),
          ]),
        ]);
    } else
      faux.setResponses([
        fauxAssistantMessage(
          [
            fauxToolCall(
              "problem",
              {
                statement:
                  "For f(x) = x², explain why a small step opposite its derivative moves toward x = 0.",
                mode: scenario?.includes("discrimination")
                  ? "discrimination"
                  : scenario?.includes("composition")
                    ? "composition"
                    : "recall",
                target: ["gradients"],
                modelSolution:
                  "Since f′(x) = 2x, the update x − η2x moves toward zero for a sufficiently small positive η.",
              },
              { id: "problem-" + crypto.randomUUID() },
            ),
          ],
          { stopReason: "toolUse" },
        ),
      ]);
    const engine = { model: faux.getModel(), streamFn: faux.streamSimple };
    return runFixtureTurn(
      body,
      (opts) =>
        createPracticeAgent(
          { chatId: body.chatId, chatStore },
          { engine, messages: opts.messages },
        ),
    );
  }
  if (record && !record.tree && scenario !== "handoff")
    chatStore.saveTree(body.chatId, {
      version: 1,
      nodes: [
        {
          id: "slopes",
          title: "Local slopes",
          summary: "How a function changes nearby.",
        },
        {
          id: "gradients",
          title: "The gradient",
          summary: "Slopes collected into a direction.",
        },
        {
          id: "descent",
          title: "Descent steps",
          summary: "Move against the direction of increase.",
        },
      ],
      edges: [
        { from: "slopes", to: "gradients" },
        { from: "gradients", to: "descent" },
      ],
    });
  if (body.input.type === "answer")
    faux.setResponses([
      fauxAssistantMessage([
        fauxText(
          "Exactly. A negative-gradient step moves in the direction of the steepest local decrease. The key word is **local**: the step must be small enough for the slope to describe what happens.",
        ),
      ]),
    ]);
  else
    faux.setResponses([
      fauxAssistantMessage(
        [
          fauxText(
            "A gradient collects the slope in every direction. Imagine standing on a hillside: moving east changes your height, and moving north changes it too. The gradient combines those changes into one direction.",
          ),
          fauxToolCall(
            "quiz",
            {
              type: "predict",
              nodeId: "gradients",
              question:
                "If you move a small step opposite the gradient, what happens to the function?",
              options: [
                { label: "It increases as quickly as possible" },
                { label: "It decreases most rapidly locally" },
                { label: "It stays at the same value" },
              ],
              correctAnswer: "It decreases most rapidly locally",
              explanation:
                "The negative gradient points toward the steepest local decrease.",
            },
            { id: "question-" + crypto.randomUUID() },
          ),
        ],
        { stopReason: "toolUse" },
      ),
    ]);
  if (body.input.type !== "answer" && scenario && scenario !== "stream") {
    const quiz = {
      type: "predict",
      nodeId: "gradients",
      question: "Which values are even?",
      options: [
        { label: "Two", value: "two" },
        { label: "Three", value: "three" },
        { label: "Four", value: "four" },
      ],
      correctAnswer: ["two", "four"],
      multiSelect: true,
      explanation: "Two and four are divisible by two.",
    };
    const configurations: Record<string, { tool: string; input: any }> = {
      multi: { tool: "quiz", input: quiz },
      explain: {
        tool: "explain",
        input: {
          type: "check",
          nodeId: "gradients",
          question: "Explain why $2+2=4$.",
          correctAnswer:
            "Combining two objects with two more gives four objects.",
        },
      },
      ask: {
        tool: "ask_user_question",
        input: { question: "What would you like to understand?" },
      },
      "ask-choice": {
        tool: "ask_user_question",
        input: {
          question: "Choose a learning approach.",
          options: [
            { label: "Examples", value: "examples" },
            { label: "Derivations", value: "derivations" },
          ],
        },
      },
      "ask-multi": {
        tool: "ask_user_question",
        input: {
          question: "Choose your learning goals.",
          multiSelect: true,
          options: [
            { label: "Examples", value: "examples" },
            { label: "Derivations", value: "derivations" },
          ],
        },
      },
      probe: {
        tool: "probe",
        input: { ...quiz, type: undefined, nodeId: undefined },
      },
      recall: {
        tool: "recall",
        input: {
          question: "Explain why adding equal values preserves equality.",
          correctAnswer:
            "The same operation on equal inputs has equal outputs.",
        },
      },
    };
    const config = configurations[scenario];
    if (config)
      faux.setResponses([
        fauxAssistantMessage(
          [
            fauxText(
              "A scripted question exercises the committed answer contract.",
            ),
            fauxToolCall(config.tool, config.input, {
              id: "fixture-" + crypto.randomUUID(),
            }),
          ],
          { stopReason: "toolUse" },
        ),
      ]);
  }
  if (scenario === "stream")
    faux.setResponses([
      fauxAssistantMessage(
        Array.from(
          { length: 20 },
          (_, i) =>
            `Paragraph ${i + 1}. A gradient combines local rates of change. Small steps follow the slope, so a learner can connect the direction of motion with the change in value. This paragraph supplies a deterministic stream while the knowledge map remains interactive.\n\n`,
        ).join(""),
      ),
    ]);
  if (scenario === "rich")
    faux.setResponses([
      fauxAssistantMessage(
        "# Rendering checks\n\n> [!NOTE]\n> A useful note.\n\n$$\na+b=b+a\n$$\n\n| Term | Meaning |\n| --- | --- |\n| Equal | Same value |\n\n```js\nconst count = 2;\n```\n\n```mermaid\ngraph LR\n A[Input] --> B[Result]\n```",
      ),
    ]);
  if (scenario === "siblings" && body.input.type !== "answer") {
    const call = (id: string) => fauxToolCall("quiz", { type: "predict", nodeId: "gradients", question: "Sibling " + id, options: [{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }], correctAnswer: "Yes", explanation: "The original answer is Yes." }, { id });
    faux.setResponses([fauxAssistantMessage([call("sibling-one"), call("sibling-two")], { stopReason: "toolUse" })]);
  }
  if (scenario === "handoff") {
    faux.setResponses(!hasProbeDone(record?.messages ?? []) ? [
      fauxAssistantMessage([fauxToolCall("probe_done", { assessment: { strands: [{ strand: "Arithmetic", assessment: "Addition is reliable; equality needs a derivation." }], summary: "Start from equal values." } })], { stopReason: "toolUse" }),
      fauxAssistantMessage("The assessment is complete; the teacher will propose an approach."),
    ] : [
      fauxAssistantMessage([fauxToolCall("plan_init", { mermaid: "graph TD\n equality[Equal values] --> substitution[Substitution]" })], { stopReason: "toolUse" }),
      fauxAssistantMessage("Here is the approach. Shall we proceed from equal values?"),
    ]);
  }
  if (["jobs", "job-slow", "job-failure"].includes(scenario ?? "")) {
    faux.setResponses(body.input.type === "text" ? [
      fauxAssistantMessage([
        fauxToolCall("research", { question: scenario === "job-slow" ? "slow" : scenario === "job-failure" ? "fail" : "Saved research question" }),
        ...(scenario === "jobs" ? [fauxToolCall("visual", { brief: "A small self-contained SVG fixture" })] : []),
        fauxToolCall("quiz", { type: "predict", nodeId: "gradients", question: "Wait here while work finishes?", options: [{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }], correctAnswer: "Yes", explanation: "The result waits for this answer." }),
      ], { stopReason: "toolUse" }),
    ] : [fauxAssistantMessage("The answer and any saved background results are acknowledged.")]);
  }
  if (scenario === "plan" || scenario === "rewrite")
    faux.setResponses([
      fauxAssistantMessage(
        [
          fauxToolCall(
            "plan_init",
            {
              mermaid:
                scenario === "plan"
                  ? "graph TD\n foundations[Equal values] --> addition[Adding equal amounts] --> result[Preserved equality]"
                  : "graph TD\n foundations[Equal values] --> substitution[Substitution] --> result[Preserved equality]",
            },
            { id: "plan-" + crypto.randomUUID() },
          ),
        ],
        { stopReason: "toolUse" },
      ),
      fauxAssistantMessage([
        fauxText("The dependency plan is ready for your review."),
      ]),
    ]);
  const engine = { model: faux.getModel(), streamFn: faux.streamSimple };
  return runFixtureTurn(
    body,
    (opts) =>
      (["probe", "recall"].includes(scenario ?? "") || scenario === "handoff" && !hasProbeDone(record?.messages ?? []))
        ? createProberAgent(
            {
              chatId: body.chatId,
              chatStore,
              jobStore,
              spawn: () => {},
              deliver: (steer) => { void deliverJobResult(steer); },
            },
            {
              engine,
              messages: opts.messages,
              toolToggles: { explain: scenario === "recall" },
            },
          )
        : createTeacherAgent(
            { chatId: body.chatId, chatStore, jobStore, spawn: (job, input) => { void fixtureJobRunner(input).runJob(job.id, input); } },
            {
              engine,
              messages: opts.messages,
              toolToggles: { explain: scenario === "explain" },
            },
          ),
  );
}

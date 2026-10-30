/** Adapted engine-only cases from LearnHarness dc4c398 tests/demos.test.tsx. AGPL-3.0-only. */
import assert from "node:assert/strict";
import {describe,it} from "node:test";
import {createCanvas} from "@napi-rs/canvas";
import {createFauxCore,fauxAssistantMessage,fauxToolCall,type FauxResponseStep,type ToolCall} from "@earendil-works/pi-ai";
import type {PiEngine} from "../src/agent/models.ts";
import {runDemoBuilder} from "../src/agent/subagents/demo-builder.ts";
import {runVisualMaker} from "../src/agent/subagents/visual-maker.ts";
import type {DemoRunResult,HeadlessApi} from "../src/agent/subagents/headless.ts";
function scriptedModel(turns: Array<{ toolCalls?: Array<{ toolCallId: string; toolName: string; input: unknown }>; text?: string }>): PiEngine {
	const steps: FauxResponseStep[] = turns.map((step) => {
		if (step.toolCalls) {
			return fauxAssistantMessage(
				step.toolCalls.map((c) => fauxToolCall(c.toolName, c.input as ToolCall["arguments"], { id: c.toolCallId })),
				{ stopReason: "toolUse" },
			);
		}
		return fauxAssistantMessage(step.text ?? "");
	});
	const faux = createFauxCore({ tokenSize: { min: 64, max: 64 } });
	faux.setResponses(steps);
	return { model: faux.getModel(), streamFn: faux.streamSimple };
}

// ─── fake headless ───────────────────────────────────────────────────────────

const CLEAN_RUN: DemoRunResult = { consoleErrors: [], pageErrors: [], failedRequests: [], ok: true };
const BROKEN_RUN: DemoRunResult = {
	consoleErrors: ["Uncaught ReferenceError: foo is not defined"],
	pageErrors: [],
	failedRequests: [],
	ok: false,
};

function fakeHeadless(opts: {
	/** Return BROKEN_RUN for html matching this substring, else CLEAN_RUN. */
	brokenWhenIncludes?: string;
	/** Throw for the first N renderSvg calls (then succeed). */
	renderFailures?: number;
} = {}): HeadlessApi & { demoRuns: string[]; svgRenders: string[] } {
	const api = {
		demoRuns: [] as string[],
		svgRenders: [] as string[],
		available() {
			return true;
		},
		unavailableReason() {
			return null;
		},
		async runDemo(html: string): Promise<DemoRunResult> {
			api.demoRuns.push(html);
			return opts.brokenWhenIncludes && html.includes(opts.brokenWhenIncludes) ? BROKEN_RUN : CLEAN_RUN;
		},
		async renderSvg(svg: string): Promise<Buffer> {
			api.svgRenders.push(svg);
			if (opts.renderFailures && api.svgRenders.length <= opts.renderFailures) {
				throw new Error("XML parse error");
			}
			// The shared native image processor decodes renders, so a signature
			// alone is no longer a successful fake raster.
			const canvas = createCanvas(1, 1);
			canvas.getContext("2d").fillRect(0, 0, 1, 1);
			return canvas.toBuffer("image/png");
		},
	};
	return api as HeadlessApi & { demoRuns: string[]; svgRenders: string[] };
}

function noChromeHeadless(): HeadlessApi {
	return {
		available: () => false,
		unavailableReason: () => "No Chrome/Chromium found for headless testing. Install Google Chrome or set CHROME_PATH.",
		runDemo: async () => {
			throw new Error("should not run");
		},
		renderSvg: async () => {
			throw new Error("should not render");
		},
		renderPdfPages: async () => {
			throw new Error("should not render");
		},
	};
}

const BROKEN_HTML = "<!doctype html><html><body>BROKEN<script>foo();</script></body></html>";
const GOOD_HTML = "<!doctype html><html><body><canvas id=\"c\"></canvas><script>requestAnimationFrame(function step(){});</script></body></html>";

describe("demo builder (fake model + fake headless)", () => {
	it("iterates write → run → fix → run → clean → delivers with notes", async () => {
		const headless = fakeHeadless({ brokenWhenIncludes: "BROKEN" });
		const activities: string[] = [];
		const model = scriptedModel([
			{ toolCalls: [{ toolCallId: "w1", toolName: "write_demo", input: { html: BROKEN_HTML } }] },
			{ toolCalls: [{ toolCallId: "r1", toolName: "run_demo", input: {} }] },
			{ toolCalls: [{ toolCallId: "w2", toolName: "write_demo", input: { html: GOOD_HTML } }] },
			{ toolCalls: [{ toolCallId: "r2", toolName: "run_demo", input: { probe: "typeof step === 'function'" } }] },
			{ text: "Drag the damping slider to see the oscillation decay." },
		]);

		const result = await runDemoBuilder(
			{ title: "Damped oscillator", brief: "A mass on a spring with a damping slider." },
			{ engine: model, headless, onActivity: (line) => activities.push(line) },
		);

		assert.equal(result.title, "Damped oscillator");
		assert.equal(result.html, GOOD_HTML, "delivers the FIXED html");
		assert.equal(result.tested, true);
		assert.equal(result.notes, "Drag the damping slider to see the oscillation decay.");
		assert.equal(headless.demoRuns.length, 2, "ran the broken demo, then the fixed one — no extra verification needed");
		assert.ok(activities.some((a) => a.startsWith("run_demo: 1 console error")), `activity recorded per iteration: ${activities.join(" | ")}`);
		assert.ok(activities.includes("run_demo: clean"), "clean run recorded in activity");
	});

	it("verifies headlessly even when the model forgets run_demo before finishing", async () => {
		const headless = fakeHeadless();
		const model = scriptedModel([
			{ toolCalls: [{ toolCallId: "w1", toolName: "write_demo", input: { html: GOOD_HTML } }] },
			{ text: "Done." },
		]);
		const result = await runDemoBuilder({ title: "T", brief: "b" }, { engine: model, headless });
		assert.equal(result.html, GOOD_HTML);
		assert.equal(result.tested, true, "tested by the final verification gate");
		assert.equal(headless.demoRuns.length, 1, "the gate ran the demo once itself");
	});

	it("fails (empty html + FAILED notes) when the demo never passes verification", async () => {
		const headless = fakeHeadless({ brokenWhenIncludes: "BROKEN" });
		const model = scriptedModel([
			{ toolCalls: [{ toolCallId: "w1", toolName: "write_demo", input: { html: BROKEN_HTML } }] },
			{ text: "It works, trust me." },
		]);
		const result = await runDemoBuilder({ title: "T", brief: "b" }, { engine: model, headless });
		assert.equal(result.html, "");
		assert.equal(result.tested, true, "the loop ran");
		assert.match(result.notes ?? "", /^FAILED:/);
		assert.match(result.notes ?? "", /ReferenceError/);
	});

	it("fails fast with a clear message when no Chrome is available (never skips testing)", async () => {
		const model = scriptedModel([{ text: "should never be reached" }]);
		const result = await runDemoBuilder({ title: "T", brief: "b" }, { engine: model, headless: noChromeHeadless() });
		assert.equal(result.html, "");
		assert.match(result.notes ?? "", /^FAILED: .*Chrome/);
	});

	it("fails when the model never writes a demo", async () => {
		const model = scriptedModel([{ text: "I cannot build this." }]);
		const result = await runDemoBuilder({ title: "T", brief: "b" }, { engine: model, headless: fakeHeadless() });
		assert.equal(result.html, "");
		assert.match(result.notes ?? "", /^FAILED: the builder never wrote a demo/);
	});
});

// ─── 4. the visual-maker loop ────────────────────────────────────────────────

const SVG_1 = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100"><line x1="10" y1="50" x2="290" y2="50"/></svg>';

describe("visual maker (fake model + fake headless)", () => {
	it("write → render → look → finish delivers the svg with notes", async () => {
		const headless = fakeHeadless();
		const model = scriptedModel([
			{ toolCalls: [{ toolCallId: "w1", toolName: "write_svg", input: { svg: SVG_1 } }] },
			{ toolCalls: [{ toolCallId: "r1", toolName: "render_svg", input: {} }] },
			{ text: "A number line from -3 to 3 with the root marked at 0." },
		]);
		const activities: string[] = [];
		const result = await runVisualMaker({ brief: "Number line, root at 0." }, { engine: model, headless, onActivity: (l) => activities.push(l) });

		assert.equal(result.svg, SVG_1);
		assert.equal(result.notes, "A number line from -3 to 3 with the root marked at 0.");
		assert.equal(headless.svgRenders.length, 1);
		assert.ok(activities.some((a) => a.startsWith("render_svg")), "render activity recorded");
	});

	it("forces a look when the model finishes without rendering the final svg", async () => {
		const headless = fakeHeadless();
		const model = scriptedModel([
			{ toolCalls: [{ toolCallId: "w1", toolName: "write_svg", input: { svg: SVG_1 } }] },
			{ text: "Done." }, // premature finish — no render yet
			{ text: "Looked at it — correct." }, // after the forced look
		]);
		const result = await runVisualMaker({ brief: "b" }, { engine: model, headless });
		assert.equal(result.svg, SVG_1, "delivered after the forced look");
		assert.equal(result.notes, "Looked at it — correct.");
		assert.equal(headless.svgRenders.length, 1, "the gate rendered the svg once itself");
	});

	it("edit_svg: exact-match single replacement, with fuzzy context on a miss", async () => {
		const headless = fakeHeadless();
		const model = scriptedModel([
			{ toolCalls: [{ toolCallId: "w1", toolName: "write_svg", input: { svg: SVG_1 } }] },
			{ toolCalls: [{ toolCallId: "r1", toolName: "render_svg", input: {} }] },
			// A miss: old_text not in the document (error fed back, nothing changed)
			{ toolCalls: [{ toolCallId: "e1", toolName: "edit_svg", input: { old_text: "NOT-PRESENT", new_text: "x" } }] },
			// A hit: exactly one occurrence — applied
			{ toolCalls: [{ toolCallId: "e2", toolName: "edit_svg", input: { old_text: '<line x1="10"', new_text: '<line x1="20"' } }] },
			{ toolCalls: [{ toolCallId: "r2", toolName: "render_svg", input: {} }] },
			{ text: "Moved the start of the line." },
		]);
		const result = await runVisualMaker({ brief: "b" }, { engine: model, headless });

		assert.equal(result.svg, SVG_1.replace('<line x1="10"', '<line x1="20"'), "the edit was applied to the delivered svg");
		assert.equal(result.notes, "Moved the start of the line.");
		assert.equal(headless.svgRenders.length, 2, "re-rendered after the edit (the look gate saw the change)");
	});

	it("edit_svg before write_svg errors and never edits nothing into a deliverable", async () => {
		const headless = fakeHeadless();
		const model = scriptedModel([
			// Nothing written yet — the edit must error, not crash the loop
			{ toolCalls: [{ toolCallId: "e0", toolName: "edit_svg", input: { old_text: "svg", new_text: "x" } }] },
			{ text: "Cannot proceed." },
		]);
		const result = await runVisualMaker({ brief: "b" }, { engine: model, headless });
		assert.equal(result.svg, "", "the failed edit produced no deliverable");
		assert.match(result.notes ?? "", /never wrote an SVG/);
	});

	it("feeds render errors back to the model instead of crashing", async () => {
		const headless = fakeHeadless({ renderFailures: 1 });
		const model = scriptedModel([
			{ toolCalls: [{ toolCallId: "w1", toolName: "write_svg", input: { svg: "<svg>broken" } }] },
			{ toolCalls: [{ toolCallId: "r1", toolName: "render_svg", input: {} }] },
			{ toolCalls: [{ toolCallId: "w2", toolName: "write_svg", input: { svg: SVG_1 } }] },
			{ toolCalls: [{ toolCallId: "r2", toolName: "render_svg", input: {} }] },
			{ text: "Fixed and verified." },
		]);
		const result = await runVisualMaker({ brief: "b" }, { engine: model, headless });
		assert.equal(result.svg, SVG_1);
		assert.equal(result.notes, "Fixed and verified.");
	});

	it("fails when the model never writes an svg", async () => {
		const model = scriptedModel([{ text: "This idea is purely relational — belongs in mermaid." }]);
		const result = await runVisualMaker({ brief: "b" }, { engine: model, headless: fakeHeadless() });
		assert.equal(result.svg, "");
		assert.match(result.notes ?? "", /^FAILED: the maker never wrote an SVG/);
	});

	it("fails with a clear message when no Chrome is available", async () => {
		const result = await runVisualMaker({ brief: "b" }, { engine: scriptedModel([{ text: "x" }]), headless: noChromeHeadless() });
		assert.equal(result.svg, "");
		assert.match(result.notes ?? "", /^FAILED: .*Chrome/);
	});
});


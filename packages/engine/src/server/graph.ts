import { database } from '../../../storage/index.ts';
import { commitDeletion } from '../../../storage/library.ts';
import * as fs from "node:fs";
import { LEDGER_FILES, POSITIONS_FILE } from "../../config.ts";
import type { GraphSnapshot } from "../core/contracts.ts";
import type { GraphCostSummary } from "../core/cost-summary.ts";
import { graphCostSummary } from "../core/cost-summary.ts";
import { graphSnapshot } from "../core/graph.ts";
import { birthSessionPartition } from "../core/session-clusters.ts";
import {
	deleteNodeTraces,
	type NodeDeletionStats,
} from "../core/graph-deletion.ts";
import { extractionStatuses } from "../agent/subagents/extraction.ts";
import { stores } from "./stores.ts";
import { callCost } from "./pricing.ts";

/**
 * Server-side graph entry for the home view (GET /api/graph). A PURE READ:
 * the extraction pipeline (the sole graph writer) is triggered by quiz
 * answers in sessions (turn-service), never from here — the home view
 * reflects whatever the pipeline has merged so far.
 */
export function graphView(): GraphSnapshot {
	return graphSnapshot(stores);
}

/** The graph view's cost surface (GET /api/graph/costs — the 2026-09 cost
 *  pill): fold every usage channel into stage totals + recent runs. A pure
 *  read over the chat records (chat-front-door runs), the notes sources
 *  (notes-front-door runs), and the naming ledger (graph-global runs);
 *  dollars are inferred by the pure core fold (core/cost-summary.ts +
 *  prices.ts) — nothing here stores or caches money. */
export function graphCosts(): GraphCostSummary {
	const chats = stores.chatStore
		.listChats()
		.flatMap((summary) => {
			const record = stores.chatStore.getChat(summary.id);
			return record?.extractions?.length
				? [{ title: record.title ?? summary.id, extractions: record.extractions }]
				: [];
		});
	const sources = stores.graphStore
		.readSources()
		.filter((s) => s.extractions?.length)
		.map((s) => ({ filePath: s.filePath, extractions: s.extractions! }));
	return graphCostSummary({ chats, sources }, callCost);
}

/** Monotonic transactional revision, including empty rewrites and layout changes. */
export function graphRevision(): number { return database().preference<number>('graph-revision') ?? 0; }

// ─── single-node deletion (node interlude, owner-locked full-death) ──────────

/** What deleteGraphNode did — the route maps it straight to HTTP. */
export type NodeDeleteOutcome =
	| { ok: false; status: 404; code: "not_found"; error: string }
	| { ok: false; status: 409; code: "extraction_running"; error: string }
	| { ok: true; stats: NodeDeletionStats; graphRevision: number; undoId?: string };

/**
 * Delete one node by id — FULL DEATH (core/graph-deletion.ts for the
 * ledger semantics). The guard family is deliberately NOT the chat
 * one, and the reasoning is worth writing down:
 *
 *   - No turn/jobs gates. Turns and background jobs never write the
 *     graph ledgers; a turn's follow-up extraction registers as a run,
 *     and every code path here is synchronous — nothing can register
 *     or merge between the gate and the ledger rewrite (the event loop
 *     never yields inside this function).
 *   - THE EXTRACTION GATE — 409 while ANY pipeline run is registered,
 *     anywhere. A mid-flight run holds findings extracted from
 *     transcripts that predate the deletion; its merges could re-add
 *     aliases, provenance, or events to the dying node (the
 *     re-reference risk the dispatch flags). Unlike chat deletion we
 *     do NOT abort the run: it belongs to some session, and killing
 *     that session's spend is outside this deletion's blast radius —
 *     the UI retries once the dock drains. A run that starts AFTER
 *     the deletion is legitimate re-learning: it reads post-deletion
 *     ledgers, mints a fresh node for a re-taught topic, and
 *     mergeFindings ignores linkTo ids that no longer exist (the
 *     existingIds guard) — no dangling edges, no resurrection.
 */
function deleteGraphNodeImpl(nodeId: string): NodeDeleteOutcome {
	if (extractionStatuses().length > 0) {
		return {
			ok: false,
			status: 409,
			code: "extraction_running",
			error: "An extraction is running — try again when it finishes",
		};
	}
	// THE SYNC BLOCK — no awaits below (the doc above): the gate and the
	// rewrite are one atomic stretch of the event loop.
	const stats = deleteNodeTraces(stores.graphStore, nodeId);
	if (stats === null) {
		return { ok: false, status: 404, code: "not_found", error: "No such node" };
	}
	return { ok: true, stats, graphRevision: graphRevision() };
}


export function deleteGraphNode(nodeId:string, recordUndo = true):NodeDeleteOutcome {
	return recordUndo ? commitDeletion(() => deleteGraphNodeImpl(nodeId)) : database().transaction(() => deleteGraphNodeImpl(nodeId));
}

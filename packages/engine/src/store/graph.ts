// Adapted LearnHarness GraphStore: preserve ordered assertions; derived graph remains engine-owned.
import { database } from '../../../storage/index.ts';
import type { GraphStore } from '../core/ports.ts';
import type { NotesSource,Position,GraphNode,GraphChain,ProvenancePoint,CoverageEntry,SessionCheckpoint } from '../core/contracts.ts';
function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null;
}

const isString = (v: unknown): v is string => typeof v === "string";

/** Provenance points are (chatId, messageId) pairs — message-granular. */
const isProvenancePoint = (v: unknown): v is ProvenancePoint =>
	isRecord(v) && isString(v.chatId) && isString(v.messageId);


const isGraphNode = (v: unknown): v is GraphNode =>
	isRecord(v) &&
	isString(v.id) &&
	isString(v.name) &&
	isString(v.statement) &&
	Array.isArray(v.aliases) &&
	v.aliases.every(isString) &&
	isString(v.createdAt) &&
	Array.isArray(v.provenance) &&
	v.provenance.every(isProvenancePoint);

/** A chain line: premises ≥ 1 (a chain IS an argument — bare propositions
 *  ride the node ledger alone), every member a string, conclusion a string.
 *  Endpoint EXISTENCE is the derivation's concern (it drops dangling
 *  chains); the store only shapes. */
const isGraphChain = (v: unknown): v is GraphChain =>
	isRecord(v) &&
	isString(v.id) &&
	Array.isArray(v.premises) &&
	v.premises.length > 0 &&
	v.premises.every(isString) &&
	isString(v.conclusion) &&
	Array.isArray(v.provenance) &&
	v.provenance.every(isProvenancePoint) &&
	isString(v.createdAt);

const isCheckpoint = (v: unknown): v is SessionCheckpoint =>
	isRecord(v) && isString(v.chatId) && isString(v.foldedAt);

const isCoverageEntry = (v: unknown): v is CoverageEntry =>
	isRecord(v) && isString(v.chatId) && isString(v.fp) && typeof v.tokens === "number" && isString(v.foldedAt);


const d=()=>database();
export const graphStore:GraphStore={
 appendNode:n=>{d().append('nodes',n);d().index('concept',n.id,n.name,n.statement);},readNodes:()=>d().ledger('nodes').filter(isGraphNode),
 appendChain:n=>d().append('chains',n),readChains:()=>d().ledger('chains').filter(isGraphChain),
 appendCheckpoint:n=>d().append('checkpoints',n),readCheckpoints:()=>d().ledger('checkpoints').filter(isCheckpoint),
 appendCoverage:n=>d().append('coverage',n),readCoverage:()=>d().ledger('coverage').filter(isCoverageEntry),
 upsertSource(s){const old=d().get<NotesSource>('source',s.id);d().put('source',s.id,old?{...s,extractions:old.extractions}:s);},
 readSources:()=>d().all('source'),
 appendSourceUsage(id,e){const s=d().get<NotesSource>('source',id);if(s&&!s.extractions?.some(x=>x.startedAt===e.startedAt))d().put('source',id,{...s,extractions:[...(s.extractions??[]),e]});},
 readPositions:()=>d().preference<Record<string,Position>>('positions')??{},writePositions:p=>d().transaction(()=>{d().setPreference('positions',p);d().bumpGraphRevision();}),
 rewriteLedgers(next){d().transaction(()=>{
  for(const [k,v]of Object.entries(next))if(v)d().rewrite(k,v);
  if(next.nodes){
   d().db.prepare('DELETE FROM search_index WHERE kind=?').run('concept');
   const nodes=new Map<string,{name:string;texts:Set<string>}>();
   for(const node of next.nodes){const item=nodes.get(node.id)??{name:node.name,texts:new Set<string>()};for(const text of [node.name,node.statement,...node.aliases])item.texts.add(text);nodes.set(node.id,item);}
   for(const [id,node]of nodes)d().index('concept',id,node.name,[...node.texts].join('\n'));
  }
 });}
};

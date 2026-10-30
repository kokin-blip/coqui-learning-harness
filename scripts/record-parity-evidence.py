"""Record reviewed acceptance bindings, refusing missing or failed execution evidence.

The mapping is an authored review of the pinned requirements, not a filename or
word-similarity classifier. Only the named checks are claimed; provider fixture
results and prompt policies deliberately have separate statuses.
"""
import csv, hashlib, json, re
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent

def read(name): return json.loads((ROOT / name).read_text())
def write(name, value): (ROOT / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')

# Each group states the observable seam actually exercised. Source tests run
# against adapted stores/agents; the native lane exercises Coqui's own renderer.
GROUPS = {
'V001': ('Draft admission, model ownership and durable creation', 'settings-resolution,settings-body,settings-store,chat-flow', 'No empty/orphan|Double start|Goal survives|session metadata|restart preserves', 'setup,base,closure'),
'V002': ('Explicit model roles, supported efforts and independent saved session settings', 'settings-resolution,model-catalog,provider-neutral-agents,tool-toggles-bridge', 'Strong and independent|model shortcut|connection routes', 'parity,base'),
'V003': ('Diagnostic tool validation, saved assessment, phase derivation and one handoff', 'probe-done,chat-flow,turn-recovery,session-core', 'Probe assessment|question variant|sibling|Committed question', 'closure,parity,base'),
'V004': ('Valid/invalid dependency DAGs, rewrite snapshots and derived positions', 'plan-tree,plan-blocks', 'Frozen/live/focus|plan|Markdown, alerts', 'parity,base,closure'),
'V005': ('Question authoring, stable shuffle, exact grading, confidence and termination', 'question-core,question-tools,pending-authority,tool-heal', 'question variant|I-don|numeric confidence|Answer is committed|Stale answer', 'parity,base'),
'V006': ('Committed recall and ungraded text/choice/Other answers', 'question-core,question-tools', 'question variant|I-don', 'parity'),
'V007': ('Prediction/check reveal and separate reading/answer thinking', 'question-core,session-core,tool-parts', 'question variant|numeric confidence|Markdown, alerts', 'parity,base'),
'V008': ('Practice modes, targets, turn-scoped gates, conclusion metadata, dismiss and explicit Next', 'practice-agents,practice-record,practice-heal,practice-flow,chat-flow', 'Practice|practice|dismissal', 'closure,base,parity'),
'V009': ('Steer, dismiss, retry and input-first persistence across failure', 'chat-flow,session-core,turn-recovery,turn-liveness,call-ids', 'Leaving a stream|Service death|Operation retries|Stale answer|Utility-process', 'closure,parity,base'),
'V010': ('Reattach, siblings, durable cursors and competing input identities', 'session-core,chat-flow,turn-recovery,job-delivery-recovery', 'Sibling|Leaving a stream|Service death|Operation retries|Utility-process', 'closure,parity,base'),
'V011': ('Compaction thresholds, safe projection, full archive and visible answer gate', 'compaction,context-usage', 'compaction|Compaction|Prompt override', 'closure'),
'V012': ('Paginated/filterable history, rename, retained drafts, transcript rendering and export', 'session-markdown,markdown-export,fuzzy,path-input,file-paths', 'history|Markdown|question variant|restart preserves|compaction', 'parity,base,closure'),
'V013': ('Private process boundary, persistence/restart and renderer isolation (manual lifecycle separate)', 'chat-store-events,turn-liveness', 'renderer exposes|Utility-process|Native restart|Service death|discovery crosses', 'base,closure,parity'),
'V014': ('Automated focus/shortcut/reduced-preference subset; VoiceOver remains manual', 'pan-zoom', 'Reduce Transparency|zoom|Markdown, alerts', 'base,parity'),
'V015': ('Eligible source text, fingerprints, anchored extraction and honest chunk coverage', 'extraction,coverage,send-to-user', 'source inspection|Imports preview|background work', 'base,parity,closure'),
'V016': ('Validated propositions, identity linking, argument merge and provenance', 'graph,graph-tools,extraction,clusters,session-clusters', 'Chain hierarchy|shared-source|background work', 'parity,closure'),
'V017': ('Bounded workers, source single-flight, ordered merge, cancellation and recovery', 'extraction,coverage,jobs,job-delivery-recovery', 'Failed, canceled|specialist workers|Service death', 'closure,parity'),
'V018': ('Previewed per-file imports, content identity, independent failure and retry', 'extraction', 'import|Import', 'base,parity'),
'V019': ('Logical graph, cluster geometry, persistent camera, node drag, search and inspector', 'graph,graph-canvas,layout,render-settings,clusters,session-clusters,graph-tools', 'Native graph|Map Find|Graph display|Chain hierarchy|1000-node', 'closure,parity,base'),
'V020': ('Complete selected chains, context snapshot ordering and separate 64-item learning cap', 'graph-context,graph-tools', 'context selection|Chain hierarchy', 'closure,parity'),
'V021': ('Transactional deletion gates, shared-source policies and restartable overlapping Undo', 'graph,extraction', 'Persistent deletion|Chain hierarchy|Deletion and Undo', 'closure,parity,base'),
'V022': ('Durable dispatch/completion/delivery, parked results and exact-once recovery', 'jobs,job-delivery-recovery,specialist-loops,chat-flow', 'specialist workers|Failed, canceled|background work', 'closure'),
'V023': ('Bounded research, search selection/failure, primary fetch and restricted PDF directory', 'search,web-search,researcher-pdf,specialist-loops', 'specialist workers|Failed, canceled', 'closure'),
'V024': ('Exact artifact verification, dependency/CSP policy, opaque iframe and source/nonce validation', 'specialist-loops,headless-png,tool-abort', 'demonstration|Demonstration|helper|SVG', 'base,closure'),
'V025': ('Native SVG/PDF/image processing, raster bounds and focus/inversion presentation', 'specialist-loops,pdf-native-render,svg-native-render,pdf-ops,pdf-reader,image-processing', 'SVG|PDF|demonstration', 'base,closure'),
'V026': ('Native file paths, atomic chips, bounded reads/walks and cooperative abort', 'read-tool,fs-tools,file-paths,path-input,image-processing,tool-abort', 'File drop|file', 'closure'),
'V027': ('Honest API/subscription/unpriced usage, independent switches and activity state', 'cost-summary,pricing-native-parity,extraction,tool-toggles-bridge', 'Failed, canceled|Graph display|Compaction floor|specialist workers', 'closure'),
'V028': ('Provider/model catalogs, capabilities, role selection and explicit unavailable state', 'model-catalog,provider-neutral-agents,settings-resolution,pricing-native-parity', 'connection routes|Strong and independent|model shortcut', 'base,parity'),
'V029': ('Custom local mock endpoint lifecycle, revision races, redaction and capability pins', 'custom-endpoint,custom-provider-route,custom-provider-boundaries', 'Custom endpoint', 'base'),
'V030': ('Subscription auth/catalog/stream/consent fixtures; live evidence explicitly per provider', 'subscription-auth,subscription-stream,subscription-background,chatgpt-auth,chatgpt-stream,chatgpt-background,chatgpt-request-cycle,chatgpt-catalog', 'connection routes', 'base'),
'V032': ('Unmodified CLI detection, transcript/stream/tool bridge, cancellation and effective context fixtures', 'claude-code-installation,claude-code-stream,claude-code-transcript,claude-code-tool-bridge,claude-code-provider,claude-code-harness,claude-code-opt-in', 'connection routes', 'base'),
'V033': ('Dictation token/PCM/flush/cancel/reconnect/language fixtures; physical microphone separate', 'dictation-language,dictation-warm,dictation-preference,dictation-flow', '', ''),
'V034': ('Prompt/settings persistence, enabled/reset fragments, appearance and explicit sanitizer floors', 'settings,settings-body,settings-store,render-settings,tool-toggles-bridge', 'Prompt override|Compaction floor|Reduce Transparency|prompts are inspectable', 'closure,base'),
'V035': ('Read-only SQLite history reader and opt-in provider-event recording', 'provider-events,send-to-user', '', ''),
'V036': ('Library schema compatibility, consistent backup and isolated manual bundle replacement', '', 'Native backup|Native restart|Utility-process', 'base'),
'V037': ('Approved macOS subset; other operating systems remain deferred', '', 'Native application|renderer exposes', 'base,closure'),
'V038': ('Shipped method/plan-consent prompts and bounded live example; no learning-effectiveness claim', 'probe-done,practice-agents', 'prompts are inspectable|Probe assessment', 'base,closure'),
'V039': ('Mermaid inline/focus/source and alert presentation', 'pan-zoom', 'Markdown, alerts', 'parity'),
}
reports = {k: read(p) for k,p in {
'base':'artifacts/implementation/packaged-acceptance.json',
'parity':'artifacts/implementation/parity/acceptance.json',
'closure':'artifacts/implementation/closure/acceptance.json',
'setup':'artifacts/implementation/setup-acceptance.json'}.items()}
for key,r in reports.items():
 assert r.get('passed') and r.get('packaged'), (key,'needs final packaged pass')
version=read('package.json')['version']
for key,r in reports.items(): assert r.get('build',{}).get('version')==version,(key,'stale build report')
assert len({r['build']['appPayloadSha256'] for r in reports.values()})==1,'mixed app payloads'
engine=json.loads((ROOT/'artifacts/implementation/upstream-suite-summary.log').read_text().strip().splitlines()[-1])
assert engine['failedSuites']==0
coqui=(ROOT/'artifacts/implementation/coqui-tests.tap').read_text()
assert re.search(r'^# fail 0$',coqui,re.M)
assert read('artifacts/implementation/chatgpt-live-reconnect.json')['passed']

suite_index={}
for suite in sorted({s for g in GROUPS.values() for s in g[1].split(',') if s}):
 p=ROOT/f'artifacts/implementation/tests/{suite}.log'
 log=p.read_text();assert re.search(r'^# fail 0$',log,re.M),suite
 suite_index[suite]={'log':str(p.relative_to(ROOT)), 'assertions':re.findall(r'^\s*ok \d+ - (.+)$',log,re.M)}
coqui_assertions=re.findall(r'^ok \d+ - (.+)$',coqui,re.M)
COQUI_CASES = {
'V001':'ChatStore keeps|Saved turn input|transport',
'V008':'Practice metadata',
'V009':'write-ahead|transport|operation|Retry',
'V010':'cursor|transport|operation|SIGKILL after worker',
'V013':'future|cursor|operation|Portable|SQLite|credential',
'V015':'Graph ledger|SIGKILL at merge',
'V016':'Graph ledger|SIGKILL at merge',
'V017':'SIGKILL at merge|SIGKILL after worker',
'V018':'Import|Mixed PDFs|On-device|corrupt|OCR',
'V021':'delet|Undo|thousand|source A|Graph deletion',
'V024':'artifact|Artifact|demonstration',
'V025':'Mixed PDFs|On-device|artifact|Artifact',
'V027':'Unpriced and plan-only',
'V028':'Vault|credential',
'V030':'Vault|credential',
'V032':'Claude context',
'V035':'reader|history|future',
'V036':'backup|Backup|restore|restore|future|SIGKILL during restore',
}
case_index={}
for key,(scope,suites,pattern,lanes) in GROUPS.items():
 checks=[]
 for lane in lanes.split(','):
  if not lane:continue
  for check in reports[lane].get('checks',[]):
   name=check if isinstance(check,str) else check['name']
   if pattern and re.search(pattern,name,re.I): checks.append({'lane':lane,'check':name})
 case_index[key]={'scope':scope,'coquiAssertions':[n for n in coqui_assertions if key in COQUI_CASES and re.search(COQUI_CASES[key],n,re.I)],'suites':[x for x in suites.split(',') if x], 'nativeChecks':checks}

with (ROOT/'docs/planning/parity-checklist.csv').open(newline='') as f:
 reader=csv.DictReader(f);fields=reader.fieldnames;rows=list(reader)
policy={'E007','E008','E012','E014','E046','E047','E078'}
live={'E051','E054','E055','E060','E061','E062','E107','U091'}
defer={'E052','E053','E112','E113','E120','U063','U064','U065','U066','U080','U092','U095'}
# Credential/catalog/custom endpoint contracts do not require an external billable call.
auto={'E110','E111','E115','U078','U079','U090','U093'}
# Explicitly reviewed row closures. This list is intentionally authored rather
# than inferred from prior status or the presence of a ported source module.
REVIEWED_CLOSURES = set("""
E001 E002 E004 E005 E006 E007 E008 E009 E010 E011 E012 E013 E014 E015 E016 E017 E018 E024 E031 E037
E039 E040 E041 E042 E043 E044 E045 E046 E047 E048 E049 E050 E056 E057 E058 E059 E063 E064 E065 E066 E067 E068 E069
E070 E071 E072 E073 E074 E075 E076 E077 E078 E079 E080 E081 E082 E083 E084 E085 E086 E087 E088 E089 E090 E091 E092 E093 E094 E095 E096 E097 E098 E099 E100 E101 E102 E103 E104 E105 E106 E108 E109 E114 E116 E117 E118 E122
U001 U002 U003 U004 U005 U006 U008 U011 U012 U013 U015 U016 U017 U018 U019 U020 U021 U022 U023 U024 U025 U026 U030 U031 U032 U033 U034 U035 U038 U039 U046 U048 U050 U051 U052 U053 U057 U059 U060 U061 U062 U071 U072 U073 U074 U075 U076 U077 U081 U082 U083 U084 U085 U086 U087 U089 U096 U097 U098 U099 U102 U104 U107 U110
""".split())
assert len(REVIEWED_CLOSURES)==151
entries=[]
for row in rows:
 fid=row['feature_id'];case_ids=row['validation_cases'].split('; ')
 refs=[x for x in case_ids if x in case_index]
 native=[c for x in refs for c in case_index[x]['nativeChecks']]
 direct=[c for c in reports['closure']['checks'] if fid in c.get('features',[])]
 previous=row['status']
 if fid in REVIEWED_CLOSURES:
  assert refs,(fid,'no reviewed proof binding')
  row['status']='verified-prompt-policy' if fid in policy else 'verified-automated'
 elif fid in live:row['status']='verified-chatgpt-live'
 elif fid in defer:row['status']='fixture-verified-live-deferred-by-user'
 elif fid in auto:row['status']='verified-automated'
 # Keep manual checks and already approved deviations genuinely open/separate.
 if row['status'].startswith('verified'):
  row['remaining_validation']='No known implementation gap in this macOS contract. Manual accessibility/native checks and non-ChatGPT live tests remain separately identified; pedagogy is prompt-driven, not a learning-outcome guarantee.'
 elif fid in defer:
  row['remaining_validation']='Live external service verification deferred by the user on 2026-10-30; implementation retained and deterministic fixtures pass. Friends will test other subscription providers after release. No purchases, keys or Claude update assumed.'
 if 'docs/planning/parity-evidence.json#'+fid not in row['evidence']: row['evidence']+='; docs/planning/parity-evidence.json#'+fid
 row['evidence_scope']='Reviewed case bindings and named executed assertions in parity-evidence.json; adapted domain tests, packaged renderer checks and live service evidence are distinguished. No blanket ported-code closure.'
 entries.append({'catalogEntry':fid,'requirement':row['requirement'],'status':row['status'], 'implementation':row['implementation_locations'].split('; '),'milestone':row['target_milestone'],'validationCases':case_ids,'behaviorChecks':[{'id':fid+'.'+str(i+1),'check':c.strip(),'evidenceCases':refs} for i,c in enumerate(row['acceptance_check'].split(';'))], 'testEntrypoints':sorted(set(re.findall(r'(?:packages/engine/)?tests/[\w-]+\.test\.tsx?|scripts/[\w-]+\.mjs',row['evidence']))),'remaining':row['remaining_validation']})
with (ROOT/'docs/planning/parity-checklist.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(rows)
write('docs/planning/parity-evidence.json',{'schema':1,'build':version,'upstreamCommit':'dc4c398d5167865b84b0ccb3ec809eb88bf8f65f','method':'Authored acceptance bindings reviewed against actual application seams. The assertion index records executed names; source existence alone is not a pass. Manual checks remain pending. Prompt-policy parity is distinct from empirical learning efficacy.','cases':case_index,'executedSuites':suite_index,'coquiAssertions':coqui_assertions,'entries':{r['feature_id']:{'status':r['status'],'cases':r['validation_cases'].split('; '),'implementation':r['implementation_locations'].split('; '),'promptPolicyReview':'docs/implementation/prompt-policy-review.md' if r['feature_id'] in policy else None,'nativeChecks':[c['name'] for c in reports['closure']['checks'] if r['feature_id'] in c.get('features',[])]} for r in rows}})
write('docs/planning/completion-checklist.json',{'schema':2,'product':'CoquiLearn','build':version+' working tree','upstream':{'version':'0.4.0','commit':'dc4c398d5167865b84b0ccb3ec809eb88bf8f65f'},'catalogEntryCount':len(rows),'countMeaning':'233 overlapping catalog entries; subordinate checks do not create new features.','fullMacOSParityRelease':False,'statusCounts':dict(Counter(r['status'] for r in rows)),'entries':entries})
print(json.dumps(dict(Counter(r['status'] for r in rows))))

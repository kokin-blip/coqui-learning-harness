// Adapted from LearnHarness dc4c398; SQLite adapter replaces filesystem persistence.
import { database } from '../../../storage/index.ts';
import { emit } from '../core/events.ts';
import { CURRENT_CHAT_VERSION } from '../core/contracts.ts';
import type { ChatStore } from '../core/ports.ts';
import type { ChatRecord, ChatSummary } from '../core/contracts.ts';
import { danglingQuestionOf } from '../core/native-messages.ts';
import { phaseAt3Lh } from '../core/phases.ts';
const db=()=>database();
function getChat(id:string):ChatRecord|null { const v=db().get<ChatRecord>('chat',id);if(v&&v.version!>CURRENT_CHAT_VERSION)throw new Error('Session requires a newer CoquiLearn version.');return v; }
function write(record:ChatRecord){db().put('chat',record.id,{...record,version:CURRENT_CHAT_VERSION});db().index('chat',record.id,record.title,JSON.stringify(record.messages));}
function mutate(id:string,fn:(v:ChatRecord)=>void){db().transaction(()=>{const r=getChat(id);if(!r)throw new Error('Session not found');fn(r);write(r);});}
export const chatStore:ChatStore={
 createChat(title,kind){const now=new Date().toISOString();const r:ChatRecord={id:'chat_'+crypto.randomUUID().replaceAll('-',''),title:title.trim()||'Untitled session',createdAt:now,updatedAt:now,messages:[],version:CURRENT_CHAT_VERSION,...(kind?{kind}: {})};write(r);emit('chats-changed',{});return r;},
 getChat,
 listChats(){return db().all<ChatRecord>('chat').map(({messages,tree,turns,extractions,...s})=>({...s,kind:s.kind??'teach',messageCount:messages.length,phase:phaseAt3Lh(messages),pendingQuestion:!!danglingQuestionOf(messages)} as ChatSummary)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));},
 saveMessages(id,messages){mutate(id,r=>{r.messages=messages;r.updatedAt=new Date().toISOString();});},
 saveTurnInput(id,messages){db().transaction(()=>{chatStore.saveMessages(id,messages);db().setPreference('turn-state:'+id,{state:'running',at:new Date().toISOString()});});},
 saveTree(id,tree){mutate(id,r=>{r.tree=tree;});},
 appendTurnUsage(id,entry){mutate(id,r=>{if(!r.turns?.some(t=>t.id===entry.id))r.turns=[...(r.turns??[]),entry];});},
 appendExtractionUsage(id,entry){mutate(id,r=>{if(!r.extractions?.some(t=>t.startedAt===entry.startedAt))r.extractions=[...(r.extractions??[]),entry];});},
 saveSettings(id,settings){mutate(id,r=>{r.settings=settings;});},
 renameChat(id,title){mutate(id,r=>{r.title=title.trim()||'Untitled session';});emit('chats-changed',{});return getChat(id)!;},
 deleteChat(id){const changed=db().remove('chat',id)>0;if(changed)emit('chats-changed',{});return changed;}
};

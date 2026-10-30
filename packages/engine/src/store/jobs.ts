// Adapted from LearnHarness dc4c398; durable job state and delivery metadata remain intact.
import { database } from '../../../storage/index.ts';
import type { JobStore } from '../core/ports.ts';
import type { JobRecord } from '../core/contracts.ts';
import { emit } from '../core/events.ts';
export const jobStore:JobStore={
 createJob(init){const existing=jobStore.findJobByToolCallId(init.chatId,init.toolCallId);if(existing)return existing;const now=new Date().toISOString();const r:JobRecord={id:'job_'+crypto.randomUUID().replaceAll('-',''),...init,status:'running',activity:init.activity??'starting',createdAt:now,updatedAt:now};database().put('job',r.id,r);emit('jobs-changed',{chatId:r.chatId});return r;},
 getJob:id=>database().get('job',id),
 updateJob(id,patch){const r=jobStore.getJob(id);if(!r)return null;const n={...r,...patch,id:r.id,chatId:r.chatId,toolCallId:r.toolCallId,createdAt:r.createdAt,updatedAt:patch.updatedAt??new Date().toISOString()};database().put('job',id,n);emit('jobs-changed',{chatId:r.chatId});return n;},
 listJobs:chatId=>database().all<JobRecord>('job').filter(j=>j.chatId===chatId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),
 findJobByToolCallId(chatId,toolCallId){return jobStore.listJobs(chatId).find(j=>j.toolCallId===toolCallId)??null;},
 deleteJobsForChat(chatId){const jobs=jobStore.listJobs(chatId);for(const j of jobs)database().remove('job',j.id);if(jobs.length)emit('jobs-changed',{chatId});return jobs.length;}
};

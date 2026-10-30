/** Adapted LearnHarness dc4c398 settings-store contracts for the SQLite store. */
import assert from 'node:assert/strict';import {afterEach,describe,it} from 'node:test';
import {database} from '../../storage/index.ts';
import {readSettings,writeSettings} from '../src/store/settings.ts';
afterEach(()=>database().db.prepare('DELETE FROM preferences WHERE id=?').run('settings'));
describe('the SQLite settings store',()=>{
 it('reads null on first boot without a settings record',()=>{database().db.prepare('DELETE FROM preferences WHERE id=?').run('settings');assert.equal(readSettings(),null);});
 it('write/read round-trips through the sanitizer',()=>{writeSettings({version:1,graph:{enabled:false}});assert.deepEqual(readSettings()?.graph,{enabled:false});});
 it('a legacy chat default section is ignored while sibling settings survive',()=>{database().setPreference('settings',{version:1,chat:{model:{provider:'openrouter',id:'unused'},thinkingLevel:'low'},graph:{enabled:true}});const out=readSettings()!;assert.equal('chat' in out,false);assert.deepEqual(out.graph,{enabled:true});});
 it('corrupt settings JSON has first-boot semantics without hiding other SQLite failures',()=>{database().db.prepare('INSERT INTO preferences(id,json) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json').run('settings','{not json');assert.equal(readSettings(),null);});
});

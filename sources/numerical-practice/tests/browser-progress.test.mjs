import test from 'node:test';
import assert from 'node:assert/strict';
import {updateBrowserProgress} from '../shared/browser-progress.mjs';
import {defaults} from '../shared/model.mjs';
const session={id:'browser-1',game:'arithmetic',timestamp:'2026-09-27T10:00:00Z',difficulty:'Easy',score:2,correct:2,errors:0,accuracy:1,avgResponseMs:2000,duration:120,config:defaults.Easy};
test('browser progress persists completed sessions without duplicate retries',()=>{
 const first=updateBrowserProgress(undefined,'sessions',session);
 assert.equal(first.sessions.length,1);assert.equal(updateBrowserProgress(first,'sessions',session).sessions.length,1);
 assert.equal(updateBrowserProgress(first,'progress'),first);
});
test('browser imports merge old exports and preserve prior IDs and presets',()=>{
 const initial=updateBrowserProgress(undefined,'sessions',session);
 const preset={id:'p',name:'Warmup',game:'arithmetic',config:defaults.Easy};
 const current=updateBrowserProgress(initial,'presets',preset);
 const updated=updateBrowserProgress(current,'presets',{...preset,name:'Renamed'});
 assert.equal(updated.presets.length,1);assert.equal(updated.presets[0].name,'Renamed');
 const imported=updateBrowserProgress(updated,'import',{version:1,sessions:[session,{...session,id:'browser-2'}],presets:[preset]});
 assert.equal(imported.sessions.length,2);assert.equal(imported.presets[0].name,'Renamed');
 assert.equal(initial.sessions.length,1);assert.equal(initial.presets.length,0);
});
test('bad browser imports and writes leave existing progress untouched',()=>{
 const current=updateBrowserProgress(undefined,'sessions',session),before=JSON.stringify(current);
 assert.throws(()=>updateBrowserProgress(current,'import',{version:99,sessions:[],presets:[]}));
 assert.throws(()=>updateBrowserProgress(current,'sessions',{...session,id:'bad',accuracy:2}));
 assert.throws(()=>updateBrowserProgress(current,'presets',{id:'bad'}));
 assert.equal(JSON.stringify(current),before);
});

import assert from 'node:assert/strict';
import {Game,advice} from '../poker/engine.js';
import {positionOf,stackContext,newSession,recordHand,sessionSummary,contextualAdvice,assessDecision,rangeEquity} from '../poker/learning.js';
const seeded=(seed=44)=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
let g=new Game('cash','standard',seeded());g.start();let v=g.view(0);v.history=[];
assert.equal(positionOf(v), 'BTN');assert.equal(positionOf(v,1),'SB');assert.equal(positionOf(v,2),'BB');assert.equal(positionOf(v,3),'UTG');assert.equal(positionOf(v,5),'CO');
let short=new Game('tournament');short.players.forEach((p,i)=>p.stack=i===0?200:i===3?1000:0);short.start();let sv=short.view(0);assert.equal(positionOf(sv),'BTN / SB');assert.equal(positionOf(sv,3),'BB');let ctx=stackContext(sv);assert.equal(ctx.field,2);assert.equal(ctx.rank,2);assert.equal(ctx.effective,200);assert(ctx.covered);assert.equal(ctx.target,'Riley');
// Equity and context must be unchanged when unseen actual hole cards change.
const before=rangeEquity(v,60,seeded());g.players[1].hole=[12,25];let v2=g.view(0);v2.history=[];assert.equal(before,rangeEquity(v2,60,seeded()));assert(v.players.every(p=>!('hole' in p)));
const base=advice(v,80,seeded()),a=contextualAdvice(v,base,80,seeded());assert(a.rangeEq>=0&&a.rangeEq<=1);assert(a.notes.some(n=>n.tag==='Position'));
let checkV={...v,legal:{...v.legal,call:0}},aa={...a,context:{...a.context,callFraction:0}};assert.equal(assessDecision(checkV,aa,'fold').grade,'review');assert.equal(assessDecision(checkV,aa,'call').grade,'reasonable');
let marginal={...aa,rangeEq:.18,odds:.3,context:{...aa.context,callFraction:.45}},callV={...v,legal:{...v.legal,call:900}};assert.equal(assessDecision(callV,marginal,'call').grade,'review');
let ses=newSession('cash','standard');const decision=(street,type,call,grade='context')=>({street,type,call,grade});ses.hands=[{number:1,bb:20,seats:6,position:'BTN',net:100,decisions:[decision('Preflop','raise',20),decision('Preflop','raise',60),decision('Flop','raise',0),decision('Flop','call',20)]},{number:2,bb:20,seats:6,position:'BB',net:-20,decisions:[decision('Preflop','call',0),decision('Flop','call',0)]},{number:3,bb:20,seats:6,position:'SB',net:-10,decisions:[decision('Preflop','fold',10)]}];
let stats=sessionSummary(ses);assert.equal(stats.vp,1);assert.equal(stats.pfr,1);assert.equal(stats.n,3);assert.equal(stats.bets,1);assert.equal(stats.calls,1);assert.equal(stats.foldOpportunities,4);assert.equal(stats.folds,1);assert.equal(stats.net,70);assert.equal(stats.style,'Building a sample');assert.equal(stats.positions.BB.entries,0);
let fresh=newSession('cash','standard');const fake={done:true,hand:1,bb:20,review:[decision('Preflop','fold',20)],players:[{inHand:true,stack:1800,startStack:2000,folded:true}],showdown:false,result:'Other player won'};assert(recordHand(fresh,fake,'BB'));assert(!recordHand(fresh,fake,'BB'));fake.players[0].stack=2000;assert.equal(sessionSummary(fresh).net,-200);assert.equal(fresh.hands.length,1);
// Results are never a quality input: identical decisions, opposite later outcomes.
const gradeBefore=assessDecision(v,a,'call');const later={...v,result:'You won 10000'};assert.deepEqual(assessDecision(later,a,'call'),gradeBefore);
ses.hands=Array.from({length:20},(_,i)=>({...ses.hands[i%3],number:i+1}));assert.notEqual(sessionSummary(ses).style,'Building a sample');ses.hands[0].seats=2;assert.equal(sessionSummary(ses).style,'Mixed table sizes');
console.log('Learning checks passed: stack metrics, short-handed position, card privacy, outcome-independent review, VPIP/PFR denominators, free checks, deduplication, reload accounting, small samples and mixed table sizes.');

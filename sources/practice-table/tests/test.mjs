import assert from 'node:assert/strict';
import {Game,evaluate,chooseAI,equity} from '../poker/engine.js';
const c=(r,s=0)=>s*13+r-2;
assert(evaluate([c(14),c(13),c(12),c(11),c(10),c(2,1),c(3,1)])>evaluate([c(9),c(9,1),c(9,2),c(9,3),c(14)]));
assert(evaluate([c(14),c(2,1),c(3,2),c(4,3),c(5)])>evaluate([c(13),c(13,1),c(13,2),c(8),c(7)]));
assert(evaluate([c(14),c(14,1),c(14,2),c(13),c(13,1),c(13,2),c(2)])>evaluate([c(12),c(12,1),c(12,2),c(14),c(14,1)]));
let seed=456;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
// Known side-pot: short stack wins main, second stack wins side, unmatched excess returned.
let s=new Game();s.board=[c(2),c(4,1),c(6,2),c(8,3),c(10)];s.players.forEach((p,i)=>Object.assign(p,{total:[100,200,300,0,0,0][i],stack:0,folded:i>2,hole:i===0?[c(14),c(14,1)]:i===1?[c(13),c(13,1)]:[c(12),c(12,1)],startStack:2000}));s.pot=600;s.finish(true);assert.deepEqual(s.players.slice(0,3).map(p=>p.stack),[300,200,100]);
let g=new Game('cash','standard',rng);g.start();g.turn=0;Object.assign(g.players[0],{bet:100,stack:1000,actedAt:100});g.current=150;g.lastRaise=100;assert.equal(g.legal().canRaise,false);g.current=200;assert.equal(g.legal().canRaise,true);assert.equal(g.legal().fullMin,300);
let hands=0,actions=0;
for(let run=0;run<12;run++){let g=new Game(run%2?'cash':'tournament',run%3===0?'advanced':'standard',rng);for(let h=0;h<35;h++){if(!g.start())break;hands++;let total=g.players.reduce((n,p)=>n+p.stack+p.total,0),steps=0;while(!g.done){let v=g.view(g.turn);assert(v.players.every(p=>!('hole' in p)));assert(g.turn>=0);let a=chooseAI(v,rng);if(rng()<.08&&v.legal.canRaise)a={type:'raise',amount:v.legal.max};g.act(a.type,a.amount);actions++;assert(++steps<160);assert(g.players.every(p=>p.stack>=0&&Number.isInteger(p.stack)));if(!g.done)assert.equal(g.players.reduce((n,p)=>n+p.stack,0)+g.pot,total)}assert.equal(g.players.reduce((n,p)=>n+p.stack,0),total);}}
// Heads-up button posts small blind, acts first before flop.
let hu=new Game();hu.players.forEach((p,i)=>p.stack=i<2?2000:0);hu.format='tournament';hu.start();assert.equal(hu.small,hu.button);assert.equal(hu.turn,hu.button);
assert(equity([c(14),c(14,1)],[c(14,2),c(14,3),c(2),c(3),c(8)],1,20,rng)===1);
console.log(JSON.stringify({passed:true,hands,actions,checks:['hand rankings','side pots and unmatched returns','short all-in reopening','heads-up order','card privacy','chip conservation','AI legal actions']}));

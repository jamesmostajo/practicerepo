import test from 'node:test';
import assert from 'node:assert/strict';
import {tradingDefaults,validTradingConfig,createTradingRound,tradingQuoteError,quoteTradingRound,settleTradingRound} from '../shared/trading.mjs';
import {validateData} from '../shared/model.mjs';
const c={...tradingDefaults.Easy,rounds:3,noise:0,noiseTradeProbability:0,aggressiveness:1};
const round={fairValue:100,bid:102,ask:103,payout:105};
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function seeded(seed=42){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}

test('generated rounds respect price bounds, symmetric payout risk and book spread',()=>{
 for(const config of Object.values(tradingDefaults)){
  const rng=seeded();for(let i=0;i<300;i++){
   const r=createTradingRound(config,rng);assert.ok(r.fairValue>=20&&r.fairValue<=config.maxValue);assert.ok(r.bid>=0&&r.ask>r.bid);approx(r.ask-r.bid,config.bookSpread);
   assert.ok(Math.abs(r.payout-r.fairValue)<=config.settlementRisk+1e-7);approx(r.payout-r.fairValue,Math.round(r.payout-r.fairValue));
  }
 }
 const zero=createTradingRound({...c,settlementRisk:0},seeded());assert.equal(zero.payout,zero.fairValue);
 const at=n=>{let i=0;return()=>[0.5,0.5,n][i++];};
 approx(createTradingRound(c,at(0)).payout,60-c.settlementRisk);
 approx(createTradingRound(c,at(0.99999)).payout,60+c.settlementRisk);
});
test('passive fills use shared maker accounting and do not depend on settlement',()=>{
 const p=quoteTradingRound(round,{bid:97,ask:99},c,()=>0);assert.equal(p.action,'buy');assert.equal(p.inventoryDelta,-1);assert.equal(p.cashDelta,99);assert.equal(p.edge,-1);
 assert.deepEqual(p,quoteTradingRound({...round,payout:90},{bid:97,ask:99},c,()=>0));
 const buy=quoteTradingRound(round,{bid:101,ask:103},c,()=>0);assert.equal(buy.inventoryDelta,1);assert.equal(buy.cashDelta,-101);
 const pass=quoteTradingRound(round,{bid:99,ask:101},c,()=>0);assert.equal(pass.action,'pass');assert.equal(pass.edge,0);
});
test('offsetting passive and active positions lock the tutorial profit at any payout',()=>{
 // A noise seller fills our bid at 99, regardless of fair value.
 const passive=quoteTradingRound(round,{bid:99,ask:101},{...c,noiseTradeProbability:1},()=>0.9);
 assert.equal(passive.inventoryDelta,1);assert.equal(passive.cashDelta,-99);
 for(const payout of [85,100,115]){
  const r=settleTradingRound({...round,payout},passive,'sell');assert.equal(r.inventory,0);assert.equal(r.pnl,3);assert.equal(r.correct,true);assert.equal(r.activeEdge,2);
  assert.equal(r.passivePnl,payout-99);assert.equal(r.activePnl,102-payout);
 }
});
test('active book executes ask for buys, bid for sells and permits optimal pass',()=>{
 const passive=quoteTradingRound(round,{bid:99,ask:101},c,()=>0);
 const buy=settleTradingRound(round,passive,'buy');assert.equal(buy.price,103);assert.equal(buy.activePnl,2);assert.equal(buy.activeEdge,-3);assert.equal(buy.correct,false);assert.equal(buy.missedEdge,5);
 const sell=settleTradingRound(round,passive,'sell');assert.equal(sell.price,102);assert.equal(sell.activePnl,-3);assert.equal(sell.correct,true);
 const fair={...round,bid:99,ask:101};assert.equal(settleTradingRound(fair,passive,'pass').correct,true);
 assert.equal(settleTradingRound({...fair,ask:100},passive,'buy').correct,true);
 assert.throws(()=>settleTradingRound(round,passive,'invalid'));
});
test('timeouts charge each stage once and preserve the other stage',()=>{
 const timeout=quoteTradingRound(round,null,c);
 const active=settleTradingRound(round,timeout,'sell');assert.equal(active.passivePnl,-1);assert.equal(active.activePnl,-3);assert.equal(active.penalties,1);assert.equal(active.correct,true);
 const both=settleTradingRound(round,timeout,'buy',true);assert.equal(both.action,'pass');assert.equal(both.price,null);assert.equal(both.pnl,-2);assert.equal(both.grossPnl,0);assert.equal(both.correct,false);
 const passive=quoteTradingRound(round,{bid:101,ask:103},c,()=>0);
 const r=settleTradingRound(round,passive,'sell',true);assert.equal(r.passivePnl,4);assert.equal(r.activePnl,-1);assert.equal(r.pnl,3);
});
test('quotes and custom settings enforce bounds',()=>{
 for(const config of Object.values(tradingDefaults))assert.ok(validTradingConfig(config));
 for(const change of [{rounds:2},{quoteSeconds:4},{takeSeconds:121},{maxValue:19},{maxSpread:0},{noise:-1},{settlementRisk:16},{aggressiveness:2}])assert.equal(validTradingConfig({...c,...change}),false);
 assert.equal(tradingQuoteError(c,99,101),'');for(const [bid,ask] of [[NaN,101],[-1,1],[100,100],[100,99],[0,10],[129,131]])assert.ok(tradingQuoteError(c,bid,ask));
 assert.throws(()=>quoteTradingRound(round,{bid:100,ask:90},c));
});
test('session accounting validates both legs and all-timeout sessions',()=>{
 const s={id:'trading',timestamp:new Date().toISOString(),game:'trading',difficulty:'Easy',config:c,duration:50,avgResponseMs:2000,rounds:3,correct:2,errors:1,accuracy:2/3,score:2,pnl:2,passivePnl:4,activePnl:-2,grossPnl:3,penalties:1,quoteTimeouts:1,activeTimeouts:0,passiveFills:1,activeFills:2,fills:3,fillRate:0.5};
 const data={version:1,sessions:[s],presets:[]};assert.equal(validateData(data),data);
 for(const change of [{pnl:3},{passivePnl:5},{grossPnl:9},{penalties:2},{quoteTimeouts:4},{activeTimeouts:2},{fills:7},{fillRate:1},{passiveFills:3},{accuracy:1}])assert.throws(()=>validateData({...data,sessions:[{...s,...change}]}));
 const timeout={...s,correct:0,errors:3,accuracy:0,score:-6,pnl:-6,passivePnl:-3,activePnl:-3,grossPnl:0,penalties:6,quoteTimeouts:3,activeTimeouts:3,passiveFills:0,activeFills:0,fills:0,fillRate:0,avgResponseMs:0};assert.ok(validateData({...data,sessions:[timeout]}));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {takeQuote} from '../shared/counterparty.mjs';
import {cardDeck,cardDefaults,cardQuote,createCardRound,handFairValue,cardEdges,resolveCardRound,validCardConfig} from '../shared/cards.mjs';
import {validateData} from '../shared/model.mjs';
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function seeded(seed=42){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}

test('card deck and fair value account for removal without replacement',()=>{
 const deck=cardDeck();assert.equal(deck.length,52);assert.equal(new Set(deck.map(c=>`${c.rank}${c.suit}`)).size,52);
 assert.equal(deck.reduce((sum,c)=>sum+c.rank,0),364);
 const visible=[{rank:13,suit:'♠'},{rank:1,suit:'♥'}];
 approx(handFairValue(visible,2),14+2*(364-14)/50);
 const remaining=deck.filter(c=>!visible.some(v=>v.rank===c.rank&&v.suit===c.suit));
 // Enumerate every two-card draw to independently check conditional EV.
 let sum=0,count=0;for(let i=0;i<remaining.length;i++)for(let j=i+1;j<remaining.length;j++){sum+=14+remaining[i].rank+remaining[j].rank;count++;}
 approx(handFairValue(visible,2),sum/count);
 assert.throws(()=>handFairValue([visible[0],visible[0]],1));
 assert.throws(()=>handFairValue([{rank:14,suit:'♠'}],1));
});

test('deals are unique and book generation provides buy, sell and pass opportunities',()=>{
 for(const config of Object.values(cardDefaults)){
  const random=seeded();const actions=new Set();
  for(let i=0;i<1000;i++){
   const round=createCardRound(config,random);const all=[...round.visible,...round.hidden];
   assert.equal(round.visible.length,config.visibleCards);assert.equal(round.hidden.length,config.hiddenCards);
   assert.equal(new Set(all.map(c=>`${c.rank}${c.suit}`)).size,all.length);
   assert.equal(round.payout,all.reduce((sum,c)=>sum+c.rank,0));
   approx(round.fairValue,handFairValue(round.visible,config.hiddenCards));
   assert.ok(round.bid>=0&&round.ask>round.bid);approx(round.ask-round.bid,config.spread);
   actions.add(resolveCardRound(round,'pass').bestAction);
  }
  assert.deepEqual([...actions].sort(),['buy','pass','sell']);
 }
 const quote=cardQuote(17.123,{...cardDefaults.Easy,quoteNoise:0,noiseTradeProbability:0},()=>0.5);
 assert.ok(quote.bid<17.123&&quote.ask>17.123);
});

test('firm-book execution uses ask for buys and bid for sells',()=>{
 assert.deepEqual(takeQuote({bid:9,ask:11,action:'buy',quantity:2}),{action:'buy',price:11,quantity:2,inventoryDelta:2,cashDelta:-22});
 assert.deepEqual(takeQuote({bid:9,ask:11,action:'sell'}),{action:'sell',price:9,quantity:1,inventoryDelta:-1,cashDelta:9});
 assert.deepEqual(takeQuote({bid:9,ask:11,action:'pass'}),{action:'pass',price:null,quantity:0,inventoryDelta:0,cashDelta:0});
 assert.throws(()=>takeQuote({bid:11,ask:9,action:'buy'}));assert.throws(()=>takeQuote({bid:9,ask:11,action:'invalid'}));
});

test('expected-edge scoring is independent of the realized card draw',()=>{
 const round={visible:[{rank:1,suit:'♠'}],hidden:[{rank:2,suit:'♥'}],fairValue:10,payout:3,bid:8,ask:9};
 assert.deepEqual(cardEdges(round),{buy:1,sell:-2,pass:0});
 const buy=resolveCardRound(round,'buy');assert.equal(buy.edge,1);assert.equal(buy.pnl,-6);assert.equal(buy.correct,true);
 const sell=resolveCardRound(round,'sell');assert.equal(sell.edge,-2);assert.equal(sell.pnl,5);assert.equal(sell.correct,false);assert.equal(sell.missedEdge,3);
 const pass=resolveCardRound(round,'pass');assert.equal(pass.edge,0);assert.equal(pass.pnl,0);assert.equal(pass.missedEdge,1);assert.equal(pass.correct,false);
 const lucky=resolveCardRound({...round,payout:14},'buy');assert.equal(lucky.edge,buy.edge);assert.equal(lucky.pnl,5);
 const high={...round,bid:11,ask:12};assert.equal(resolveCardRound(high,'sell').edge,1);assert.equal(resolveCardRound(high,'sell').correct,true);
});

test('passing a fair quote is optimal but timeouts are always incorrect',()=>{
 const round={visible:[{rank:1,suit:'♠'}],hidden:[{rank:2,suit:'♥'}],fairValue:10,payout:3,bid:9,ask:11};
 assert.equal(resolveCardRound(round,'pass').correct,true);
 const timeout=resolveCardRound(round,'buy',true);assert.equal(timeout.action,'pass');assert.equal(timeout.correct,false);assert.equal(timeout.edge,0);assert.equal(timeout.pnl,0);
 assert.throws(()=>resolveCardRound(round,'invalid'));
});

test('card config and scored sessions reject invalid data',()=>{
 for(const config of Object.values(cardDefaults))assert.ok(validCardConfig(config));
 for(const change of [{visibleCards:0},{hiddenCards:4},{rounds:2},{spread:0},{maxEdge:0},{quoteNoise:-1},{aggressiveness:2},{showFairValue:'yes'}])assert.equal(validCardConfig({...cardDefaults.Easy,...change}),false);
 const session={id:'cards',game:'cards',timestamp:new Date().toISOString(),difficulty:'Custom',config:{...cardDefaults.Easy,rounds:3},duration:30,avgResponseMs:2000,
  correct:2,errors:1,accuracy:2/3,pnl:-3,score:2,capturedEdge:2,availableEdge:5,missedEdge:3,fills:2,rounds:3,fillRate:2/3};
 const data={version:1,sessions:[session],presets:[]};assert.equal(validateData(data),data);
 for(const invalid of [{score:99},{capturedEdge:99},{availableEdge:1},{missedEdge:-1},{correct:3},{accuracy:1},{fills:4},{pnl:NaN}])assert.throws(()=>validateData({...data,sessions:[{...session,...invalid}]}));
});

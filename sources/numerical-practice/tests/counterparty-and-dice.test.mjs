import test from 'node:test';
import assert from 'node:assert/strict';
import {decideTrade,makerFill} from '../shared/counterparty.mjs';
import {createDiceState,diceDefaults,diceView,quoteError,resolveDiceRound,diceSettlement,validDiceConfig} from '../shared/dice.mjs';
import {validateData} from '../shared/model.mjs';
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const sequence=(...values)=>{let index=0;return()=>values[index++%values.length];};

test('counterparty direction converts to the correct maker cash and position',()=>{
 const base={bid:5,ask:6,aggressiveness:1,noise:0,noiseTradeProbability:0};
 const buy=decideTrade({...base,trueValue:10},()=>0);
 assert.equal(buy.action,'buy');assert.deepEqual(makerFill(buy),{inventoryDelta:-1,cashDelta:6});
 const sell=decideTrade({...base,trueValue:2,quantity:3},()=>0);
 assert.equal(sell.action,'sell');assert.deepEqual(makerFill(sell),{inventoryDelta:3,cashDelta:-15});
 assert.equal(decideTrade({...base,trueValue:5.5},()=>0).action,'pass');
 assert.equal(decideTrade({...base,trueValue:20,aggressiveness:0},()=>0).action,'pass');
 assert.equal(decideTrade({...base,trueValue:6.1,minEdge:0.2},()=>0).action,'pass');
 assert.throws(()=>decideTrade({...base,bid:7,trueValue:8}));
});

test('counterparty scales across contracts and supports independent noise trades',()=>{
 const q={bid:35,ask:40,trueValue:38,noiseTradeProbability:1,aggressiveness:0};
 assert.equal(decideTrade(q,sequence(0.5,0,0)).action,'buy');
 assert.equal(decideTrade(q,sequence(0.5,0,0.99)).action,'sell');
 const shifted=decideTrade({bid:99,ask:101,trueValue:100,noise:5,aggressiveness:1},sequence(0.99,0.5,0));
 assert.equal(shifted.action,'buy');assert.ok(shifted.perceivedValue>104);
 assert.throws(()=>decideTrade({...q,noise:-1}));
 assert.throws(()=>decideTrade({...q,aggressiveness:2}));
});

test('dice reveals retain a consistent contract and fair value uses public information',()=>{
 const config={...diceDefaults.Medium,rounds:6};
 const state=createDiceState(config,()=>0.5);
 assert.deepEqual(state.dice,[4,4,4]);assert.equal(state.modifier,0);
 approx(diceView(state).publicValue,10.5-0.2*3);
 const later={...state,round:2};
 assert.deepEqual(diceView(later).visibleDice,[4]);
 approx(diceView(later).publicValue,4+7-0.6);
 assert.equal(diceView({...state,modifier:2}).publicValue,diceView(state).publicValue);
 assert.equal(diceView({...state,round:5}).unknownDice,1);
 assert.equal(diceView({...state,done:true}).unknownDice,0);
});

test('position limits block only exposure-increasing fills and penalties are quadratic',()=>{
 const config={...diceDefaults.Easy,rounds:5,positionLimit:1,noiseTradeProbability:1,inventoryPenalty:0.1};
 const original=createDiceState(config,()=>0.5);
 // Noise sell -> maker buys at bid.
 const long=resolveDiceRound(original,{bid:6,ask:8},1000,sequence(0.5,0,0.99));
 assert.equal(original.inventory,0);assert.equal(long.inventory,1);assert.equal(long.cash,-6);approx(long.penalties,0.1);
 const blocked=resolveDiceRound(long,{bid:6,ask:8},1000,sequence(0.5,0,0.99));
 assert.equal(blocked.inventory,1);assert.equal(blocked.cash,-6);assert.equal(blocked.fills,1);approx(blocked.penalties,0.2);
 assert.equal(blocked.records[1].reason,'Position limit blocked the fill');
 // Noise buy -> maker sells, flattening inventory.
 const flat=resolveDiceRound(blocked,{bid:6,ask:8},1000,sequence(0.5,0,0));
 assert.equal(flat.inventory,0);assert.equal(flat.cash,2);approx(flat.penalties,0.2);
 const large=resolveDiceRound({...original,inventory:2,cash:-12,config:{...config,positionLimit:5,noiseTradeProbability:0,aggressiveness:0}},{bid:6,ask:8},1000,()=>0.5);
 approx(large.penalties,0.4);
});

test('timeouts charge once, terminal settlement realizes inventory and all charges',()=>{
 const config={...diceDefaults.Easy,rounds:3,noiseTradeProbability:1,inventoryPenalty:0.1,eventProbability:1,eventLoss:3,hiddenModifier:2};
 let state=createDiceState(config,()=>0.5); // 4+4, modifier 0, event -3, payout 5.
 state=resolveDiceRound(state,{bid:4,ask:6},500,sequence(0.5,0,0.99));
 state=resolveDiceRound(state,null,config.roundSeconds*1000);
 state=resolveDiceRound(state,null,config.roundSeconds*1000);
 const settled=diceSettlement(state);
 assert.equal(state.timeouts,2);assert.equal(state.submitted,1);assert.equal(state.fills,1);
 approx(state.penalties,2.3);assert.equal(settled.settlement,5);assert.equal(settled.grossPnl,1);approx(settled.netPnl,-1.3);
 assert.equal(settled.finalInventory,0);assert.equal(settled.settlementCash,5);
 assert.throws(()=>resolveDiceRound(state,null,1000));assert.throws(()=>diceSettlement(createDiceState(config)));
 // A short position earns the sale price less settlement payout.
 const short={...state,cash:7,inventory:-1,penalties:0};assert.equal(diceSettlement(short).netPnl,2);
});

test('quote and configuration validation enforce spread, bounds, and response time',()=>{
 for(const c of Object.values(diceDefaults))assert.ok(validDiceConfig(c));
 for(const change of [{rounds:2},{diceCount:4},{roundSeconds:0},{inventoryPenalty:0},{eventProbability:1.1},{positionLimit:0}])assert.equal(validDiceConfig({...diceDefaults.Easy,...change}),false);
 const c=diceDefaults.Easy;
 assert.equal(quoteError(c,6,8),'');assert.ok(quoteError(c,8,6));assert.ok(quoteError(c,2,10));assert.ok(quoteError(c,-1,1));assert.ok(quoteError(c,NaN,8));
 assert.throws(()=>resolveDiceRound(createDiceState(c),{bid:6,ask:8},-1));
});

test('dice session metrics are validated without breaking old drill backups',()=>{
 const config={...diceDefaults.Easy,rounds:3};
 const session={id:'dice-test',game:'dice',timestamp:new Date().toISOString(),difficulty:'Custom',config,duration:30,avgResponseMs:2000,
  correct:3,errors:0,accuracy:1,pnl:2.5,score:2.5,grossPnl:3,penalties:0.5,fills:2,rounds:3,maxInventory:1,fillRate:2/3};
 const data={version:1,sessions:[session],presets:[]};assert.equal(validateData(data),data);
 for(const invalid of [{pnl:999},{score:1},{fills:9},{maxInventory:99},{fillRate:3}])assert.throws(()=>validateData({...data,sessions:[{...session,...invalid}]}));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {eventDefaults,validEventConfig,createEventRound,eventQuoteError,brierScore,resolveEventRound,calibrationBins} from '../shared/events.mjs';
import {validateData} from '../shared/model.mjs';
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const config={...eventDefaults.Easy,rounds:3,noiseActivity:0,informedAggressiveness:1};
const round={id:'test',prompt:'Test',evidenceLabel:'successes',trueProbability:0.9,successes:9,samples:10,outcome:1};
function seeded(seed=42){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}

test('Brier uses probability against binary outcome, including endpoints',()=>{
 assert.equal(brierScore(1,1),0);assert.equal(brierScore(0,1),1);assert.equal(brierScore(0,0),0);
 for(const outcome of [0,1])assert.equal(brierScore(0.5,outcome),0.25);
 approx(brierScore(0.6,1),0.16);
 for(const [p,y] of [[-1,0],[1.01,1],[NaN,0],[0.5,2]])assert.throws(()=>brierScore(p,y));
});
test('event generation respects evidence settings and samples binary events',()=>{
 const rng=seeded();const outcomes=new Set();
 for(let i=0;i<100;i++){const r=createEventRound(config,rng);assert.equal(r.samples,config.evidenceSamples);assert.ok(Number.isInteger(r.successes)&&r.successes>=0&&r.successes<=r.samples);assert.ok(r.trueProbability>=0.05&&r.trueProbability<=0.95);assert.ok(r.prompt&&r.evidenceLabel);outcomes.add(r.outcome);}
 assert.deepEqual([...outcomes].sort(),[0,1]);
});
test('informed buys hit the ask and settlement has the maker sign',()=>{
 const quote={forecast:60,bid:35,ask:40};const yes=resolveEventRound(round,quote,config,()=>0);
 assert.equal(yes.trades.length,config.noiseTraders+1);assert.equal(yes.trades.filter(t=>t.role==='Informed trader').length,1);
 assert.equal(yes.fills,1);assert.equal(yes.inventory,-1);assert.equal(yes.cash,40);assert.equal(yes.pnl,-60);
 approx(yes.brier,0.16);approx(yes.calibrationBonus,1.8);approx(yes.score,-58.2);
 const no=resolveEventRound({...round,outcome:0},quote,config,()=>0);assert.deepEqual(no.trades,yes.trades);assert.equal(no.pnl,40);
 const sell=resolveEventRound({...round,trueProbability:0.1},{forecast:10,bid:35,ask:40},config,()=>0);assert.equal(sell.inventory,1);assert.equal(sell.cash,-35);assert.equal(sell.pnl,65);
});
test('informed activity increases with mispricing without knowing the outcome',()=>{
 const quote={forecast:50,bid:45,ask:55};
 assert.equal(resolveEventRound({...round,trueProbability:0.5},quote,config,()=>0).fills,0);
 const count=p=>{const rng=seeded();let fills=0;for(let i=0;i<1000;i++)fills+=resolveEventRound({...round,trueProbability:p},quote,config,rng).fills;return fills;};
 assert.ok(count(0.9)>count(0.56));
});
test('noise traders trade randomly independently of edge using shared fill accounting',()=>{
 const noisy={...config,noiseActivity:1};const fair={...round,trueProbability:0.5};const quote={forecast:50,bid:45,ask:55};
 const buys=resolveEventRound(fair,quote,noisy,()=>0);assert.equal(buys.fills,config.noiseTraders);assert.equal(buys.inventory,-config.noiseTraders);assert.equal(buys.cash,55*config.noiseTraders);
 const sells=resolveEventRound(fair,quote,noisy,()=>0.9);assert.equal(sells.inventory,config.noiseTraders);assert.equal(sells.cash,-45*config.noiseTraders);
});
test('timeout includes neutral forecast, no trades and a one-unit penalty',()=>{
 for(const outcome of [0,1]){const r=resolveEventRound({...round,outcome},null,config);assert.equal(r.forecast,0.5);assert.equal(r.brier,0.25);assert.equal(r.calibrationBonus,0);assert.deepEqual(r.trades,[]);assert.equal(r.pnl,-1);assert.equal(r.score,-1);assert.equal(r.penalties,1);}
});
test('calibration bins include 100 percent and use observed outcome frequency',()=>{
 const bins=calibrationBins([0,0.2,0.4,0.6,0.8,1].map((probability,i)=>({probability,outcome:i%2})));
 assert.deepEqual(bins.map(b=>b.count),[1,1,1,1,2]);approx(bins[4].averageForecast,0.9);assert.equal(bins[4].observedFrequency,0.5);
 assert.ok(calibrationBins([]).every(b=>b.averageForecast===null&&b.observedFrequency===null));
 assert.throws(()=>calibrationBins([{probability:2,outcome:0}]));
});
test('event settings, quotes and persisted calibration are validated',()=>{
 for(const c of Object.values(eventDefaults))assert.ok(validEventConfig(c));
 for(const change of [{rounds:2},{noiseTraders:0},{noiseActivity:2},{calibrationWeight:0},{evidenceSamples:201}])assert.equal(validEventConfig({...config,...change}),false);
 assert.equal(eventQuoteError(config,60,35,40),'');for(const values of [[101,35,40],[50,-1,5],[50,50,50],[50,0,100]])assert.ok(eventQuoteError(config,...values));
 const s={id:'event',game:'events',timestamp:new Date().toISOString(),difficulty:'Easy',config,duration:30,avgResponseMs:0,rounds:3,correct:0,errors:3,accuracy:0,score:-3,pnl:-3,grossPnl:0,penalties:3,brier:0.25,calibrationBonus:0,traderVisits:0,fills:0,fillRate:0,forecasts:[0,1,0].map(outcome=>({probability:0.5,outcome,timedOut:true}))};
 const data={version:1,sessions:[s],presets:[]};assert.equal(validateData(data),data);
 for(const change of [{brier:0.1},{calibrationBonus:1},{score:0},{penalties:0},{fills:1},{forecasts:[]},{forecasts:s.forecasts.map(f=>({...f,probability:0.6}))}])assert.throws(()=>validateData({...data,sessions:[{...s,...change}]}));
});

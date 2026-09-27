import test from 'node:test';
import assert from 'node:assert/strict';
import {createFermiQuestions,fermiBenchmarks,fermiDefaults,intervalError,parseEstimate,scenarioIds,scenarioQuestion,scoreInterval,validFermiConfig} from '../shared/fermi.mjs';
import {validateData} from '../shared/model.mjs';
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
function seeded(seed=42){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}

test('estimate input accepts notation but rejects ambiguous or nonpositive bounds',()=>{
 for(const text of ['2500000','2,500,000','2.5m','2.5M','2.5e6'])assert.equal(parseEstimate(text),2500000);
 assert.equal(parseEstimate('.5k'),500);assert.equal(parseEstimate('1.2b'),1.2e9);assert.equal(parseEstimate('3t'),3e12);
 for(const text of ['', '-2','0','NaN','Infinity','1/2','12,34','1e309','1e19','10 kg','1..2'])assert.equal(parseEstimate(text),null);
 assert.equal(intervalError(1,2),'');assert.ok(intervalError(2,2));assert.ok(intervalError(3,2));assert.ok(intervalError(null,2));assert.ok(intervalError(0,2));
});

test('interval coverage includes both boundaries and misses score zero',()=>{
 const c=fermiDefaults.Medium;
 assert.equal(scoreInterval(100,100,120,1000,c).hit,true);assert.equal(scoreInterval(100,80,100,1000,c).hit,true);
 const miss=scoreInterval(100,101,102,0,c);assert.equal(miss.hit,false);assert.equal(miss.score,0);
 assert.throws(()=>scoreInterval(100,100,100,0,c));assert.throws(()=>scoreInterval(0,1,2,0,c));
 const timeout=scoreInterval(100,null,null,45000,c,true);assert.equal(timeout.score,0);assert.equal(timeout.relativeWidth,null);
});

test('precision and speed rewards are scale invariant and match the tutorial example',()=>{
 const c=fermiDefaults.Medium;
 assert.equal(scoreInterval(1000,800,1200,22500,c).score,62.5);
 assert.equal(scoreInterval(1e6,8e5,1.2e6,22500,c).score,62.5);
 assert.ok(scoreInterval(1000,900,1100,20000,c).score>scoreInterval(1000,500,1500,20000,c).score);
 assert.ok(scoreInterval(1000,800,1200,1000,c).score>scoreInterval(1000,800,1200,40000,c).score);
 approx(scoreInterval(1000,800,1200,45000,c).speedFactor,0.75);
 assert.equal(scoreInterval(1000,800,1200,0,{...c,speedWeight:0}).score,scoreInterval(1000,800,1200,45000,{...c,speedWeight:0}).score);
 for(const config of Object.values(fermiDefaults))for(const width of [0.001,0.1,1,100,1e9]){const r=scoreInterval(100,0.01,100+width,0,config);assert.ok(r.score>=0&&r.score<=100);}
});

test('question sets honor level and do not repeat templates before pool exhaustion',()=>{
 for(const config of Object.values(fermiDefaults)){
  const questions=createFermiQuestions(config,seeded());assert.equal(questions.length,config.rounds);
  assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);
  for(const q of questions){assert.ok(Number.isFinite(q.target)&&q.target>0);assert.ok(q.prompt&&q.unit&&q.explanation&&q.sourceLabel&&q.assumptions);}
 }
 const config={...fermiDefaults.Easy,rounds:20,questionSet:'benchmarks'};
 const questions=createFermiQuestions(config,seeded());const eligible=fermiBenchmarks.filter(q=>Number(q.level)<=1);
 assert.equal(new Set(questions.slice(0,eligible.length).map(q=>q.id)).size,eligible.length);
 assert.ok(questions.every(q=>q.kind==='benchmark'&&eligible.some(e=>e.id===q.id)));
 const scenarios=createFermiQuestions({...config,questionSet:'scenarios'},seeded());assert.ok(scenarios.every(q=>q.kind==='scenario'));
 assert.equal(new Set(scenarios.slice(0,scenarioIds.length).map(q=>q.id)).size,Math.min(scenarios.length,scenarioIds.length));
 for(const q of fermiBenchmarks.filter(q=>q.sourceUrl))assert.ok(String(q.sourceUrl).startsWith('https://science.nasa.gov/'));
});

test('scenario targets match the stated model calculations',()=>{
 // random=0 picks a=2 and b=12; level=1 uses scale=1.
 const expected={coffee:20000*0.12*250,water:10000*60,transit:40000*0.12*2,requests:24*86400,storage:20000*1200/1e6,seats:2*120*3*0.75,pages:200*120*250,energy:200*120*8/1000,payments:200*120*15,packing:4*2*2};
 for(const [id,value] of Object.entries(expected))approx(scenarioQuestion(id,1,()=>0).target,value);
 for(const level of [1,2,3])for(const id of scenarioIds){const q=scenarioQuestion(id,level,seeded());assert.ok(q.target>0&&q.target<=1e18);}
});

test('Fermi presets and stored metrics reject invalid combinations',()=>{
 for(const c of Object.values(fermiDefaults))assert.ok(validFermiConfig(c));
 for(const change of [{rounds:2},{roundSeconds:9},{questionLevel:4},{questionSet:'unknown'},{precisionWeight:0},{speedWeight:1}])assert.equal(validFermiConfig({...fermiDefaults.Easy,...change}),false);
 const session={id:'fermi',game:'fermi',timestamp:new Date().toISOString(),difficulty:'Easy',config:{...fermiDefaults.Easy,rounds:3},duration:80,avgResponseMs:20000,
  score:150,averageScore:50,correct:2,errors:1,accuracy:2/3,rounds:3,answered:3,averageRelativeWidth:0.4};
 const data={version:1,sessions:[session],presets:[]};assert.equal(validateData(data),data);
 for(const change of [{averageScore:99},{score:-1},{correct:3},{accuracy:1},{answered:1},{averageRelativeWidth:null},{rounds:4}])assert.throws(()=>validateData({...data,sessions:[{...session,...change}]}));
 const timeout={...session,score:0,averageScore:0,correct:0,errors:3,accuracy:0,answered:0,averageRelativeWidth:null,avgResponseMs:0};
 assert.ok(validateData({...data,sessions:[timeout]}));
});

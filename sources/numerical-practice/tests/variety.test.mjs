import test from 'node:test';
import assert from 'node:assert/strict';
import {variedGenerator} from '../shared/variety.mjs';
import {probabilityProblem,probabilityDefaults,probabilityAnswerCorrect} from '../shared/probability.mjs';
import {scenarioQuestion,createFermiQuestions,fermiDefaults} from '../shared/fermi.mjs';
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('new EV and probability templates match independently calculated answers',()=>{
 const expected={ev:[1,-8,0],bet:[-8,-0.9,0.9],dice:[1/6,11/36,10/36],cards:[2*4/52*48/51,12/51,1/2]};
 for(const [topic,values] of Object.entries(expected))for(let variant=1;variant<=3;variant++){
  let call=0;const q=probabilityProblem({...probabilityDefaults.Easy,topics:[topic]},()=>++call===2?variant/4:0);
  approx(q.exact,values[variant-1]);assert.ok(probabilityAnswerCorrect(q.answer,q));
 }
});
test('new Fermi scenarios calculate targets in the stated units',()=>{
 const expected={hospital:200*.72*365/5,elevators:2*12*20*10,food:2000*120/1e6,bandwidth:200*12*1800/8000,commute:2000*12*2*250/60,solar:200*240*5*.8/1000,rainwater:200*12*.8,warehouse:2000*.6/.12,laundry:20*12*12/1.5,charging:200*12/10,emails:2000*12*250*50/1e6,paint:200*120*2/10};
 for(const [id,target] of Object.entries(expected)){const q=scenarioQuestion(id,1,()=>0);approx(q.target,target);assert.ok(q.assumptions&&q.explanation&&q.unit);}
});
test('successive Fermi sessions prefer unused templates when the pool permits',()=>{
 const config={...fermiDefaults.Hard,rounds:5,questionSet:'scenarios'};
 const first=createFermiQuestions(config,()=>0),second=createFermiQuestions(config,()=>0);
 assert.ok(second.every(q=>!first.some(p=>p.id===q.id)));
});
test('recent-window sampler skips repeats and terminates for tiny custom pools',()=>{
 let index=0;const stream=[1,1,2,2,3];const generate=variedGenerator(()=>stream[Math.min(index++,stream.length-1)],String,3);
 assert.equal(generate({}),1);assert.equal(generate({}),2);assert.equal(generate({}),3);
 let calls=0;const constant=variedGenerator(()=>{calls++;return 1;},String);constant({});assert.equal(constant({}),1);assert.equal(calls,25);
});

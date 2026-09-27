import test from 'node:test';
import assert from 'node:assert/strict';
import {seriesDefaults,seriesTopics,seriesProblem,validSeriesConfig,parseSeriesAnswer,seriesAnswerCorrect} from '../shared/series.mjs';
import {validateData} from '../shared/model.mjs';
function seeded(seed=42){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
test('each family produces the expected independent worked sequence',()=>{
 const expected={arithmetic:[1,2,3,4,5,6,7],geometric:[1,2,4,8,16,32,64],differences:[1,2,4,7,11,16,22],alternating:[1,2,0,1,-1,0,-2],interleaved:[1,2,2,4,3,6,4],recurrence:[1,1,2,3,5,8,13],squares:[2,5,10,17,26,37,50],affine:[1,3,7,15,31,63,127],cubes:[2,9,28,65,126,217,344],triangular:[2,4,7,11,16,22,29]};
 for(const topic of seriesTopics){const q=seriesProblem({...seriesDefaults.Easy,topics:[topic]},()=>0);assert.deepEqual([...q.values,q.answer],expected[topic]);assert.ok(q.explanation.includes(String(q.answer)));}
});
test('all generated families preserve their defining relation for every visible length',()=>{
 const rng=seeded();
 for(const topic of seriesTopics)for(const terms of [6,7,8])for(let i=0;i<100;i++){
  const q=seriesProblem({...seriesDefaults.Hard,topics:[topic],terms},rng),v=[...q.values,q.answer];
  assert.equal(q.values.length,terms);assert.ok(v.every(Number.isSafeInteger));assert.equal(seriesAnswerCorrect(String(q.answer),q),true);assert.equal(seriesAnswerCorrect(String(q.answer+1),q),false);
  const gaps=v.slice(1).map((n,j)=>n-v[j]);
  if(topic==='arithmetic')assert.ok(gaps.every(n=>n===gaps[0]));
  if(topic==='geometric')assert.ok(v.slice(1).every((n,j)=>n/v[j]===v[1]/v[0]));
  if(topic==='differences'||topic==='squares')assert.ok(gaps.slice(1).every((n,j)=>n-gaps[j]===gaps[1]-gaps[0]));
  if(topic==='alternating')assert.ok(gaps.every((n,j)=>n===gaps[j%2]));
  if(topic==='recurrence')assert.ok(v.slice(2).every((n,j)=>n===v[j]+v[j+1]));
  if(topic==='interleaved')for(const parity of [0,1]){const sub=v.filter((_,j)=>j%2===parity);assert.ok(sub.slice(1).every((n,j)=>n-sub[j]===sub[1]-sub[0]));}
 }
});
test('family hints obey the setting and negative answers are supported',()=>{
 const c={...seriesDefaults.Easy,topics:['arithmetic']};
 const q=seriesProblem(c,()=>0.99);assert.ok(q.answer<0);assert.ok(q.hint.includes('Constant difference'));
 const hidden=seriesProblem({...c,showHint:false},()=>0.99);assert.equal(hidden.hint.includes('Constant difference'),false);
 assert.deepEqual(q.values,hidden.values);assert.equal(q.answer,hidden.answer);
});
test('integer grading rejects partial, fractional and unsafe input',()=>{
 for(const text of ['-12','−12',' -12 '])assert.equal(parseSeriesAnswer(text),-12);
 assert.equal(parseSeriesAnswer('+12'),12);assert.equal(parseSeriesAnswer('0'),0);
 for(const text of ['','1.5','12abc','1/2','NaN','Infinity','1e3','1,000','9007199254740992'])assert.equal(parseSeriesAnswer(text),null);
 assert.equal(seriesAnswerCorrect('',{answer:0}),false);
});
test('presets and persisted scores reject invalid combinations',()=>{
 for(const c of Object.values(seriesDefaults))assert.ok(validSeriesConfig(c));
 for(const change of [{topics:[]},{topics:['unknown']},{topics:['squares','squares']},{terms:5},{terms:9},{maxStart:0},{maxStep:21},{showHint:1},{duration:9}])assert.equal(validSeriesConfig({...seriesDefaults.Easy,...change}),false);
 const s={id:'series',game:'series',timestamp:new Date().toISOString(),difficulty:'Easy',config:seriesDefaults.Easy,duration:120,avgResponseMs:1200,correct:8,errors:2,score:8,accuracy:0.8};
 const data={version:1,sessions:[s],presets:[]};assert.equal(validateData(data),data);
 for(const change of [{score:9},{duration:90},{accuracy:1}])assert.throws(()=>validateData({...data,sessions:[{...s,...change}]}));
 assert.ok(validateData({...data,sessions:[{...s,score:0,correct:0,errors:0,accuracy:0,avgResponseMs:0}]}));
});

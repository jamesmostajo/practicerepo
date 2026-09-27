import test from 'node:test';
import assert from 'node:assert/strict';
import {probabilityDefaults,probabilityTopics,probabilityProblem,probabilityAnswerCorrect,parseProbabilityAnswer,validProbabilityConfig,diceProbability,noSuccessProbability,netExpectedValue} from '../shared/probability.mjs';
import {validateData} from '../shared/model.mjs';
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
function seeded(seed=42){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
test('dice probabilities enumerate ordered pairs and condition correctly',()=>{
 assert.deepEqual(diceProbability((a,b)=>a+b===7),{hits:6,total:36,probability:1/6});
 assert.deepEqual(diceProbability((a,b)=>a+b>=10,a=>a%2===0),{hits:4,total:18,probability:2/9});
 assert.throws(()=>diceProbability(()=>true,()=>false));
});
test('card complement accounts for sampling without replacement',()=>{
 approx(noSuccessProbability(4,52,3),48/52*47/51*46/50);
 assert.equal(noSuccessProbability(4,52,0),1);assert.equal(noSuccessProbability(4,52,52),0);
 assert.equal(noSuccessProbability(0,52,52),1);assert.throws(()=>noSuccessProbability(53,52,2));
});
test('expected net profit subtracts fee once and distinguishes break-even',()=>{
 assert.equal(netExpectedValue([{probability:0.25,payout:20},{probability:0.75,payout:0}],4),1);
 assert.equal(netExpectedValue([{probability:0.25,payout:20},{probability:0.75,payout:0}],5),0);
 assert.equal(netExpectedValue([{probability:0.2,payout:100},{probability:0.3,payout:50},{probability:0.5,payout:0}],40),-5);
 assert.throws(()=>netExpectedValue([{probability:0.8,payout:1}],0));
});
test('generator produces finite, gradable answers for every level and topic',()=>{
 const rng=seeded();
 for(const base of Object.values(probabilityDefaults))for(const topic of probabilityTopics)for(let i=0;i<150;i++){
  const q=probabilityProblem({...base,topics:[topic]},rng);assert.equal(q.topic,topic);assert.ok(Number.isFinite(q.exact));assert.ok(q.prompt&&q.hint&&q.explanation);
  assert.equal(probabilityAnswerCorrect(q.answer,q),true,JSON.stringify(q));
  if(q.kind==='probability'){assert.ok(q.exact>=0&&q.exact<=1);assert.equal(probabilityAnswerCorrect(`${q.exact*100}%`,q),true);}
 }
});
test('question text and expected values match deterministic scenarios',()=>{
 const make=(topic,level)=>probabilityProblem({...probabilityDefaults.Easy,topics:[topic],level},()=>0);
 approx(make('dice',1).exact,5/6);approx(make('dice',2).exact,1/36);approx(make('dice',3).exact,16/18);
 approx(make('cards',1).exact,13/52);approx(make('cards',2).exact,26/52*25/51);approx(make('cards',3).exact,1-48/52*47/51);
 assert.equal(make('ev',1).exact,2.5);approx(make('ev',3).exact,1.5);
 // Highest fee with certain receipt creates break-even; strictly +EV is no.
 let call=0;const q=probabilityProblem({...probabilityDefaults.Easy,topics:['bet']},()=>++call===2?0:0.99999);assert.equal(q.exact,0);assert.equal(q.answer,'no');
});
test('probability parsing and precision accept equivalent forms and reject invalid inputs',()=>{
 const q={kind:'probability',exact:1/6,precision:3};
 for(const text of ['1/6','0.167','16.7%'])assert.equal(probabilityAnswerCorrect(text,q),true);
 assert.equal(probabilityAnswerCorrect('0.16',q),false);
 for(const text of ['','1/0','1/2/3','101%','-0.1','NaN','Infinity','1e3','1,2','yes'])assert.equal(parseProbabilityAnswer(text,q),null);
 const money={kind:'money',exact:-1.25,precision:2};assert.equal(probabilityAnswerCorrect('−1.25',money),true);assert.equal(probabilityAnswerCorrect('-1.26',money),false);assert.equal(parseProbabilityAnswer('25%',money),null);
 for(const exact of [-2,0,2]){const decision={kind:'decision',exact};assert.equal(probabilityAnswerCorrect(exact>0?'Y':'N',decision),true);assert.equal(probabilityAnswerCorrect(exact>0?'no':'yes',decision),false);assert.equal(parseProbabilityAnswer('1',decision),null);}
});
test('probability settings and persisted metrics reject invalid combinations',()=>{
 for(const c of Object.values(probabilityDefaults))assert.ok(validProbabilityConfig(c));
 for(const change of [{topics:[]},{topics:['ev','ev']},{topics:['unknown']},{level:4},{decimals:0},{duration:9},{maxPayout:9}])assert.equal(validProbabilityConfig({...probabilityDefaults.Easy,...change}),false);
 const s={id:'prob',game:'ev',timestamp:new Date().toISOString(),difficulty:'Easy',config:probabilityDefaults.Easy,duration:120,avgResponseMs:1200,correct:8,errors:2,score:8,accuracy:0.8};
 const data={version:1,sessions:[s],presets:[]};assert.equal(validateData(data),data);
 for(const change of [{score:9},{duration:90},{accuracy:1}])assert.throws(()=>validateData({...data,sessions:[{...s,...change}]}));
 assert.ok(validateData({...data,sessions:[{...s,score:0,correct:0,errors:0,accuracy:0,avgResponseMs:0}]}));
});

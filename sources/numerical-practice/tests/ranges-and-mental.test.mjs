import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,problem,validConfig,editableArithmeticConfig,validateData} from '../shared/model.mjs';
import {mentalDefaults,mentalTopics,mentalProblem,mentalAnswerCorrect,parseMentalAnswer,validMentalConfig} from '../shared/mental.mjs';

function seeded(seed=42){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}

test('independent factors reach 100 and stay in their own ranges',()=>{
  const config={...defaults.Medium,operations:{multiply:[2,12]}};
  assert.equal(validConfig(config),true);
  const rng=seeded();let sawLarge=false;
  for(let i=0;i<2000;i++){const q=problem(config,rng);assert.ok(q.a>=2&&q.a<=12);assert.ok(q.b>=2&&q.b<=100);assert.equal(q.answer,q.a*q.b);sawLarge ||= q.b>12;}
  assert.ok(sawLarge);
  assert.equal(problem(config,()=>0.999999).b,100);
});

test('division bounds the actual dividend and divisor with integer answers',()=>{
  const config={...defaults.Medium,operations:{divide:[2,12]}};
  const rng=seeded();
  for(let i=0;i<2000;i++){const q=problem(config,rng);assert.ok(q.a>=2&&q.a<=100);assert.ok(q.b>=2&&q.b<=12);assert.ok(Number.isInteger(q.answer));assert.equal(q.answer,q.a/q.b);}
  const exact={duration:120,operations:{divide:[7,7]},secondRanges:{divide:[98,98]},divisionRangeMode:'dividend'};
  assert.ok(validConfig(exact));assert.equal(problem(exact).answer,14);
  assert.equal(validConfig({...exact,secondRanges:{divide:[99,100]}}),false);
  assert.equal(validConfig({...config,secondRanges:{multiply:[9,2]}}),false);
});

test('legacy presets retain their answer-range semantics and backups remain valid',()=>{
  const legacy={duration:120,operations:{divide:[2,12],multiply:[2,12]}};
  const upgraded=editableArithmeticConfig(legacy);
  assert.equal(upgraded.divisionRangeMode,'quotient');assert.equal(legacy.secondRanges,undefined);
  const rng=seeded();
  for(let i=0;i<200;i++){const q=problem({...upgraded,operations:{divide:[2,12]}},rng);assert.ok(q.answer>=2&&q.answer<=12);}
  const backup={version:1,sessions:[],presets:[{id:'old',name:'Old preset',game:'arithmetic',config:legacy},{id:'new',name:'Mental',game:'mental-math',config:mentalDefaults.Medium}]};
  assert.equal(validateData(backup),backup);
});

test('every mental topic produces finite graded answers under all tiers',()=>{
  for(const config of Object.values(mentalDefaults)){
    assert.ok(validMentalConfig(config));
    for(const topic of mentalTopics){
      const rng=seeded();
      for(let i=0;i<200;i++){
        const q=mentalProblem({...config,topics:[topic]},rng);
        assert.equal(q.topic,topic);assert.ok(Number.isFinite(q.exact));
        assert.ok(q.prompt.length>0&&q.explanation.length>0&&q.hint.length>0);
        assert.ok(mentalAnswerCorrect(String(q.answer),q));
        assert.equal(mentalAnswerCorrect(String(q.answer+Math.abs(q.answer)+1000),q),false);
      }
    }
  }
});

test('mental calculations use the right principal, rate and compounding formulas',()=>{
  // With random fixed at zero: amount=50, rate=1, years=1, fraction=1/2.
  const q=topic=>mentalProblem({...mentalDefaults.Medium,topics:[topic]},()=>0);
  assert.equal(q('percentOf').answer,0.5);
  assert.equal(q('percentChange').answer,-1);
  assert.equal(q('fraction').answer,0.5);
  assert.equal(q('interest').answer,0.5);
  assert.equal(q('compound').answer,50.5);
  // Fixed max selections: 5000 at 25% for 4 years.
  const high=mentalProblem({...mentalDefaults.Medium,topics:['compound']},()=>0.999999);
  assert.equal(high.exact,5000*1.25**4);
  const interest=mentalProblem({...mentalDefaults.Medium,topics:['interest']},()=>0.999999);
  assert.equal(interest.exact,5000);
});

test('mental answers handle rounding, signed percentages and tolerance boundaries',()=>{
  const q={unit:'',answer:0.333,exact:1/3,tolerance:0};
  assert.ok(mentalAnswerCorrect('0.333',q));assert.equal(mentalAnswerCorrect('0.33',q),false);
  assert.equal(parseMentalAnswer('1/3',q),null);assert.equal(parseMentalAnswer('',q),null);
  assert.equal(parseMentalAnswer('1,250.50',q),1250.5);
  assert.equal(parseMentalAnswer('−5%',{unit:'%'}),-5);
  assert.equal(parseMentalAnswer('5%',q),null);
  const estimate={...q,answer:100,exact:100,tolerance:1};
  assert.ok(mentalAnswerCorrect('99',estimate));assert.ok(mentalAnswerCorrect('101',estimate));
  assert.equal(mentalAnswerCorrect('98.99',estimate),false);assert.equal(mentalAnswerCorrect('101.01',estimate),false);
});

test('invalid mental presets and mismatched game schemas are rejected',()=>{
  for(const change of [{topics:[]},{topics:['fraction','fraction']},{decimals:0},{maxRate:101},{maxYears:11},{compoundTolerance:0},{maxDenominator:1},{maxAmount:99}])assert.equal(validMentalConfig({...mentalDefaults.Easy,...change}),false);
  assert.equal(validConfig(defaults.Easy,'mental-math'),false);
  assert.equal(validConfig(mentalDefaults.Easy,'arithmetic'),false);
});

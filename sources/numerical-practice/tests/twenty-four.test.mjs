import test from 'node:test';
import assert from 'node:assert/strict';
import {twentyFourDefaults,validTwentyFourConfig,solveTwentyFour,checkTwentyFour,twentyFourProblem} from '../shared/twenty-four.mjs';
import {validateData} from '../shared/model.mjs';
function seeded(seed=42){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
test('expression grammar respects precedence and exact fractional arithmetic',()=>{
 assert.equal(checkTwentyFour('(1+3)*(2+4)',[1,2,3,4]).correct,true);
 assert.equal(checkTwentyFour('8 / (3 - 8 / 3)',[3,3,8,8]).correct,true);
 assert.equal(checkTwentyFour('8 ÷ (3 − 8 ÷ 3)',[3,3,8,8]).correct,true);
 const precedence=checkTwentyFour('1+2*3+4',[1,2,3,4]);assert.equal(precedence.value,'11');assert.equal(precedence.correct,false);assert.equal(precedence.valid,true);
 assert.equal(checkTwentyFour('(1-3)*(2-4)',[1,2,3,4],4,true).correct,true);
 assert.equal(checkTwentyFour('8/(3-8/3)',[3,3,8,8],24,true).valid,false);
});
test('card multiset, syntax and prohibited operations are enforced',()=>{
 for(const expression of ['','24','1+2+3','1+2+3+3','1+2+3+4+0','(1+3)(2+4)','1+2**3+4','1+2^3+4','1!+2+3+4','-1+2+3+4','Math.max(1,2,3,4)','1.0+2+3+4','(1+2+3+4','1+2+3+4)','globalThis.alert(1)'])assert.equal(checkTwentyFour(expression,[1,2,3,4]).valid,false,expression);
 assert.equal(checkTwentyFour('6/(1-1)+4',[6,1,1,4]).valid,false);
 assert.equal(checkTwentyFour('('.repeat(30)+'1+2+3+4'+')'.repeat(30),[1,2,3,4]).valid,false);
 assert.equal(checkTwentyFour('1'.repeat(201),[1,2,3,4]).valid,false);
 assert.equal(checkTwentyFour('6*4*(1/1)',[6,4,1,1]).correct,true);
});
test('solver finds fractional, integer and alternative solutions or returns null',()=>{
 assert.equal(solveTwentyFour([1,1,1,1],24),null);
 assert.equal(solveTwentyFour([3,3,8,8],24,true),null);
 for(const cards of [[1,2,3,4],[3,3,8,8],[1,5,5,5],[6,6,6,6]]){const solution=solveTwentyFour(cards);assert.ok(solution);assert.equal(checkTwentyFour(solution,cards).correct,true);}
 for(const expression of ['(1+3)*(2+4)','1*2*3*4'])assert.equal(checkTwentyFour(expression,[1,2,3,4]).correct,true);
});
test('every generated or fallback hand is solvable under its exact preset',()=>{
 const rng=seeded();
 for(const base of Object.values(twentyFourDefaults))for(const target of [12,24,36,48])for(let i=0;i<12;i++){
  const c={...base,target},q=twentyFourProblem(c,rng);assert.equal(q.cards.length,4);assert.ok(q.cards.every(n=>n>=1&&n<=c.maxCard));assert.equal(q.target,target);assert.equal(checkTwentyFour(q.solution,q.cards,target,c.integerOnly).correct,true);assert.equal(q.steps.length,3);
 }
 for(const target of [12,24,36,48]){const c={...twentyFourDefaults.Easy,target},q=twentyFourProblem(c,()=>0);assert.equal(checkTwentyFour(q.solution,q.cards,target,true).correct,true);}
});
test('Make 24 settings and persisted metrics reject invalid combinations',()=>{
 for(const c of Object.values(twentyFourDefaults))assert.ok(validTwentyFourConfig(c));
 for(const change of [{duration:9},{target:25},{maxCard:5},{maxCard:14},{integerOnly:'yes'}])assert.equal(validTwentyFourConfig({...twentyFourDefaults.Easy,...change}),false);
 const s={id:'24',game:'twenty-four',timestamp:new Date().toISOString(),difficulty:'Easy',config:twentyFourDefaults.Easy,duration:120,avgResponseMs:1200,correct:8,errors:2,score:8,accuracy:0.8};
 const data={version:1,sessions:[s],presets:[]};assert.equal(validateData(data),data);
 for(const change of [{score:9},{duration:90},{accuracy:1}])assert.throws(()=>validateData({...data,sessions:[{...s,...change}]}));
});

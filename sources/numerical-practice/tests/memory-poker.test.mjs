import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeMemoryPokerRound,createMemoryPokerRound,evaluateHand,memoryPokerDefaults,resolveMemoryPokerRound,validMemoryPokerConfig} from '../shared/memory-poker.mjs';
import {validateData} from '../shared/model.mjs';
function seeded(seed=7){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
const suits={s:'♠',h:'♥',d:'♦',c:'♣'};
const ranks={A:1,K:13,Q:12,J:11,T:10};
const card=text=>({rank:ranks[text[0]]??Number(text[0]),suit:suits[text[1]]});
const hand=text=>evaluateHand(text.split(' ').map(card));

test('hand categories are detected and named',()=>{
 const cases=[['As Ks Qs Js Ts',8,'Royal flush'],['5h 4h 3h 2h Ah',8,'Straight flush, Five high'],['9c 9d 9h 9s 2c',7,'Four Nines'],
  ['Kc Kd Kh 4s 4c',6,'Full house, Kings full of Fours'],['Ad 9d 7d 4d 2d',5,'Flush, Ace high'],['5c 4d 3h 2s Ac',4,'Straight, Five high'],
  ['Tc Jd Qh Ks Ac',4,'Straight, Ace high'],['6c 6d 6h Ks 2c',3,'Three Sixes'],['Qc Qd 3h 3s 9c',2,'Two pair, Queens and Threes'],
  ['Jc Jd 8h 4s 2c',1,'Pair of Jacks'],['Ac Jd 8h 4s 2c',0,'Ace high']];
 for(const [cards,category,name] of cases){const h=hand(cards);assert.equal(h.category,category,cards);assert.equal(h.name,name);}
 assert.equal(hand('Qc Kd Ah 2s 3c').category,0,'no wrap-around straights');
 assert.throws(()=>hand('Ac Ac Kd Qh Js'));assert.throws(()=>hand('Ac Kd'));
});

test('hand values order categories, kickers and ties',()=>{
 const ordered=['Ac Jd 8h 4s 2c','2c 2d 3h 4s 6c','Ac Ad Kh Qs Jc','3c 3d 2h 2s Ac','4c 4d 2h 2s 3c','2c 2d 2h 4s 5c','5c 4d 3h 2s Ac','6c 5d 4h 3s 2c',
  '2d 3d 4d 5d 7d','Kc Kd Kh 2s 2c','2c 2d 2h 2s 3c','5h 4h 3h 2h Ah','As Ks Qs Js Ts'];
 for(let i=1;i<ordered.length;i++)assert.ok(hand(ordered[i]).value>hand(ordered[i-1]).value,`${ordered[i]} > ${ordered[i-1]}`);
 assert.ok(hand('Ac Ad Kh 4s 3c').value>hand('Ac Ad Qh Js Tc').value,'pair kicker');
 assert.ok(hand('Kc Kd 2h 2s 9c').value>hand('Qc Qd Jh Js Ac').value,'top pair decides two pair');
 assert.equal(hand('Ac Kd 9h 5s 3c').value,hand('Ad Kh 9s 5c 3d').value,'suits never break ties');
});

test('rounds deal 16 grid cards and a 3-card flop with no duplicates',()=>{
 const random=seeded();
 for(let i=0;i<200;i++){
  const round=createMemoryPokerRound(random);assert.equal(round.grid.length,16);assert.equal(round.flop.length,3);
  assert.equal(new Set([...round.grid,...round.flop].map(c=>`${c.rank}${c.suit}`)).size,19);
 }
});

test('scoring is 100 for any optimal pair, 0 for the weakest, percentile in between',()=>{
 const random=seeded(99);
 for(let n=0;n<50;n++){
  const round=createMemoryPokerRound(random);const analysis=analyzeMemoryPokerRound(round);
  assert.equal(analysis.pairs.length,120);
  for(const pair of analysis.best){const r=resolveMemoryPokerRound(round,pair.cards);assert.equal(r.score,100);assert.equal(r.optimal,true);assert.equal(r.strongerHands,0);}
  const worst=analysis.pairs.reduce((a,b)=>b.hand.value<a.hand.value?b:a);
  if(analysis.bestWeaker>0)assert.equal(resolveMemoryPokerRound(round,worst.cards).score,0);
  for(const pair of analysis.pairs){
   const r=resolveMemoryPokerRound(round,pair.cards);
   const below=analysis.pairs.filter(p=>p.hand.value<pair.hand.value).length;
   const bestBelow=analysis.pairs.filter(p=>p.hand.value<analysis.bestHand.value).length;
   assert.equal(r.score,r.optimal?100:Math.round(100*below/bestBelow));
   assert.ok(r.score>=0&&r.score<=100);
  }
 }
});

test('incomplete selections score zero and count as timeouts',()=>{
 const round=createMemoryPokerRound(seeded(3));
 for(const selection of [[],[4]]){const r=resolveMemoryPokerRound(round,selection,true);assert.equal(r.score,0);assert.equal(r.timedOut,true);assert.equal(r.complete,false);assert.equal(r.optimal,false);}
 const auto=resolveMemoryPokerRound(round,[2,5],true);assert.equal(auto.complete,true);assert.equal(auto.timedOut,true);
 assert.throws(()=>resolveMemoryPokerRound(round,[1,2,3]));assert.throws(()=>resolveMemoryPokerRound(round,[16,2]));
});

test('memory poker config and sessions are validated',()=>{
 assert.deepEqual(memoryPokerDefaults.Medium,{rounds:3,memorizeSeconds:20,selectSeconds:10});
 for(const config of Object.values(memoryPokerDefaults))assert.ok(validMemoryPokerConfig(config));
 for(const change of [{rounds:0},{rounds:21},{memorizeSeconds:2},{selectSeconds:61},{selectSeconds:1.5}])assert.equal(validMemoryPokerConfig({...memoryPokerDefaults.Medium,...change}),false);
 const session={id:'mp',game:'memory-poker',timestamp:new Date().toISOString(),difficulty:'Medium',config:memoryPokerDefaults.Medium,duration:90,avgResponseMs:4000,
  correct:2,errors:1,accuracy:2/3,score:85,averageScore:85,rounds:3};
 const data={version:1,sessions:[session],presets:[]};assert.equal(validateData(data),data);
 for(const invalid of [{score:101},{averageScore:80},{rounds:4},{correct:3},{accuracy:1}])assert.throws(()=>validateData({...data,sessions:[{...session,...invalid}]}));
});

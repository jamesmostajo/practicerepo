import {cardDeck} from './cards.mjs';
/** Memory Poker: memorize a 4×4 grid, then pick two cards that make the best five-card hand with the flop. */
/** @type {Record<'Easy'|'Medium'|'Hard', import('../src/lib/types').MemoryPokerConfig>} */
export const memoryPokerDefaults={
 Easy:{rounds:3,memorizeSeconds:30,selectSeconds:15},
 Medium:{rounds:3,memorizeSeconds:20,selectSeconds:10},
 Hard:{rounds:3,memorizeSeconds:10,selectSeconds:6}
};
export const memoryPokerLimits={rounds:[1,20],memorizeSeconds:[3,120],selectSeconds:[3,60]};
export const GRID_SIZE=16,FLOP_SIZE=3;
export function validMemoryPokerConfig(c){
 const integer=(v,[lo,hi])=>Number.isInteger(v)&&v>=lo&&v<=hi;
 return !!c&&integer(c.rounds,memoryPokerLimits.rounds)&&integer(c.memorizeSeconds,memoryPokerLimits.memorizeSeconds)&&integer(c.selectSeconds,memoryPokerLimits.selectSeconds);
}
export const categoryNames=['High card','Pair','Two pair','Three of a kind','Straight','Flush','Full house','Four of a kind','Straight flush'];
const rankName={14:'Ace',13:'King',12:'Queen',11:'Jack',10:'Ten',9:'Nine',8:'Eight',7:'Seven',6:'Six',5:'Five',4:'Four',3:'Three',2:'Two'};
const plural=r=>r===6?'Sixes':`${rankName[r]}s`;
const high=card=>card.rank===1?14:card.rank;
/** Evaluates exactly five cards. `value` orders hands: higher is stronger, equal means a tie. */
export function evaluateHand(cards){
 if(!Array.isArray(cards)||cards.length!==5)throw Error('A poker hand needs exactly five cards.');
 if(new Set(cards.map(c=>`${c.rank}${c.suit}`)).size!==5)throw Error('Duplicate card in hand.');
 const ranks=cards.map(high).sort((a,b)=>b-a);
 const counts=new Map();for(const r of ranks)counts.set(r,(counts.get(r)||0)+1);
 // Group by count, then rank: e.g. full house K K K 4 4 → [[13,3],[4,2]].
 const groups=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
 const flush=cards.every(c=>c.suit===cards[0].suit);
 let straightHigh=0;
 if(groups.length===5){
  if(ranks[0]-ranks[4]===4)straightHigh=ranks[0];
  else if(ranks.join()==='14,5,4,3,2')straightHigh=5;// The wheel: A-2-3-4-5.
 }
 let category,kickers;
 if(straightHigh&&flush){category=8;kickers=[straightHigh];}
 else if(groups[0][1]===4){category=7;kickers=groups.map(g=>g[0]);}
 else if(groups[0][1]===3&&groups[1][1]===2){category=6;kickers=groups.map(g=>g[0]);}
 else if(flush){category=5;kickers=ranks;}
 else if(straightHigh){category=4;kickers=[straightHigh];}
 else if(groups[0][1]===3){category=3;kickers=groups.map(g=>g[0]);}
 else if(groups[0][1]===2&&groups[1][1]===2){category=2;kickers=groups.map(g=>g[0]);}
 else if(groups[0][1]===2){category=1;kickers=groups.map(g=>g[0]);}
 else {category=0;kickers=ranks;}
 const padded=[...kickers,0,0,0,0,0].slice(0,5);
 const value=padded.reduce((v,k)=>v*15+k,category);
 const top=groups[0][0];
 const name=category===8?(straightHigh===14?'Royal flush':`Straight flush, ${rankName[straightHigh]} high`)
  :category===7?`Four ${plural(top)}`:category===6?`Full house, ${plural(top)} full of ${plural(groups[1][0])}`
  :category===5?`Flush, ${rankName[ranks[0]]} high`:category===4?`Straight, ${rankName[straightHigh]} high`
  :category===3?`Three ${plural(top)}`:category===2?`Two pair, ${plural(top)} and ${plural(groups[1][0])}`
  :category===1?`Pair of ${plural(top)}`:`${rankName[ranks[0]]} high`;
 return {category,value,name,categoryName:categoryNames[category]};
}
/** @returns {import('../src/lib/types').MemoryPokerRound} */
export function createMemoryPokerRound(random=Math.random){
 const deck=cardDeck();const draw=()=>deck.splice(Math.floor(random()*deck.length),1)[0];
 const grid=Array.from({length:GRID_SIZE},draw);const flop=Array.from({length:FLOP_SIZE},draw);
 return {grid,flop};
}
/** Every two-card choice from the grid, scored against the flop. */
export function analyzeMemoryPokerRound(round){
 const {grid,flop}=round;
 if(!Array.isArray(grid)||grid.length!==GRID_SIZE||!Array.isArray(flop)||flop.length!==FLOP_SIZE)throw Error('Invalid round.');
 const pairs=[];
 for(let i=0;i<grid.length;i++)for(let j=i+1;j<grid.length;j++)pairs.push({cards:[i,j],hand:evaluateHand([grid[i],grid[j],...flop])});
 const values=pairs.map(p=>p.hand.value).sort((a,b)=>a-b);
 // W(value) = number of pairs strictly weaker than a hand of that value.
 const weaker=value=>{let lo=0,hi=values.length;while(lo<hi){const mid=(lo+hi)>>1;if(values[mid]<value)lo=mid+1;else hi=mid;}return lo;};
 const bestValue=values.at(-1);
 const best=pairs.filter(p=>p.hand.value===bestValue);
 return {pairs,best,bestHand:best[0].hand,weaker,bestWeaker:weaker(bestValue),distinct:new Set(values).size};
}
/** Round score = round(100 × W(yours) / W(best)); any hand tying the best scores 100. Fewer than two picks scores 0. */
export function resolveMemoryPokerRound(round,selection,timedOut=false){
 const analysis=analyzeMemoryPokerRound(round);
 const picks=Array.isArray(selection)?[...new Set(selection)].sort((a,b)=>a-b):[];
 if(picks.some(i=>!Number.isInteger(i)||i<0||i>=GRID_SIZE)||picks.length>2)throw Error('Choose two cards from the grid.');
 const optimalPairs=analysis.best.map(p=>p.cards);
 const base={selection:picks,timedOut,bestHand:analysis.bestHand.name,bestCategory:analysis.bestHand.category,optimalPairs,distinctHands:analysis.distinct};
 if(picks.length<2)return {...base,complete:false,hand:null,category:null,score:0,optimal:false,strongerHands:analysis.distinct,timedOut:true};
 const hand=evaluateHand([round.grid[picks[0]],round.grid[picks[1]],...round.flop]);
 const optimal=hand.value===analysis.bestHand.value;
 const score=optimal||analysis.bestWeaker===0?100:Math.round(100*analysis.weaker(hand.value)/analysis.bestWeaker);
 const stronger=new Set(analysis.pairs.filter(p=>p.hand.value>hand.value).map(p=>p.hand.value)).size;
 return {...base,complete:true,hand:hand.name,category:hand.category,score,optimal,strongerHands:stronger};
}

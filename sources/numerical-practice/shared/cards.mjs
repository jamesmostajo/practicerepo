import {decideTrade,takeQuote} from './counterparty.mjs';
/** @type {Record<'Easy'|'Medium'|'Hard', import('../src/lib/types').CardConfig>} */
export const cardDefaults={
 Easy:{rounds:10,roundSeconds:30,visibleCards:1,hiddenCards:1,spread:1.5,maxEdge:3,quoteNoise:6,aggressiveness:0.8,noiseTradeProbability:0.2,showFairValue:true},
 Medium:{rounds:15,roundSeconds:20,visibleCards:2,hiddenCards:2,spread:1,maxEdge:1.5,quoteNoise:3,aggressiveness:0.8,noiseTradeProbability:0.15,showFairValue:false},
 Hard:{rounds:20,roundSeconds:12,visibleCards:3,hiddenCards:3,spread:0.5,maxEdge:0.6,quoteNoise:1.5,aggressiveness:0.9,noiseTradeProbability:0.1,showFairValue:false}
};
export function validCardConfig(c){
 const integer=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;
 const number=(v,lo,hi)=>Number.isFinite(v)&&v>=lo&&v<=hi;
 return !!c&&integer(c.rounds,3,50)&&integer(c.roundSeconds,5,120)&&integer(c.visibleCards,1,5)&&integer(c.hiddenCards,1,3)
  &&number(c.spread,0.1,8)&&number(c.maxEdge,0.1,5)&&number(c.quoteNoise,0,10)&&number(c.aggressiveness,0,1)
  &&number(c.noiseTradeProbability,0,1)&&typeof c.showFairValue==='boolean';
}
export function cardDeck(){
 return ['♠','♥','♦','♣'].flatMap(suit=>Array.from({length:13},(_,index)=>({rank:index+1,suit})));
}
export function cardLabel(card){return `${({1:'A',11:'J',12:'Q',13:'K'})[card.rank]||card.rank}${card.suit}`;}
export function handFairValue(visible,hiddenCount){
 if(!Array.isArray(visible)||visible.length<1||visible.length>5||!Number.isInteger(hiddenCount)||hiddenCount<1||hiddenCount>3)throw Error('Invalid hand.');
 const seen=new Set();
 for(const card of visible){const key=`${card.rank}${card.suit}`;if(!Number.isInteger(card.rank)||card.rank<1||card.rank>13||!['♠','♥','♦','♣'].includes(card.suit)||seen.has(key))throw Error('Invalid or duplicate card.');seen.add(key);}
 const visibleSum=visible.reduce((sum,c)=>sum+c.rank,0);
 return visibleSum+hiddenCount*(364-visibleSum)/(52-visible.length);
}
const cents=n=>Math.round(n*100)/100;
/** The dealer's shared-engine demand determines quote skew, not execution.
 * Buy demand raises its book; sell demand lowers it; pass gives a fair book.
 * Once posted, the book is firm and can always be taken by the user.
 */
export function cardQuote(fairValue,config,random=Math.random){
 const spread=cents(config.spread);
 const demand=decideTrade({bid:fairValue-spread/2,ask:fairValue+spread/2,trueValue:fairValue,
  aggressiveness:config.aggressiveness,noise:config.quoteNoise,noiseTradeProbability:config.noiseTradeProbability,edgeScale:1},random);
 let midpoint=fairValue;
 if(demand.action!=='pass'){
  const mispricing=0.05+random()*(config.maxEdge-0.05);
  midpoint+=(demand.action==='buy'?1:-1)*(spread/2+mispricing);
 }
 const bid=cents(Math.max(0.01,midpoint-spread/2));
 return {bid,ask:cents(bid+spread)};
}
/** @param {import('../src/lib/types').CardConfig} config
 * @returns {import('../src/lib/types').CardRound} */
export function createCardRound(config,random=Math.random){
 if(!validCardConfig(config))throw Error('Invalid card settings.');
 const deck=cardDeck();const dealt=[];
 for(let i=0;i<config.visibleCards+config.hiddenCards;i++)dealt.push(deck.splice(Math.floor(random()*deck.length),1)[0]);
 const visible=dealt.slice(0,config.visibleCards),hidden=dealt.slice(config.visibleCards);
 const fairValue=handFairValue(visible,config.hiddenCards);
 return {visible,hidden,fairValue,payout:dealt.reduce((sum,c)=>sum+c.rank,0),...cardQuote(fairValue,config,random)};
}
/** @param {import('../src/lib/types').CardRound} round */
export function cardEdges(round){return {buy:round.fairValue-round.ask,sell:round.bid-round.fairValue,pass:0};}
/** @param {import('../src/lib/types').CardRound} round
 * @param {'buy'|'sell'|'pass'} action
 * @returns {import('../src/lib/types').CardOutcome} */
export function resolveCardRound(round,action,timedOut=false){
 if(!['buy','sell','pass'].includes(action))throw Error('Choose buy, sell or pass.');
 if(timedOut)action='pass';
 const fill=takeQuote({...round,action});
 const edges=cardEdges(round);const bestEdge=Math.max(edges.buy,edges.sell,0);
 const bestAction=edges.buy>1e-9?'buy':edges.sell>1e-9?'sell':'pass';
 const edge=edges[action];
 // Every hand settles immediately. No inventory carries to another deck.
 const pnl=fill.cashDelta+fill.inventoryDelta*round.payout;
 return {action,price:fill.price,edge,pnl,bestEdge,bestAction,missedEdge:Math.max(0,bestEdge-edge),
  correct:!timedOut&&Math.abs(edge-bestEdge)<1e-9,timedOut};
}

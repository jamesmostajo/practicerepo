import {decideTrade,makerFill,takeQuote} from './counterparty.mjs';
/** @type {Record<'Easy'|'Medium'|'Hard', import('../src/lib/types').TradingConfig>} */
export const tradingDefaults={
 Easy:{rounds:10,quoteSeconds:30,takeSeconds:20,maxValue:100,maxSpread:4,aggressiveness:0.5,noise:4,noiseTradeProbability:0.3,bookSpread:2,bookSkew:5,settlementRisk:5},
 Medium:{rounds:15,quoteSeconds:20,takeSeconds:12,maxValue:300,maxSpread:2,aggressiveness:0.75,noise:2,noiseTradeProbability:0.2,bookSpread:1,bookSkew:2,settlementRisk:10},
 Hard:{rounds:20,quoteSeconds:12,takeSeconds:8,maxValue:1000,maxSpread:1,aggressiveness:1,noise:1,noiseTradeProbability:0.1,bookSpread:0.5,bookSkew:1,settlementRisk:15}
};
export function validTradingConfig(c){
 const n=(v,lo,hi)=>Number.isFinite(v)&&v>=lo&&v<=hi;
 const i=(v,lo,hi)=>Number.isInteger(v)&&n(v,lo,hi);
 return !!c&&i(c.rounds,3,50)&&i(c.quoteSeconds,5,120)&&i(c.takeSeconds,5,120)&&i(c.maxValue,20,1000)
 &&n(c.maxSpread,0.1,10)&&n(c.aggressiveness,0,1)&&n(c.noise,0,20)&&n(c.noiseTradeProbability,0,1)
 &&n(c.bookSpread,0.1,10)&&n(c.bookSkew,0,10)&&i(c.settlementRisk,0,15);
}
const cents=v=>Math.round(v*100)/100;
/** @param {import('../src/lib/types').TradingConfig} config
 * @returns {import('../src/lib/types').TradingRound} */
export function createTradingRound(config,random=Math.random){
 if(!validTradingConfig(config))throw Error('Invalid trading settings.');
 const fairValue=cents(20+random()*(config.maxValue-20));
 const midpoint=fairValue+(random()*2-1)*config.bookSkew;
 const bid=cents(midpoint-config.bookSpread/2),ask=cents(bid+config.bookSpread);
 // Independent, symmetric settlement shock. Neither trader knows the draw.
 const payout=cents(fairValue+Math.floor(random()*(2*config.settlementRisk+1))-config.settlementRisk);
 return {fairValue,bid,ask,payout};
}
export function tradingQuoteError(config,bid,ask){
 if(!Number.isFinite(bid)||!Number.isFinite(ask)||bid<0||ask>config.maxValue+30)return `Prices must be between 0 and ${config.maxValue+30}.`;
 if(bid>=ask)return 'Bid must be below ask.';
 if(ask-bid>config.maxSpread+1e-9)return `Keep the spread at or below ${config.maxSpread}.`;
 return '';
}
/** @param {import('../src/lib/types').TradingRound} round
 * @param {{bid:number,ask:number}|null} quote
 * @param {import('../src/lib/types').TradingConfig} config
 * @returns {import('../src/lib/types').PassiveLeg} */
export function quoteTradingRound(round,quote,config,random=Math.random){
 if(!validTradingConfig(config))throw Error('Invalid trading settings.');
 if(!quote)return {bid:null,ask:null,action:'pass',price:null,inventoryDelta:0,cashDelta:0,edge:0,timedOut:true};
 const error=tradingQuoteError(config,quote.bid,quote.ask);if(error)throw Error(error);
 const trade=decideTrade({...quote,trueValue:round.fairValue,aggressiveness:config.aggressiveness,noise:config.noise,noiseTradeProbability:config.noiseTradeProbability,edgeScale:1},random);
 const fill=makerFill(trade);
 return {...quote,action:trade.action,price:trade.price,...fill,edge:fill.cashDelta+fill.inventoryDelta*round.fairValue,timedOut:false};
}
/** @param {import('../src/lib/types').TradingRound} round
 * @param {import('../src/lib/types').PassiveLeg} passive
 * @param {'buy'|'sell'|'pass'} action
 * @returns {import('../src/lib/types').TradingOutcome} */
export function settleTradingRound(round,passive,action,timedOut=false){
 if(!['buy','sell','pass'].includes(action))throw Error('Choose buy, sell or pass.');
 if(timedOut)action='pass';
 const fill=takeQuote({...round,action});
 const edges={buy:round.fairValue-round.ask,sell:round.bid-round.fairValue,pass:0};
 const bestEdge=Math.max(edges.buy,edges.sell,0),activeEdge=edges[action];
 const passiveGrossPnl=passive.cashDelta+passive.inventoryDelta*round.payout;
 const activeGrossPnl=fill.cashDelta+fill.inventoryDelta*round.payout;
 const passivePnl=passiveGrossPnl-Number(passive.timedOut),activePnl=activeGrossPnl-Number(timedOut);
 return {action,price:fill.price,activeTimedOut:timedOut,activeEdge,passivePnl,activePnl,
  grossPnl:passiveGrossPnl+activeGrossPnl,penalties:Number(passive.timedOut)+Number(timedOut),pnl:passivePnl+activePnl,
  inventory:passive.inventoryDelta+fill.inventoryDelta,correct:!timedOut&&Math.abs(activeEdge-bestEdge)<1e-9,
  bestEdge,missedEdge:Math.max(0,bestEdge-activeEdge),bestAction:edges.buy>1e-9?'buy':edges.sell>1e-9?'sell':'pass'};
}

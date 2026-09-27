import {decideTrade,makerFill} from './counterparty.mjs';
/** @type {Record<'Easy'|'Medium'|'Hard', import('../src/lib/types').EventConfig>} */
export const eventDefaults={
 Easy:{rounds:10,roundSeconds:35,evidenceSamples:100,maxSpread:20,noiseTraders:2,noiseActivity:0.65,informedAggressiveness:0.6,calibrationWeight:20},
 Medium:{rounds:15,roundSeconds:25,evidenceSamples:40,maxSpread:12,noiseTraders:3,noiseActivity:0.6,informedAggressiveness:0.8,calibrationWeight:20},
 Hard:{rounds:20,roundSeconds:15,evidenceSamples:15,maxSpread:8,noiseTraders:4,noiseActivity:0.55,informedAggressiveness:1,calibrationWeight:20}
};
export function validEventConfig(c){
 const integer=(n,lo,hi)=>Number.isInteger(n)&&n>=lo&&n<=hi;
 const number=(n,lo,hi)=>Number.isFinite(n)&&n>=lo&&n<=hi;
 return !!c&&integer(c.rounds,3,50)&&integer(c.roundSeconds,5,120)&&integer(c.evidenceSamples,5,200)
  &&number(c.maxSpread,1,50)&&integer(c.noiseTraders,1,8)&&number(c.noiseActivity,0,1)
  &&number(c.informedAggressiveness,0.1,1)&&number(c.calibrationWeight,1,100);
}
const prompts=[
 ['shipment','Will the next shipment pass its damage check?','undamaged shipments'],
 ['cache','Will the next request be a cache hit?','cache hits'],
 ['auction','Will the next simulated auction meet its reserve?','auctions meeting reserve'],
 ['sensor','Will the next sensor reading be within tolerance?','readings within tolerance'],
 ['battery','Will the next tested battery meet its runtime target?','batteries meeting target'],
 ['support','Will the next support ticket close within a day?','tickets closed within a day'],
 ['harvest','Will the next simulated plot meet its yield target?','plots meeting target'],
 ['backup','Will the next backup finish before its deadline?','backups completed on time'],
 ['delivery','Will the next delivery arrive on time?','on-time deliveries'],
 ['quality','Will the next component pass inspection?','components passing inspection'],
 ['request','Will the next request finish within its latency target?','requests meeting the target'],
 ['renewal','Will the next customer renew?','customer renewals'],
 ['flight','Will the next flight depart on schedule?','on-schedule departures'],
 ['shot','Will the next attempt hit the target?','successful attempts'],
 ['rain','Will the next simulated day be rainy?','rainy days'],
 ['task','Will the next task finish before its deadline?','tasks meeting the deadline'],
];
/** Synthetic Bernoulli events only; no real-world forecasts or live data.
 * @param {import('../src/lib/types').EventConfig} config
 * @returns {import('../src/lib/types').EventRound} */
export function createEventRound(config,random=Math.random){
 if(!validEventConfig(config))throw Error('Invalid event settings.');
 const [id,prompt,evidenceLabel]=prompts[Math.floor(random()*prompts.length)];
 const trueProbability=(5+Math.floor(random()*91))/100;
 let successes=0;for(let i=0;i<config.evidenceSamples;i++)if(random()<trueProbability)successes++;
 const outcome=random()<trueProbability?1:0;
 return {id,prompt,evidenceLabel,trueProbability,successes,samples:config.evidenceSamples,outcome};
}
export function eventQuoteError(config,forecast,bid,ask){
 if(!Number.isFinite(forecast)||forecast<0||forecast>100)return 'Enter a probability from 0 to 100%.';
 if(!Number.isFinite(bid)||!Number.isFinite(ask)||bid<0||ask>100)return 'Enter a bid and ask between 0 and 100.';
 if(bid>=ask)return 'Bid must be below ask.';
 if(ask-bid>config.maxSpread+1e-9)return `Keep the spread at or below ${config.maxSpread}.`;
 return '';
}
export function brierScore(probability,outcome){
 if(!Number.isFinite(probability)||probability<0||probability>1||![0,1].includes(outcome))throw Error('Invalid probability or binary outcome.');
 return (probability-outcome)**2;
}
/** @param {import('../src/lib/types').EventRound} round
 * @param {{forecast:number,bid:number,ask:number}|null} quote
 * @param {import('../src/lib/types').EventConfig} config
 * @returns {import('../src/lib/types').EventOutcome} */
export function resolveEventRound(round,quote,config,random=Math.random){
 if(!validEventConfig(config))throw Error('Invalid event settings.');
 if(!Number.isFinite(round.trueProbability)||round.trueProbability<0||round.trueProbability>1||![0,1].includes(round.outcome))throw Error('Invalid event.');
 if(quote){const error=eventQuoteError(config,quote.forecast,quote.bid,quote.ask);if(error)throw Error(error);}
 const forecast=quote?quote.forecast/100:0.5;
 const brier=brierScore(forecast,round.outcome);
 const calibrationBonus=config.calibrationWeight*(0.25-brier);
 if(!quote)return {forecast,bid:null,ask:null,timedOut:true,trades:[],fills:0,inventory:0,cash:0,grossPnl:0,penalties:1,pnl:-1,brier,calibrationBonus,score:-1+calibrationBonus};
 const roles=[...Array.from({length:config.noiseTraders},(_,i)=>`Noise trader ${i+1}`),'Informed trader'];
 for(let i=roles.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[roles[i],roles[j]]=[roles[j],roles[i]];}
 let cash=0,inventory=0,fills=0;
 const trades=roles.map(role=>{
  const informed=role==='Informed trader';
  // Noise traders buy/sell randomly or pass. Informed demand uses true probability,
  // never the realized outcome. Every trader uses the shared engine.
  const trade=decideTrade({bid:quote.bid,ask:quote.ask,trueValue:100*round.trueProbability,
   aggressiveness:informed?config.informedAggressiveness:0,noise:0,
   noiseTradeProbability:informed?0:config.noiseActivity,edgeScale:5},random);
  const fill=makerFill(trade);cash+=fill.cashDelta;inventory+=fill.inventoryDelta;if(fill.inventoryDelta)fills++;
  return {role,action:trade.action,price:trade.price,quantity:trade.quantity,cashDelta:fill.cashDelta,inventoryDelta:fill.inventoryDelta};
 });
 const grossPnl=cash+inventory*round.outcome*100;
 return {forecast,bid:quote.bid,ask:quote.ask,timedOut:false,trades,fills,inventory,cash,grossPnl,penalties:0,pnl:grossPnl,brier,calibrationBonus,score:grossPnl+calibrationBonus};
}
/** Five bins for descriptive calibration. A small sample is not a verdict.
 * @param {{probability:number,outcome:number}[]} forecasts */
export function calibrationBins(forecasts){
 const bins=Array.from({length:5},(_,i)=>({label:i===4?'80–100%':`${i*20}–<${(i+1)*20}%`,count:0,probabilityTotal:0,outcomeTotal:0}));
 for(const forecast of forecasts){brierScore(forecast.probability,forecast.outcome);const bin=bins[Math.min(4,Math.floor(forecast.probability*5))];bin.count++;bin.probabilityTotal+=forecast.probability;bin.outcomeTotal+=forecast.outcome;}
 return bins.map(bin=>({...bin,averageForecast:bin.count?bin.probabilityTotal/bin.count:null,observedFrequency:bin.count?bin.outcomeTotal/bin.count:null}));
}

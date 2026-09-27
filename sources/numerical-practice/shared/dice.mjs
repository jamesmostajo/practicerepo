import {decideTrade,makerFill} from './counterparty.mjs';
/** @type {Record<'Easy'|'Medium'|'Hard', import('../src/lib/types').DiceConfig>} */
export const diceDefaults={
 Easy:{rounds:10,diceCount:2,roundSeconds:30,maxSpread:4,aggressiveness:0.5,noise:1.5,noiseTradeProbability:0.4,inventoryPenalty:0.03,positionLimit:6,hiddenModifier:0,eventProbability:0,eventLoss:0},
 Medium:{rounds:16,diceCount:3,roundSeconds:20,maxSpread:2.5,aggressiveness:0.75,noise:0.8,noiseTradeProbability:0.25,inventoryPenalty:0.06,positionLimit:6,hiddenModifier:2,eventProbability:0.2,eventLoss:3},
 Hard:{rounds:20,diceCount:3,roundSeconds:12,maxSpread:1.5,aggressiveness:0.95,noise:0.3,noiseTradeProbability:0.15,inventoryPenalty:0.1,positionLimit:5,hiddenModifier:3,eventProbability:0.3,eventLoss:4}
};
export function validDiceConfig(c){
 const integer=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;
 const number=(v,lo,hi)=>Number.isFinite(v)&&v>=lo&&v<=hi;
 return !!c&&integer(c.rounds,3,50)&&[2,3].includes(c.diceCount)&&integer(c.roundSeconds,5,120)
  &&number(c.maxSpread,0.1,10)&&number(c.aggressiveness,0,1)&&number(c.noise,0,5)&&number(c.noiseTradeProbability,0,1)
  &&number(c.inventoryPenalty,0.01,1)&&integer(c.positionLimit,1,20)&&integer(c.hiddenModifier,0,5)
  &&number(c.eventProbability,0,1)&&integer(c.eventLoss,0,10);
}
/** @param {import('../src/lib/types').DiceConfig} config
 * @returns {import('../src/lib/types').DiceState} */
export function createDiceState(config,random=Math.random){
 if(!validDiceConfig(config))throw Error('Invalid dice settings.');
 return {config:structuredClone(config),dice:Array.from({length:config.diceCount},()=>1+Math.floor(random()*6)),
  modifier:Math.floor(random()*(2*config.hiddenModifier+1))-config.hiddenModifier,eventHappened:random()<config.eventProbability,
  round:0,cash:0,inventory:0,penalties:0,fills:0,submitted:0,timeouts:0,maxInventory:0,records:[],done:false};
}
/** @param {import('../src/lib/types').DiceState} state */
export function diceView(state){
 const c=state.config;
 const count=state.done?c.diceCount:Math.min(c.diceCount-1,Math.floor(state.round*c.diceCount/c.rounds));
 const visibleDice=state.dice.slice(0,count);
 const publicValue=visibleDice.reduce((sum,d)=>sum+d,0)+(c.diceCount-count)*3.5-c.eventProbability*c.eventLoss;
 return {visibleDice,unknownDice:c.diceCount-count,publicValue,
  markedPnl:state.cash+state.inventory*publicValue-state.penalties,
  minPrice:c.diceCount-c.hiddenModifier-c.eventLoss,maxPrice:c.diceCount*6+c.hiddenModifier,
  carryCharge:c.inventoryPenalty*state.inventory**2};
}
export function quoteError(config,bid,ask){
 if(!Number.isFinite(bid)||!Number.isFinite(ask))return 'Enter a numeric bid and ask.';
 if(bid>=ask)return 'Bid must be below ask.';
 if(ask-bid>config.maxSpread+1e-9)return `Keep the spread at or below ${config.maxSpread}.`;
 const min=config.diceCount-config.hiddenModifier-config.eventLoss,max=config.diceCount*6+config.hiddenModifier;
 if(bid<min||ask>max)return `Quote within ${min}–${max}, the contract payout range.`;
 return '';
}
/** @param {import('../src/lib/types').DiceState} state
 * @param {{bid:number,ask:number}|null} quote
 * @param {number} responseMs
 * @returns {import('../src/lib/types').DiceState} */
export function resolveDiceRound(state,quote,responseMs,random=Math.random){
 if(state.done)throw Error('This session is already settled.');
 const config=state.config;const view=diceView(state);
 if(!Number.isFinite(responseMs)||responseMs<0||responseMs>config.roundSeconds*1000)throw Error('Invalid response time.');
 if(quote&&quoteError(config,quote.bid,quote.ask))throw Error(quoteError(config,quote.bid,quote.ask));
 const trueValue=view.publicValue+state.modifier;
 const decision=quote?decideTrade({...quote,trueValue,aggressiveness:config.aggressiveness,noise:config.noise,
  noiseTradeProbability:config.noiseTradeProbability,edgeScale:1},random):{action:'pass',reason:'Quote timed out',quantity:0,price:null};
 let fill=makerFill(decision);let riskBlocked=false;
 if(Math.abs(state.inventory+fill.inventoryDelta)>config.positionLimit){fill={inventoryDelta:0,cashDelta:0};riskBlocked=true;}
 const inventory=state.inventory+fill.inventoryDelta;
 const inventoryCharge=config.inventoryPenalty*inventory**2;
 const timeoutCharge=quote?0:1;
 const record={round:state.round+1,bid:quote?.bid??null,ask:quote?.ask??null,
  action:riskBlocked?'pass':decision.action,price:riskBlocked?null:decision.price,quantity:Math.abs(fill.inventoryDelta),
  reason:riskBlocked?'Position limit blocked the fill':decision.reason,inventory,cashDelta:fill.cashDelta,
  inventoryCharge,timeoutCharge,responseMs,publicValue:view.publicValue};
 return {...state,round:state.round+1,inventory,cash:state.cash+fill.cashDelta,
  penalties:state.penalties+inventoryCharge+timeoutCharge,fills:state.fills+(fill.inventoryDelta!==0?1:0),
  submitted:state.submitted+(quote?1:0),timeouts:state.timeouts+(quote?0:1),maxInventory:Math.max(state.maxInventory,Math.abs(inventory)),
  records:[...state.records,record],done:state.round+1===config.rounds};
}
/** @param {import('../src/lib/types').DiceState} state */
export function diceSettlement(state){
 if(!state.done)throw Error('Finish all rounds before settlement.');
 const settlement=state.dice.reduce((sum,d)=>sum+d,0)+state.modifier-(state.eventHappened?state.config.eventLoss:0);
 const grossPnl=state.cash+state.inventory*settlement;
 return {settlement,grossPnl,netPnl:grossPnl-state.penalties,settlementCash:state.inventory*settlement,finalInventory:0};
}

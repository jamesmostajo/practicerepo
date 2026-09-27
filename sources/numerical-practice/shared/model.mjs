import {validTwentyFourConfig} from './twenty-four.mjs';
import {validSeriesConfig} from './series.mjs';
import {validProbabilityConfig} from './probability.mjs';
import {validTradingConfig} from './trading.mjs';
import {validEventConfig,brierScore} from './events.mjs';
import {validFermiConfig} from './fermi.mjs';
import {validCardConfig} from './cards.mjs';
import {validDiceConfig} from './dice.mjs';
import {validMentalConfig} from './mental.mjs';
export const games = [
 ['arithmetic','Arithmetic sprint','Four operations. One focused sprint.','±','Foundation'],
 ['mental-math','Trading mental math','Percentages, fractions & compounding.','%','Foundation'],
 ['dice','Market making · Dice','Quote a market. Manage your inventory.','⚄','Markets'],
 ['cards','Card market taking','Find the edge. Buy, sell or pass.','♠','Markets'],
 ['fermi','Fermi estimation','Make uncertainty measurable.','≈','Reasoning'],
 ['events','Event contracts','Price probabilities. Test calibration.','◒','Markets'],
 ['trading','Combined trading','Make markets and take opportunities.','⇄','Markets'],
 ['ev','EV & probability','Think in outcomes and expected value.','E','Reasoning'],
 ['series','Number series','Recognize the rule. Find what comes next.','…','Reasoning'],
 ['twenty-four','Make 24','Four cards. One target.','24','Foundation'],
].map(([id,name,description,icon,category])=>({id,name,description,icon,category,available:['arithmetic','mental-math','dice','cards','fermi','events','trading','ev','series','twenty-four'].includes(id)}));
export const operations = ['add','subtract','multiply','divide'];
/** @type {Record<'Easy'|'Medium'|'Hard', import('../src/lib/types').Config>} */
export const defaults = {
 Easy:{duration:120,operations:{add:[2,20],subtract:[2,20],multiply:[2,12],divide:[2,12]},secondRanges:{multiply:[2,100],divide:[2,100]},divisionRangeMode:'dividend'},
 Medium:{duration:120,operations:{add:[2,100],subtract:[2,100],multiply:[2,12],divide:[2,12]},secondRanges:{multiply:[2,100],divide:[2,100]},divisionRangeMode:'dividend'},
 Hard:{duration:90,operations:{add:[20,999],subtract:[20,999],multiply:[3,25],divide:[3,25]},secondRanges:{multiply:[20,999],divide:[20,999]},divisionRangeMode:'dividend'}
};
export const emptyData = ()=>({version:1,sessions:[],presets:[]});
const validRange=r=>Array.isArray(r)&&r.length===2&&r.every(Number.isInteger)&&r[0]>=1&&r[1]<=10000&&r[0]<=r[1];
export function divisionDivisors(divisors,dividends){
 const result=[];
 for(let d=divisors[0];d<=divisors[1];d++)if(Math.ceil(dividends[0]/d)<=Math.floor(dividends[1]/d))result.push(d);
 return result;
}
export function validConfig(c,game='arithmetic'){
 if(game==='twenty-four')return validTwentyFourConfig(c);
 if(game==='series')return validSeriesConfig(c);
 if(game==='ev')return validProbabilityConfig(c);
 if(game==='mental-math')return validMentalConfig(c);
 if(game==='dice')return validDiceConfig(c);
 if(game==='cards')return validCardConfig(c);
 if(game==='fermi')return validFermiConfig(c);
 if(game==='events')return validEventConfig(c);
 if(game==='trading')return validTradingConfig(c);
 if(!(c && Number.isInteger(c.duration) && c.duration>=10 && c.duration<=3600 && c.operations && Object.keys(c.operations).length>0 && Object.entries(c.operations).every(([op,r])=>operations.includes(op)&&validRange(r))))return false;
 if(c.divisionRangeMode!==undefined&&!['dividend','quotient'].includes(c.divisionRangeMode))return false;
 if(c.secondRanges!==undefined&&(!c.secondRanges||typeof c.secondRanges!=='object'||Object.entries(c.secondRanges).some(([op,r])=>!['multiply','divide'].includes(op)||!validRange(r))))return false;
 if(c.operations.divide&&c.secondRanges?.divide&&c.divisionRangeMode!=='quotient'&&!divisionDivisors(c.operations.divide,c.secondRanges.divide).length)return false;
 return true;
}
// Keep old presets usable without silently reinterpreting their division ranges.
export function editableArithmeticConfig(c){
 const copy=structuredClone(c);
 if(!copy.secondRanges){copy.secondRanges={multiply:copy.operations.multiply||[2,12],divide:copy.operations.divide||[2,12]};copy.divisionRangeMode='quotient';}
 return copy;
}
const finite=(n)=>typeof n==='number'&&Number.isFinite(n);
export function validateData(d){
 if(!d||d.version!==1||!Array.isArray(d.sessions)||!Array.isArray(d.presets)||d.sessions.length>100000||d.presets.length>1000) throw Error('Invalid backup format or unsupported version.');
 const ids=new Set();
 for(const s of d.sessions){
  if(!s||typeof s.id!=='string'||ids.has(s.id)||!games.some(g=>g.id===s.game)||!['Easy','Medium','Hard','Custom'].includes(s.difficulty)||!Number.isFinite(Date.parse(s.timestamp))||!finite(s.score)||!finite(s.accuracy)||s.accuracy<0||s.accuracy>1||!finite(s.avgResponseMs)||s.avgResponseMs<0||!finite(s.duration)||s.duration<=0||!Number.isInteger(s.correct)||s.correct<0||!Number.isInteger(s.errors)||s.errors<0||!validConfig(s.config,s.game)) throw Error('Invalid session in backup.');
  if(s.pnl!=null&&!finite(s.pnl)||s.brier!=null&&(!finite(s.brier)||s.brier<0||s.brier>1)) throw Error('Invalid market metrics.');
  if(s.game==='dice'&&(!finite(s.pnl)||!finite(s.grossPnl)||!finite(s.penalties)||s.penalties<0||!Number.isInteger(s.rounds)||s.rounds!==s.config.rounds||!Number.isInteger(s.fills)||s.fills<0||s.fills>s.rounds||!finite(s.fillRate)||s.fillRate!==s.fills/s.rounds||!Number.isInteger(s.maxInventory)||s.maxInventory<0||s.maxInventory>s.config.positionLimit||Math.abs(s.pnl-(s.grossPnl-s.penalties))>1e-7||s.score!==s.pnl))throw Error('Invalid dice session metrics.');
  if(s.game==='cards'&&(!finite(s.pnl)||!finite(s.capturedEdge)||!finite(s.availableEdge)||!finite(s.missedEdge)||s.availableEdge<0||s.missedEdge<0||s.score!==s.capturedEdge||Math.abs(s.availableEdge-s.capturedEdge-s.missedEdge)>1e-7||!Number.isInteger(s.rounds)||s.rounds!==s.config.rounds||s.correct+s.errors!==s.rounds||Math.abs(s.accuracy-s.correct/s.rounds)>1e-9||!Number.isInteger(s.fills)||s.fills<0||s.fills>s.rounds||s.fillRate!==s.fills/s.rounds))throw Error('Invalid card session metrics.');
  if(s.game==='fermi'&&(!Number.isInteger(s.rounds)||s.rounds!==s.config.rounds||s.correct+s.errors!==s.rounds||Math.abs(s.accuracy-s.correct/s.rounds)>1e-9||s.score<0||s.score>100*s.rounds||!finite(s.averageScore)||Math.abs(s.averageScore-s.score/s.rounds)>1e-7||!Number.isInteger(s.answered)||s.answered<s.correct||s.answered>s.rounds||(s.answered===0?s.averageRelativeWidth!==null:(!finite(s.averageRelativeWidth)||s.averageRelativeWidth<=0))))throw Error('Invalid Fermi session metrics.');
  if(['ev','series','twenty-four'].includes(s.game)&&(s.score!==s.correct||s.duration!==s.config.duration||Math.abs(s.accuracy-s.correct/Math.max(1,s.correct+s.errors))>1e-9))throw Error('Invalid reasoning drill metrics.');
  if(s.game==='trading'){
   const count=n=>Number.isInteger(n)&&n>=0&&n<=s.rounds;
   if(!Number.isInteger(s.rounds)||s.rounds!==s.config.rounds||s.correct+s.errors!==s.rounds||Math.abs(s.accuracy-s.correct/s.rounds)>1e-9||!finite(s.pnl)||!finite(s.grossPnl)||!finite(s.passivePnl)||!finite(s.activePnl)||!count(s.quoteTimeouts)||!count(s.activeTimeouts)||s.correct>s.rounds-s.activeTimeouts||s.penalties!==s.quoteTimeouts+s.activeTimeouts||Math.abs(s.pnl-s.passivePnl-s.activePnl)>1e-7||Math.abs(s.pnl-s.grossPnl+s.penalties)>1e-7||s.score!==s.pnl||!count(s.passiveFills)||!count(s.activeFills)||s.passiveFills>s.rounds-s.quoteTimeouts||s.activeFills>s.rounds-s.activeTimeouts||s.fills!==s.passiveFills+s.activeFills||s.fillRate!==s.fills/(2*s.rounds))throw Error('Invalid combined trading metrics.');
  }
  if(s.game==='events'){
   if(!Number.isInteger(s.rounds)||s.rounds!==s.config.rounds||s.correct+s.errors!==s.rounds||Math.abs(s.accuracy-s.correct/s.rounds)>1e-9||!finite(s.pnl)||!finite(s.grossPnl)||s.penalties!==s.errors||Math.abs(s.pnl-(s.grossPnl-s.penalties))>1e-7||!finite(s.brier)||!finite(s.calibrationBonus)||Math.abs(s.calibrationBonus-s.config.calibrationWeight*s.rounds*(0.25-s.brier))>1e-7||Math.abs(s.score-s.pnl-s.calibrationBonus)>1e-7||s.traderVisits!==s.correct*(s.config.noiseTraders+1)||!Number.isInteger(s.fills)||s.fills<0||s.fills>s.traderVisits||s.fillRate!==(s.traderVisits?s.fills/s.traderVisits:0)||!Array.isArray(s.forecasts)||s.forecasts.length!==s.rounds)throw Error('Invalid event session metrics.');
   let totalBrier=0,timeouts=0;
   for(const f of s.forecasts){if(!f||typeof f.timedOut!=='boolean'||(f.timedOut&&f.probability!==0.5))throw Error('Invalid event forecast.');totalBrier+=brierScore(f.probability,f.outcome);if(f.timedOut)timeouts++;}
   if(timeouts!==s.errors||Math.abs(s.brier-totalBrier/s.rounds)>1e-9)throw Error('Inconsistent event calibration metrics.');
  }
  ids.add(s.id);
 }
 ids.clear();
 for(const p of d.presets){if(!p||typeof p.id!=='string'||ids.has(p.id)||!games.some(g=>g.id===p.game)||typeof p.name!=='string'||!p.name.trim()||p.name.length>60||!validConfig(p.config,p.game))throw Error('Invalid preset in backup.');ids.add(p.id);}
 return d;
}
export function problem(config,random=Math.random){
 const ops=Object.keys(config.operations); const op=ops[Math.floor(random()*ops.length)];
 const draw=range=>range[0]+Math.floor(random()*(range[1]-range[0]+1));
 const range=config.operations[op];
 let a=draw(range),b=draw(range),answer,symbol;
 if(op==='add'){answer=a+b;symbol='+';}
 if(op==='subtract'){if(a<b)[a,b]=[b,a];answer=a-b;symbol='−';}
 if(op==='multiply'){b=draw(config.secondRanges?.multiply||range);answer=a*b;symbol='×';}
 if(op==='divide'){
  const second=config.secondRanges?.divide;
  if(second&&config.divisionRangeMode!=='quotient'){
   const divisors=divisionDivisors(range,second);
   if(!divisors.length)throw Error('These division ranges contain no whole-number problems.');
   b=divisors[Math.floor(random()*divisors.length)];
   answer=draw([Math.ceil(second[0]/b),Math.floor(second[1]/b)]);a=answer*b;
  }else {b=draw(range);answer=draw(second||range);a=answer*b;}
  symbol='÷';
 }
 return {a,b,answer,symbol,op};
}
export function streak(sessions,now=new Date()){
 const key=d=>`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
 const days=new Set(sessions.map(s=>key(new Date(s.timestamp))));
 const date=new Date(now);if(!days.has(key(date)))date.setDate(date.getDate()-1);
 let n=0;while(days.has(key(date))){n++;date.setDate(date.getDate()-1);}return n;
}

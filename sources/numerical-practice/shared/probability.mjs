export const probabilityTopics=['ev','dice','cards','bet'];
export const probabilityLabels={ev:'Expected value',dice:'Dice probabilities',cards:'Card probabilities',bet:'Is this bet +EV?'};
/** @type {Record<'Easy'|'Medium'|'Hard', import('../src/lib/types').ProbabilityConfig>} */
export const probabilityDefaults={
 Easy:{duration:120,topics:[...probabilityTopics],level:1,maxPayout:100,decimals:2},
 Medium:{duration:120,topics:[...probabilityTopics],level:2,maxPayout:500,decimals:3},
 Hard:{duration:90,topics:[...probabilityTopics],level:3,maxPayout:2000,decimals:4}
};
export function validProbabilityConfig(c){return !!c&&Number.isInteger(c.duration)&&c.duration>=10&&c.duration<=3600&&Array.isArray(c.topics)&&c.topics.length>0&&c.topics.length<=4&&new Set(c.topics).size===c.topics.length&&c.topics.every(t=>probabilityTopics.includes(t))&&Number.isInteger(c.level)&&c.level>=1&&c.level<=3&&Number.isInteger(c.maxPayout)&&c.maxPayout>=10&&c.maxPayout<=10000&&Number.isInteger(c.decimals)&&c.decimals>=1&&c.decimals<=4;}
export function diceProbability(predicate,condition=()=>true){let eligible=0,hits=0;for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)if(condition(a,b)){eligible++;if(predicate(a,b))hits++;}if(!eligible)throw Error('Empty condition.');return {hits,total:eligible,probability:hits/eligible};}
export function noSuccessProbability(successes,population,draws){if(!Number.isInteger(successes)||!Number.isInteger(population)||!Number.isInteger(draws)||successes<0||successes>population||draws<0||draws>population)throw Error('Invalid sample.');let p=1;for(let i=0;i<draws;i++)p*=Math.max(0,population-successes-i)/(population-i);return p;}
export function netExpectedValue(outcomes,fee){if(!Number.isFinite(fee)||!outcomes.length||outcomes.some(o=>!Number.isFinite(o.probability)||o.probability<0||o.probability>1||!Number.isFinite(o.payout))||Math.abs(outcomes.reduce((s,o)=>s+o.probability,0)-1)>1e-9)throw Error('Invalid outcomes.');return outcomes.reduce((s,o)=>s+o.probability*o.payout,0)-fee;}
function extraProbability(topic,variant,config,int){
 const level=config.level;
 if(topic==='dice'){
  const face=int(1,6),count=level===3?3:2;
  if(variant===1)return {prompt:`Roll two independent fair dice. Probability of doubles?`,exact:1/6,kind:'probability',explanation:'The six matching pairs (1,1) through (6,6) are six of the 36 equally likely outcomes: 6/36.'};
  if(variant===2)return {prompt:`Roll ${count} independent fair dice. Probability of at least one ${face}?`,exact:1-(5/6)**count,kind:'probability',explanation:`Use the complement: 1 − (5/6)^${count}. Each die independently avoids ${face} with probability 5/6.`};
  return {prompt:`Roll ${count} independent fair dice. Probability of exactly one ${face}?`,exact:count*(1/6)*(5/6)**(count-1),kind:'probability',explanation:`Choose which of the ${count} dice shows ${face}; all others must avoid it: ${count} × (1/6) × (5/6)^${count-1}.`};
 }
 if(topic==='cards'){
  if(variant===1){const rank=['ace','king','queen'][int(0,2)];return {prompt:`Draw two cards without replacement. Probability of exactly one ${rank} from a standard 52-card deck?`,exact:2*4/52*48/51,kind:'probability',explanation:'Either draw may be the matching rank: (4/52 × 48/51) + (48/52 × 4/51). The two cases do not overlap.'};}
  if(variant===2)return {prompt:'Draw two cards without replacement from a standard 52-card deck. Probability they share a suit?',exact:12/51,kind:'probability',explanation:'The first card can be anything. Of the 51 cards left, 12 share its suit, giving 12/51.'};
  const red=level===1;return {prompt:`A card from a standard 52-card deck is known to be ${red?'red':'a face card (J, Q or K)'}. Probability it is ${red?'a heart':'a king'}?`,exact:red?1/2:1/3,kind:'probability',explanation:red?'There are 26 red cards, 13 of them hearts. Condition on the 26: 13/26.':'There are 12 face cards and four kings. Condition on the 12: 4/12.'};
 }
 const amount=int(1,Math.floor(config.maxPayout/10))*10,p=int(1,9)/10;
 if(topic==='ev'){
  if(variant===1)return {prompt:`A ticket pays ${amount} with probability ${Math.round(p*100)}%, otherwise 0. What entry price makes expected net profit zero?`,exact:p*amount,kind:'money',explanation:`Break-even fee equals expected receipt: ${p} × ${amount} = ${p*amount}.`};
  if(variant===2){const loss=int(1,Math.floor(config.maxPayout/10))*10;return {prompt:`A trade earns net profit ${amount} with probability ${Math.round(p*100)}%; otherwise it loses ${loss}. Expected net profit? No additional fee.`,exact:p*amount-(1-p)*loss,kind:'money',explanation:`Weight both signed outcomes: ${p} × ${amount} − ${Number((1-p).toFixed(1))} × ${loss}. These are already net profits; subtract no extra fee.`};}
  const attempts=int(2,level===3?10:5),fee=int(1,5);return {prompt:`You play ${attempts} independent rounds. Each costs ${fee} and pays ${amount} with probability ${Math.round(p*100)}%, otherwise 0. Expected TOTAL net profit?`,exact:attempts*(p*amount-fee),kind:'money',explanation:`Linearity of expectation: ${attempts} × (${p} × ${amount} − ${fee}). Include the fee for every round.`};
 }
 const loss=int(1,Math.floor(config.maxPayout/10))*10;
 if(variant===1)return {prompt:`Win net ${amount} with probability ${Math.round(p*100)}%, otherwise lose ${loss}. Is this strictly +EV? No entry fee.`,exact:p*amount-(1-p)*loss,kind:'decision',explanation:`EV = ${p} × ${amount} − ${Number((1-p).toFixed(1))} × ${loss}. It is +EV only if this is strictly positive.`};
 const fee=int(1,Math.max(1,Math.floor(amount/2))),prob=variant===2?p*p:1-(1-p)**2;
 return {prompt:`Two independent attempts each succeed with probability ${Math.round(p*100)}%. Pay ${fee}; receive ${amount} only if ${variant===2?'both succeed':'at least one succeeds'}, otherwise receive 0. Is this strictly +EV?`,exact:prob*amount-fee,kind:'decision',explanation:`Winning probability = ${variant===2?`${p} × ${p}`:`1 − (1 − ${p})²`} = ${Number(prob.toFixed(4))}. EV = winning probability × ${amount} − ${fee}. Zero is not +EV.`};
}
export function probabilityProblem(config,random=Math.random){
 if(!validProbabilityConfig(config))throw Error('Invalid probability settings.');
 const int=(a,b)=>a+Math.floor(random()*(b-a+1));const topic=config.topics[int(0,config.topics.length-1)];
 let prompt='',exact=0,explanation='',kind='probability';
 const variant=int(0,3);
 if(variant>0){const extra=extraProbability(topic,variant,config,int);({prompt,exact,explanation,kind}=extra);if(Math.abs(exact)<1e-9)exact=0;}
 else if(topic==='ev'||topic==='bet'){
  const payout=int(1,Math.floor(config.maxPayout/10))*10,p=int(1,config.level===1?4:9)*(config.level===1?0.25:0.1);
  const fee=int(0,Math.floor(payout/5))*5;
  let outcomes=[{probability:p,payout},{probability:1-p,payout:0}];
  if(config.level===3){const second=Math.min(0.1,1-p);outcomes=[{probability:p,payout},{probability:second,payout:payout/2},{probability:Math.max(0,1-p-second),payout:0}];}
  const terms=outcomes.map(o=>`${Math.round(o.probability*100)}% chance of receiving ${o.payout}`).join('; ');
  exact=netExpectedValue(outcomes,fee);if(Math.abs(exact)<1e-9)exact=0;
  prompt=`Pay ${fee} to play. ${terms}. ${topic==='bet'?'Is this bet strictly +EV?':'Expected net profit per play?'}`;
  explanation=`EV = ${outcomes.map(o=>`${Number(o.probability.toFixed(2))} × ${o.payout}`).join(' + ')} − ${fee} = ${Number(exact.toFixed(2))}. Payouts are total receipts; subtract the entry fee once.${topic==='bet'?` ${exact>0?'Positive EV: yes.':'Zero or negative EV: no.'}`:''}`;
  kind=topic==='bet'?'decision':'money';
 }else if(topic==='dice'){
  if(config.level===1){const threshold=int(2,6);prompt=`Roll one fair six-sided die. Probability of ${threshold} or higher?`;exact=(7-threshold)/6;explanation=`Favorable faces: ${threshold} through 6, so (${7-threshold}) / 6.`;}
  else if(config.level===2){const target=int(2,12),r=diceProbability((a,b)=>a+b===target);prompt=`Roll two independent fair six-sided dice. Probability their sum is ${target}?`;exact=r.probability;explanation=`${r.hits} favorable ordered pairs out of 36 equally likely outcomes: ${r.hits}/36.`;}
  else {const target=int(5,10),r=diceProbability((a,b)=>a+b>=target,a=>a%2===0);prompt=`Two fair six-sided dice. Given the first die is even, probability the sum is at least ${target}?`;exact=r.probability;explanation=`Condition on first die 2, 4 or 6: 18 equally likely pairs remain. ${r.hits} meet the sum condition, so ${r.hits}/18.`;}
 }else{
  if(config.level===1){const suit=random()<0.5;prompt=`Draw one card from a standard shuffled 52-card deck. Probability of ${suit?'a heart':'an ace'}?`;exact=(suit?13:4)/52;explanation=`There are ${suit?13:4} matching cards in 52: ${suit?13:4}/52.`;}
  else if(config.level===2){const red=random()<0.5;prompt=`Draw two cards without replacement from a standard shuffled 52-card deck. Probability ${red?'both are red':'both are aces'}?`;const count=red?26:4;exact=count/52*(count-1)/51;explanation=`Multiply conditional probabilities: ${count}/52 × ${count-1}/51. Both the matching count and deck size decrease after the first draw.`;}
  else{const draws=int(2,4);prompt=`Draw ${draws} cards without replacement from a standard shuffled 52-card deck. Probability of at least one ace?`;exact=1-noSuccessProbability(4,52,draws);explanation=`Use the complement: 1 − ${Array.from({length:draws},(_,i)=>`${48-i}/${52-i}`).join(' × ')}. The product is the probability of no aces.`;}
 }
 const precision=kind==='money'?2:config.decimals;
 const answer=kind==='decision'?(exact>0?'yes':'no'):Number(exact.toFixed(precision)).toString();
 const hint=kind==='decision'?'Enter yes or no. +EV means strictly greater than zero; break-even is no.':kind==='money'?'Enter the requested amount. Negative net profit is allowed. Round to 2 decimal places.':`Enter a probability from 0 to 1, rounded to ${precision} decimal places; exact fractions or percentages also work.`;
 return {topic,prompt,exact,kind,precision,answer,hint,explanation};
}
export function parseProbabilityAnswer(text,question){
 const s=text.trim().toLowerCase().replace(/−/g,'-');
 if(question.kind==='decision')return ['yes','y'].includes(s)?1:['no','n'].includes(s)?0:null;
 const number=t=>/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(t)?Number(t):NaN;
 let value;
 if(question.kind==='probability'&&s.includes('/')){const pieces=s.split('/');if(pieces.length!==2)return null;const a=number(pieces[0].trim()),b=number(pieces[1].trim());value=b>0?a/b:NaN;}
 else if(question.kind==='probability'&&s.endsWith('%'))value=number(s.slice(0,-1).trim())/100;
 else value=number(s);
 return Number.isFinite(value)&&(question.kind!=='probability'||value>=0&&value<=1)?value:null;
}
export function probabilityAnswerCorrect(text,question){
 const value=parseProbabilityAnswer(text,question);if(value===null)return false;
 if(question.kind==='decision')return value===Number(question.exact>0);
 return Math.abs(value-question.exact)<=0.5*10**(-question.precision)+1e-10;
}

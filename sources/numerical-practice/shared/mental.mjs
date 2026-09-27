export const mentalTopics = ['percentOf', 'percentChange', 'fraction', 'interest', 'compound'];
export const topicLabels = {
  percentOf: 'Percent of a number', percentChange: 'Percentage change',
  fraction: 'Fractions to decimals', interest: 'Simple interest', compound: 'Compounding'
};
/** @type {Record<'Easy'|'Medium'|'Hard', import('../src/lib/types').MentalConfig>} */
export const mentalDefaults = {
  Easy: {duration:120, topics:[...mentalTopics], maxAmount:500, maxRate:10, maxDenominator:8, maxYears:2, decimals:2, compoundTolerance:2},
  Medium: {duration:120, topics:[...mentalTopics], maxAmount:5000, maxRate:25, maxDenominator:16, maxYears:4, decimals:3, compoundTolerance:1},
  Hard: {duration:90, topics:[...mentalTopics], maxAmount:50000, maxRate:50, maxDenominator:32, maxYears:8, decimals:4, compoundTolerance:0.5}
};
export function validMentalConfig(c) {
  return !!c && Number.isInteger(c.duration) && c.duration>=10 && c.duration<=3600
    && Array.isArray(c.topics) && c.topics.length>0 && c.topics.length<=mentalTopics.length
    && new Set(c.topics).size===c.topics.length && c.topics.every(t=>mentalTopics.includes(t))
    && Number.isInteger(c.maxAmount) && c.maxAmount>=100 && c.maxAmount<=1000000
    && Number.isInteger(c.maxRate) && c.maxRate>=1 && c.maxRate<=100
    && Number.isInteger(c.maxDenominator) && c.maxDenominator>=2 && c.maxDenominator<=100
    && Number.isInteger(c.maxYears) && c.maxYears>=1 && c.maxYears<=10
    && Number.isInteger(c.decimals) && c.decimals>=1 && c.decimals<=4
    && Number.isFinite(c.compoundTolerance) && c.compoundTolerance>=0.1 && c.compoundTolerance<=5;
}
const rounded=(n,dp)=>Number(n.toFixed(dp));
export function mentalProblem(config, random=Math.random) {
  const pick=items=>items[Math.floor(random()*items.length)];
  const int=(lo,hi)=>lo+Math.floor(random()*(hi-lo+1));
  const topic=pick(config.topics);
  const step=config.maxAmount<=1000?10:config.maxAmount<=10000?50:100;
  const amount=int(1,Math.floor(config.maxAmount/step))*step;
  const rate=int(1,config.maxRate);
  const years=int(1,config.maxYears);
  const fmt=n=>n.toLocaleString('en-US',{maximumFractionDigits:4});
  let prompt, exact, explanation, unit='', precision=2;
  if(topic==='percentOf'){
    prompt=`What is ${rate}% of ${fmt(amount)}?`;exact=amount*rate/100;
    explanation=`${fmt(amount)} × ${rate} ÷ 100 = ${fmt(rounded(exact,2))}`;
  } else if(topic==='percentChange') {
    const signedRate=(random()<0.5?-1:1)*rate;
    const after=rounded(amount*(1+signedRate/100),2);
    prompt=`${fmt(amount)} → ${fmt(after)}. Percentage change?`;
    exact=signedRate;unit='%';
    explanation=`(${fmt(after)} − ${fmt(amount)}) ÷ ${fmt(amount)} × 100 = ${signedRate}%`;
  } else if(topic==='fraction') {
    const denominator=int(2,config.maxDenominator);const numerator=int(1,denominator-1);
    prompt=`${numerator} / ${denominator} as a decimal`;exact=numerator/denominator;precision=config.decimals;
    explanation=`${numerator} ÷ ${denominator} ≈ ${exact.toFixed(precision)}`;
  } else if(topic==='interest') {
    prompt=`${fmt(amount)} at ${rate}% simple annual interest for ${years} ${years===1?'year':'years'}. Interest earned?`;
    exact=amount*rate/100*years;
    explanation=`Interest = ${fmt(amount)} × ${rate}/100 × ${years} = ${fmt(rounded(exact,2))}`;
  } else {
    prompt=`${fmt(amount)} grows at ${rate}% a year for ${years} ${years===1?'year':'years'}. Estimate the final balance.`;
    exact=amount*Math.pow(1+rate/100,years);
    explanation=`${fmt(amount)} × (1 + ${rate}/100)^${years} ≈ ${fmt(rounded(exact,2))}`;
  }
  const answer=rounded(exact,precision);
  const hint=topic==='compound'?`Within ±${config.compoundTolerance}% of the true balance. Include the principal.`:
    topic==='fraction'?`Round to ${precision} decimal places. Enter a decimal, not a fraction.`:
    topic==='percentChange'?'Enter a signed percentage, e.g. −5 for a 5% decrease.':
    topic==='interest'?'Interest only, excluding the principal. Round to 2 decimal places.':'Round to 2 decimal places.';
  return {topic,prompt,exact,answer,precision,unit,hint,explanation,tolerance:topic==='compound'?config.compoundTolerance:0};
}
export function parseMentalAnswer(text, question) {
  const cleaned=text.trim().replace(/−/g,'-').replace(/,/g,'');
  const numeric=question.unit==='%'?cleaned.replace(/%$/,'').trim():cleaned;
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(numeric))return null;
  const value=Number(numeric);return Number.isFinite(value)?value:null;
}
export function mentalAnswerCorrect(text,question) {
  const value=parseMentalAnswer(text,question);if(value===null)return false;
  if(question.tolerance)return Math.abs(value-question.exact)<=Math.abs(question.exact)*question.tolerance/100+1e-9;
  return Math.abs(value-question.answer)<1e-8;
}

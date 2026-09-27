export const seriesTopics=['arithmetic','geometric','differences','alternating','interleaved','recurrence','squares','affine','cubes','triangular'];
export const seriesLabels={arithmetic:'Constant difference',geometric:'Constant ratio',differences:'Growing differences',alternating:'Alternating operations',interleaved:'Interleaved sequences',recurrence:'Previous two terms',squares:'Shifted squares',affine:'Multiply then add',cubes:'Shifted cubes',triangular:'Scaled triangular numbers'};
/** @type {Record<'Easy'|'Medium'|'Hard', import('../src/lib/types').SeriesConfig>} */
export const seriesDefaults={
 Easy:{duration:120,topics:['arithmetic','geometric','squares'],maxStart:10,maxStep:5,terms:6,showHint:true},
 Medium:{duration:120,topics:['arithmetic','geometric','differences','alternating','squares','triangular'],maxStart:30,maxStep:10,terms:6,showHint:false},
 Hard:{duration:90,topics:[...seriesTopics],maxStart:100,maxStep:20,terms:6,showHint:false}
};
export function validSeriesConfig(c){const integer=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;return !!c&&integer(c.duration,10,3600)&&integer(c.maxStart,1,100)&&integer(c.maxStep,1,20)&&integer(c.terms,6,8)&&typeof c.showHint==='boolean'&&Array.isArray(c.topics)&&c.topics.length>0&&c.topics.length<=seriesTopics.length&&new Set(c.topics).size===c.topics.length&&c.topics.every(t=>seriesTopics.includes(t));}
export function seriesProblem(config,random=Math.random){
 if(!validSeriesConfig(config))throw Error('Invalid series settings.');
 const int=(a,b)=>a+Math.floor(random()*(b-a+1));const topic=config.topics[int(0,config.topics.length-1)],a=int(1,config.maxStart),d=int(1,config.maxStep),length=config.terms+1;
 let values=[],explanation='';
 if(topic==='arithmetic'){
  const step=random()<0.5?d:-d;values=Array.from({length},(_,i)=>a+i*step);explanation=`Add ${step} each time: ${values.at(-2)} + (${step}) = ${values.at(-1)}.`;
 }else if(topic==='geometric'){
  const ratio=int(2,3);values=Array.from({length},(_,i)=>a*ratio**i);explanation=`Multiply by ${ratio} each time: ${values.at(-2)} × ${ratio} = ${values.at(-1)}.`;
 }else if(topic==='differences'){
  const growth=int(1,config.maxStep);values=[a];for(let i=0;i<length-1;i++)values.push(values[i]+d+i*growth);
  const gaps=values.slice(1).map((v,i)=>v-values[i]);explanation=`The gaps are ${gaps.join(', ')}: increase each gap by ${growth}. Next is ${values.at(-2)} + ${gaps.at(-1)} = ${values.at(-1)}.`;
 }else if(topic==='alternating'){
  const subtract=d+1;values=[a];for(let i=0;i<length-1;i++)values.push(values[i]+(i%2===0?d:-subtract));explanation=`Alternate adding ${d} and subtracting ${subtract}, starting with addition. The next operation is ${config.terms%2===1?`+${d}`:`−${subtract}`}, giving ${values.at(-1)}.`;
 }else if(topic==='interleaved'){
  const b=a+int(1,config.maxStart),otherStep=d+1;values=Array.from({length},(_,i)=>i%2===0?a+Math.floor(i/2)*d:b+Math.floor(i/2)*otherStep);
  explanation=`Split by position: odd positions start at ${a} and add ${d}; even positions start at ${b} and add ${otherStep}. Position ${length} belongs to the ${length%2?'odd':'even'} sequence, giving ${values.at(-1)}.`;
 }else if(topic==='recurrence'){
  values=[a,d];while(values.length<length)values.push(values.at(-1)+values.at(-2));explanation=`Each term is the sum of the previous two: ${values.at(-3)} + ${values.at(-2)} = ${values.at(-1)}.`;
 }else if(topic==='affine'){
  const multiplier=int(2,3);values=[a];while(values.length<length)values.push(values.at(-1)*multiplier+d);explanation=`Multiply by ${multiplier}, then add ${d} each time: ${values.at(-2)} × ${multiplier} + ${d} = ${values.at(-1)}.`;
 }else if(topic==='cubes'){
  values=Array.from({length},(_,i)=>d*(i+1)**3+a);explanation=`Use ${d} × n³ + ${a}, starting at n=1. Next is ${d} × ${length}³ + ${a} = ${values.at(-1)}.`;
 }else if(topic==='triangular'){
  values=Array.from({length},(_,i)=>a+d*(i+1)*(i+2)/2);explanation=`Use ${a} + ${d} × n(n+1)/2, starting at n=1. The scaled triangular numbers give ${values.at(-1)} next.`;
 }else{
  const offset=a,coefficient=d;values=Array.from({length},(_,i)=>coefficient*(i+1)**2+offset);explanation=`Use ${coefficient} × n² + ${offset}, with n starting at 1. The next term is ${coefficient} × ${length}² + ${offset} = ${values.at(-1)}.`;
 }
 return {topic,values:values.slice(0,-1),answer:values.at(-1),prompt:values.slice(0,-1).join(' , ')+' , ?',hint:config.showHint?`Pattern hint: ${seriesLabels[topic]}. Enter the next integer.`:'Enter the next integer using a simple consistent rule.',explanation};
}
export function parseSeriesAnswer(text){const value=text.trim().replace(/−/g,'-');if(!/^[+-]?\d+$/.test(value))return null;const n=Number(value);return Number.isSafeInteger(n)?n:null;}
export function seriesAnswerCorrect(text,question){const value=parseSeriesAnswer(text);return value!==null&&value===question.answer;}

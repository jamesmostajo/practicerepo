/** Keep a small, in-memory recent window per settings profile. Bounded retries
 * allow tiny custom pools to remain playable. History resets on page reload.
 * @template C,T
 * @param {(config:C,random?:()=>number)=>T} generate
 * @param {(value:T)=>string} key
 */
export function variedGenerator(generate,key,windowSize=12){
 const histories=new Map();
 return (config,random=Math.random)=>{
  const profile=JSON.stringify(config);const recent=histories.get(profile)||[];
  let value=generate(config,random),signature=key(value);
  for(let attempt=1;attempt<24&&recent.includes(signature);attempt++){value=generate(config,random);signature=key(value);}
  histories.delete(profile);histories.set(profile,[...recent,signature].slice(-windowSize));
  if(histories.size>30)histories.delete(histories.keys().next().value);
  return value;
 };
}

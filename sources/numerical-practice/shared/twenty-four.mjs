/** @type {Record<'Easy'|'Medium'|'Hard', import('../src/lib/types').TwentyFourConfig>} */
export const twentyFourDefaults={Easy:{duration:120,target:24,maxCard:6,integerOnly:true},Medium:{duration:120,target:24,maxCard:9,integerOnly:false},Hard:{duration:90,target:24,maxCard:13,integerOnly:false}};
export function validTwentyFourConfig(c){return !!c&&Number.isInteger(c.duration)&&c.duration>=10&&c.duration<=3600&&[12,24,36,48].includes(c.target)&&Number.isInteger(c.maxCard)&&c.maxCard>=6&&c.maxCard<=13&&typeof c.integerOnly==='boolean';}
const gcd=(a,b)=>{while(b)[a,b]=[b,a%b];return a||1;};
function fraction(n,d=1){if(!d)throw Error('Division by zero is not allowed.');if(d<0){n=-n;d=-d;}const g=gcd(Math.abs(n),d);return {n:n/g,d:d/g};}
function operate(a,b,op){if(op==='+')return fraction(a.n*b.d+b.n*a.d,a.d*b.d);if(op==='-')return fraction(a.n*b.d-b.n*a.d,a.d*b.d);if(op==='*')return fraction(a.n*b.n,a.d*b.d);return fraction(a.n*b.d,a.d*b.n);}
const format=v=>v.d===1?String(v.n):`${v.n}/${v.d}`;
/** Enumerate pair reductions; all binary expression trees and operand orders are covered. */
export function solveTwentyFour(cards,target=24,integerOnly=false){
 const visit=items=>{
  if(items.length===1)return items[0].value.n===target*items[0].value.d?items[0].expression:null;
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
   const a=items[i],b=items[j],rest=items.filter((_,k)=>k!==i&&k!==j);
   const candidates=[[a,b,'+'],[a,b,'*'],[a,b,'-'],[b,a,'-'],[a,b,'/'],[b,a,'/']];
   for(const [left,right,op] of candidates){if(op==='/'&&right.value.n===0)continue;const value=operate(left.value,right.value,op);if(integerOnly&&value.d!==1)continue;
    const result=visit([...rest,{value,expression:`(${left.expression}${op}${right.expression})`}]);if(result)return result;
   }
  }
  return null;
 };
 if(!Array.isArray(cards)||cards.length!==4||cards.some(n=>!Number.isInteger(n)||n<1||n>13))throw Error('Use four card values from 1 to 13.');
 return visit(cards.map(n=>({value:fraction(n),expression:String(n)})));
}
/** Parse a tiny arithmetic grammar. Never execute JavaScript or evaluate arbitrary code. */
export function checkTwentyFour(text,cards,target=24,integerOnly=false){
 try{
  if(typeof text!=='string'||text.length>200)throw Error('Keep the expression under 200 characters.');
  const source=text.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
  const tokens=source.match(/\d+|[()+*/-]|\S/g)||[];let at=0;const used=[],steps=[];
  function primary(depth){
   if(depth>20)throw Error('Too many nested parentheses.');
   const token=tokens[at++];
   if(token==='('){const result=expression(depth+1);if(tokens[at++]!==')')throw Error('Close each parenthesis.');return result;}
   if(!token||!/^\d+$/.test(token))throw Error('Use card numbers, +, −, ×, ÷ and parentheses only.');
   const n=Number(token);if(!Number.isInteger(n)||n<1||n>13||used.length>=4)throw Error('Use each of the four displayed cards exactly once.');used.push(n);return fraction(n);
  }
  function combine(left,right,op){const value=operate(left,right,op);if(integerOnly&&value.d!==1)throw Error('This preset requires whole-number intermediate results.');steps.push(`(${format(left)}) ${{'*':'×','/':'÷'}[op]||op} (${format(right)}) = ${format(value)}`);return value;}
  function term(depth){let value=primary(depth);while(['*','/'].includes(tokens[at])){const op=tokens[at++];value=combine(value,primary(depth),op);}return value;}
  function expression(depth){let value=term(depth);while(['+','-'].includes(tokens[at])){const op=tokens[at++];value=combine(value,term(depth),op);}return value;}
  const value=expression(0);if(at!==tokens.length)throw Error('Use an explicit operator between numbers and parentheses.');
  if(used.sort((a,b)=>a-b).join(',')!==[...cards].sort((a,b)=>a-b).join(','))throw Error('Use each displayed card exactly once, including repeated values.');
  return {valid:true,correct:value.n===target*value.d,value:format(value),steps,error:''};
 }catch(e){return {valid:false,correct:false,value:'',steps:[],error:e.message};}
}
/** @returns {{cards:number[],target:number,solution:string,steps:string[]}} */
export function twentyFourProblem(config,random=Math.random){
 if(!validTwentyFourConfig(config))throw Error('Invalid Make 24 settings.');
 let cards,solution;
 for(let attempt=0;attempt<60;attempt++){
  cards=Array.from({length:4},()=>1+Math.floor(random()*config.maxCard));solution=solveTwentyFour(cards,config.target,config.integerOnly);if(solution)break;
 }
 if(!solution){cards=({12:[6,2,1,1],24:[6,4,1,1],36:[6,6,1,1],48:[6,4,2,1]})[config.target];solution=solveTwentyFour(cards,config.target,config.integerOnly);}
 // Shuffle even fallback hands; suits do not affect the arithmetic.
 for(let i=3;i>0;i--){const j=Math.floor(random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
 const result=checkTwentyFour(solution,cards,config.target,config.integerOnly);
 return {cards,target:config.target,solution,steps:result.steps};
}

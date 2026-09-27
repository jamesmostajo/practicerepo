import {deck,evaluate} from './engine.js';
const cr=c=>c%13+2,cs=c=>Math.floor(c/13),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function positionOf(v,seat=v.seat){
 const order=[];for(let n=1;n<=v.players.length;n++){let i=(v.button+n)%v.players.length;if(v.players[i].inHand)order.push(i)}
 if(order.length===2)return seat===v.button?'BTN / SB':'BB';
 const labels={3:['SB','BB','BTN'],4:['SB','BB','CO','BTN'],5:['SB','BB','UTG','CO','BTN'],6:['SB','BB','UTG','HJ','CO','BTN']};return labels[order.length]?.[order.indexOf(seat)]||'—';
}
export function stackContext(v){const me=v.players[v.seat],players=v.players.filter(p=>p.inHand),opponents=v.players.map((p,i)=>({...p,seat:i})).filter(p=>p.inHand&&!p.folded&&p.seat!==v.seat);
 const recent=[...(v.history||[])].reverse().find(a=>a.seat!==v.seat&&a.type==='raise'&&opponents.some(p=>p.seat===a.seat));const target=opponents.find(p=>p.seat===recent?.seat)||[...opponents].sort((a,b)=>(b.stack+b.bet)-(a.stack+a.bet))[0];
 const effective=target?Math.min(me.stack+me.bet,target.stack+target.bet):me.stack;
 const rank=1+players.filter(p=>p.stack>me.stack).length,average=players.reduce((s,p)=>s+p.stack,0)/Math.max(1,players.length);
 const position=positionOf(v),order=[];for(let n=1;n<=v.players.length;n++){let i=(v.button+n)%v.players.length;if(v.players[i].inHand&&!v.players[i].folded)order.push(i)}
 const last=order.at(-1)===v.seat,bb=me.stack/v.bb,remaining=target?Math.min(me.stack,target.stack):0;
 return {position,last,bb,rank,field:players.length,average,relative:average?me.stack/average:0,effective,effectiveBB:effective/v.bb,target:target?.name||'—',targetStyle:target?.style||'',targetSeat:target?.seat,covered:target?target.stack+target.bet>=me.stack+me.bet:false,spr:v.street&&v.pot?remaining/v.pot:null,callFraction:me.stack?v.legal.call/me.stack:0,opponents:opponents.length,depth:bb<=15?'Short':bb<=40?'Medium':bb<=100?'Comfortable':'Deep'};
}
export function startingScore(h){const r=h.map(cr).sort((a,b)=>b-a);return r[0]===r[1]?.46+r[0]/32:(r[0]+r[1])/38+(cs(h[0])===cs(h[1])?.065:0)+(r[0]-r[1]<=2?.04:0)}
function rangeWeight(h,board,p,history){let actions=history.filter(a=>a.seat===p.seat),raises=actions.filter(a=>a.type==='raise'),pre=startingScore(h),tight=/Tight/.test(p.style),loose=/Loose|Calling/.test(p.style),threshold=tight?.64:loose?.43:.56;
 let weight=clamp(.25+(pre-threshold)*2.8,.06,1);
 if(raises.some(a=>a.street===0))weight*=clamp(.18+(pre-(tight?.67:.57))*3,.035,1);
 if(board.length){let cat=Math.floor(evaluate([...h,...board])/15**5),draw=board.length<5&&[0,1,2,3].some(s=>[...h,...board].filter(c=>cs(c)===s).length===4);let post=raises.filter(a=>a.street>0).length;
 if(post)weight*=cat>=2?1:cat===1?.55:draw?.32:/Loose/.test(p.style)?.22:.07;
 }
 return Math.max(.005,weight);
}
export function rangeEquity(v,trials=280,rng=Math.random){const known=[...v.hole,...v.board],pool=deck().filter(c=>!known.includes(c)),opps=v.players.map((p,i)=>({...p,seat:i})).filter(p=>p.inHand&&!p.folded&&p.seat!==v.seat);let wins=0;
 for(let t=0;t<trials;t++){let d=[...pool],hands=[];
 for(let p of opps){let a,b;for(let attempt=0;attempt<40;attempt++){a=Math.floor(rng()*d.length);b=Math.floor(rng()*(d.length-1));if(b>=a)b++;if(rng()<rangeWeight([d[a],d[b]],v.board,p,v.history||[]))break}hands.push([d[a],d[b]]);d.splice(Math.max(a,b),1);d.splice(Math.min(a,b),1)}
 let board=[...v.board];while(board.length<5){let j=Math.floor(rng()*d.length);board.push(d.splice(j,1)[0])}let own=evaluate([...v.hole,...board]),ties=1,lose=false;for(let h of hands){let rank=evaluate([...h,...board]);if(rank>own){lose=true;break}if(rank===own)ties++}if(!lose)wins+=1/ties;
 }return wins/trials;
}
export function contextualAdvice(v,base,trials=280,rng=Math.random){const context=stackContext(v),rangeEq=rangeEquity(v,trials,rng),margin=rangeEq-base.odds,notes=[];let recommended=base.recommended,reason=base.reason;
 if(v.legal.call&&margin<-.08){recommended='fold';reason='The estimated opposing ranges make this call look expensive. Favor a fold unless you have a specific read or realistic future value.'}
 else if(v.legal.call&&Math.abs(margin)<.07){recommended='close';reason='This is a close decision under a simplified range model. Position, future bets, and which hands the opponent can have matter more than a small equity difference.'}
 else if(v.legal.call&&margin>.12&&recommended==='fold'){recommended='call';reason='The range estimate supports continuing at this price, but it is not a guarantee that calling is best.'}
 if(v.legal.call&&context.callFraction>=.35&&margin<.12&&margin>=-.08){recommended='close';reason='This call commits a large share of your remaining stack without a wide equity cushion. Decide how you would handle another bet; position and the chance of being eliminated matter here.'}
 const score=startingScore(v.hole),preRaises=(v.history||[]).filter(a=>a.type==='raise'&&a.street===0).length;
 if(!v.street&&v.legal.call>0&&!preRaises){let gate=['BTN','CO','BTN / SB'].includes(context.position)?.54:context.position==='SB'?.61:.66;if(score<gate-.12){recommended='fold';reason='This starting hand is weak for your seat. A cheap price alone does not account for playing out of position or facing raises behind you.'}}
 if(context.bb<=15)notes.push({tag:'Stack depth',text:`You have ${context.bb.toFixed(1)} big blinds left. Calling uses room you may need for a later bet; decide whether you can continue if the pot grows. Short does not mean every hand should go all-in.`});
 else if(context.effectiveBB>=80)notes.push({tag:'Stack depth',text:`You and ${context.target} can contest up to ${context.effectiveBB.toFixed(1)} big blinds this street, including bets already placed. Deep stacks reward stronger made hands and draws to the best possible hand; one pair can become expensive.`});
 else notes.push({tag:'Stack depth',text:`The effective stack against ${context.target} is ${context.effectiveBB.toFixed(1)} big blinds this street. The smaller stack limits what that matchup can win or lose.`});
 notes.push({tag:'Position',text:context.last?'You act last among the remaining players after the flop. That information helps you control pot size and judge whether to take another bet.':'Someone still has position on you after the flop. Marginal hands can be harder to turn into a profit when you act first.'});
 if(context.callFraction>=.25)notes.push({tag:'Commitment',text:`This call costs ${Math.round(context.callFraction*100)}% of your remaining stack. Think about the next street before paying; chips already invested are not a reason to chase.`});
 if(context.opponents>1)notes.push({tag:'Multiway pot',text:`You face ${context.opponents} live opponents. Bluffs must get through more people, and a good one-pair hand is less secure.`});
 if(context.spr!==null)notes.push({tag:'Stack / pot',text:`Against ${context.target}, the current remaining effective stack is ${context.spr.toFixed(1)}× the pot. ${context.spr<2?'There is limited room for later betting; do not treat this ratio alone as a reason to commit.':'There is room for more bets. Plan how much you are willing to invest on later cards.'}`});
 if(v.format==='tournament')notes.push({tag:'Tournament',text:`Your chips behind rank ${context.rank} of ${context.field}${context.relative>=1.2?', above the table average':''}. ${context.covered?context.target+' can cover your stack; losing an all-in against them can eliminate you.':'Covering a shorter stack gives you room to survive a loss, not permission to play every hand.'} This model does not calculate payout pressure or ICM.`});
 else notes.push({tag:'Table standing',text:`You hold ${context.relative.toFixed(2)}× the average chips behind. Being chip leader does not improve your cards; effective stacks and the opponent matter more than rank in a cash game.`});
 return {...base,context,rangeEq,recommended,reason,notes};
}
export function assessDecision(v,a,type,amount=0){let issues=[],strengths=[],uncertain=[];const c=a.context,margin=a.rangeEq-a.odds,me=v.players[v.seat],cost=type==='raise'?amount-me.bet:type==='call'?v.legal.call:0;
 if(type==='fold'&&!v.legal.call)issues.push('Checking was free. Folding gave up the chance to improve without saving any chips.');
 if(type==='call'&&v.legal.call&&margin<-.10)issues.push('The modeled ranges put your equity below the call price. Future winnings or a strong read would need to justify the gap.');
 if(type==='call'&&c.callFraction>=.3&&margin<.08)issues.push('A large part of your stack went in on a marginal estimate. Review the plan for another bet and the risk of being committed.');
 if(type==='raise'&&v.street>0&&c.opponents>=2&&a.rangeEq<.18)issues.push('This low-equity bluff must get through multiple opponents. Check which stronger hands would actually fold.');
 if(type==='raise'&&cost>me.stack*.6&&a.rangeEq<.3&&/Calling/.test(c.targetStyle))issues.push('A large bluff risks much of your stack against an opponent who calls widely. A smaller risk or a value-focused line is worth considering.');
 if(!v.street&&type==='call'&&v.legal.call&&startingScore(v.hole)<.5&&['UTG','HJ','SB'].includes(c.position))issues.push('This weak starting hand is difficult to realize from this seat. A low call price alone does not remove positional risk.');
 if(type==='fold'&&v.legal.call&&margin>.18)uncertain.push('You folded with a favorable range estimate. A stronger read could justify it; otherwise, review whether you gave up too much.');
 if(type==='raise'&&amount>v.legal.min*3&&a.rangeEq<.65)uncertain.push('The large sizing needs a clear purpose: which worse hands call, or which better hands fold? Size alone does not establish a mistake.');
 if(type==='call'&&v.legal.call&&Math.abs(margin)<.08)uncertain.push('This call is close under uncertain ranges, so a strong good/bad verdict would be misleading.');
 if(type==='fold'&&v.legal.call&&margin<-.08)strengths.push('You declined an unfavorable price under the range model. Later cards do not change the information you had.');
 if(type==='call'&&!v.legal.call)strengths.push('You kept the hand alive for free and preserved options. Whether a bet earns more depends on the opponent’s range.');
 if(type==='call'&&v.legal.call&&margin>.12)strengths.push('Your call had a cushion above the modeled price. Position and future betting can still reduce that advantage.');
 if(type==='raise'&&a.rangeEq>.65)strengths.push('An aggressive value line is supported by the model. Check that weaker hands can continue at your chosen size.');
 const grade=issues.length?'review':uncertain.length||!strengths.length?'context':'reasonable';return {grade,issues,strengths,feedback:[...issues,...uncertain,...strengths].join(' ')||'This is a plausible line, but the model cannot establish its value. Review your purpose, sizing, position, and the hands that continue.',cost};
}
export function newSession(format,difficulty){return {id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9),started:new Date().toISOString(),format,difficulty,hands:[]};}
export function recordHand(session,game,position){if(!game.done||!game.hand||session.hands.some(h=>h.number===game.hand))return false;const decisions=game.review.map(r=>({...r})),hero=game.players[0];session.hands.push({number:game.hand,bb:game.bb,seats:game.players.filter(p=>p.inHand).length,position,net:hero.stack-hero.startStack,endingStack:hero.stack,decisions,showdown:game.showdown&&!hero.folded,result:game.result});return true;}
export function sessionSummary(session){const hands=session.hands,decisions=hands.flatMap(h=>h.decisions),pre=h=>h.decisions.filter(d=>d.street==='Preflop'),vp=hands.filter(h=>pre(h).some(d=>d.type==='raise'||d.type==='call'&&d.call>0)).length,pfr=hands.filter(h=>pre(h).some(d=>d.type==='raise')).length,post=decisions.filter(d=>d.street!=='Preflop'),bets=post.filter(d=>d.type==='raise').length,calls=post.filter(d=>d.type==='call'&&d.call>0).length,opp=decisions.filter(d=>d.call>0),folds=opp.filter(d=>d.type==='fold').length;
 const n=hands.length,vpip=n?vp/n:0,raiseRate=n?pfr/n:0,fields=[...new Set(hands.map(h=>h.seats))];let style='Building a sample';if(n>=20&&fields.length===1){const short=fields[0]<=3,low=short?.3:.2,high=short?.6:.35;style=(vpip<low?'Tight':vpip>high?'Loose':'Moderate')+' · '+(vp?raiseRate/vpip>=.6?'raise-led':'call-led':'few entries')}else if(n>=20)style='Mixed table sizes';
 const grades={reasonable:0,review:0,context:0};decisions.forEach(d=>grades[d.grade in grades?d.grade:'context']++);let positions={};for(let h of hands){let p=positions[h.position]??={hands:0,entries:0,raises:0};p.hands++;if(pre(h).some(d=>d.type==='raise'||d.type==='call'&&d.call>0))p.entries++;if(pre(h).some(d=>d.type==='raise'))p.raises++}
 return {n,vp,pfr,vpip,raiseRate,bets,calls,folds,foldOpportunities:opp.length,net:hands.reduce((s,h)=>s+h.net,0),grades,decisions:decisions.length,positions,style,fields};}

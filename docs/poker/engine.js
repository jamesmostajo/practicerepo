export const styles=['You','Balanced · GTO-inspired','Tight-passive','Loose-aggressive','Calling station','Tight-aggressive'];
export const names=['You','Alex','Morgan','Riley','Sam','Jordan'];
export const deck=()=>Array.from({length:52},(_,i)=>i);
const rank=c=>c%13+2, suit=c=>Math.floor(c/13);
export function evaluate(cards){
 const counts=Array(15).fill(0),ss=[[],[],[],[]];cards.forEach(c=>{counts[rank(c)]++;ss[suit(c)].push(rank(c))});
 const straight=rs=>{let a=new Set(rs);if(a.has(14))a.add(1);for(let h=14;h>=5;h--)if([0,1,2,3,4].every(d=>a.has(h-d)))return h;return 0};
 const groups=Array.from({length:13},(_,i)=>i+2).filter(r=>counts[r]).sort((a,b)=>counts[b]-counts[a]||b-a);
 const sorted=[...new Set(cards.map(rank))].sort((a,b)=>b-a);const flush=ss.find(s=>s.length>=5);let v;
 if(flush&&straight(flush))v=[8,straight(flush)];
 else if(counts[groups[0]]===4)v=[7,groups[0],...sorted.filter(r=>r!==groups[0]).slice(0,1)];
 else if(counts[groups[0]]===3&&counts[groups[1]]>=2)v=[6,groups[0],groups[1]];
 else if(flush)v=[5,...flush.sort((a,b)=>b-a).slice(0,5)];
 else if(straight(sorted))v=[4,straight(sorted)];
 else if(counts[groups[0]]===3)v=[3,groups[0],...sorted.filter(r=>r!==groups[0]).slice(0,2)];
 else if(counts[groups[0]]===2&&counts[groups[1]]===2){let p=groups.filter(r=>counts[r]===2).sort((a,b)=>b-a).slice(0,2);v=[2,...p,...sorted.filter(r=>!p.includes(r)).slice(0,1)]}
 else if(counts[groups[0]]===2)v=[1,groups[0],...sorted.filter(r=>r!==groups[0]).slice(0,3)];
 else v=[0,...sorted.slice(0,5)];while(v.length<6)v.push(0);return v.reduce((a,b)=>a*15+b,0);
}
export const handName=cards=>['High card','One pair','Two pair','Three of a kind','Straight','Flush','Full house','Four of a kind','Straight flush'][Math.floor(evaluate(cards)/15**5)];
export function equity(hole,board,opponents=1,trials=180,rng=Math.random){
 const pool=deck().filter(c=>!hole.includes(c)&&!board.includes(c));let wins=0;
 for(let t=0;t<trials;t++){const d=[...pool];for(let i=0;i<5-board.length+opponents*2;i++){const j=i+Math.floor(rng()*(d.length-i));[d[i],d[j]]=[d[j],d[i]]}let at=5-board.length,b=[...board,...d.slice(0,at)],v=evaluate([...hole,...b]),tie=1,lose=false;
 for(let p=0;p<opponents;p++){let w=evaluate([...d.slice(at,at+2),...b]);at+=2;if(w>v){lose=true;break}if(w===v)tie++}if(!lose)wins+=1/tie;}return wins/trials;
}
export class Game{
 constructor(format='cash',difficulty='standard',rng=Math.random){this.format=format;this.difficulty=difficulty;this.rng=rng;this.players=names.map((name,i)=>({name,style:styles[i],stack:2000,tilt:0}));this.button=-1;this.hand=0;this.done=true;this.log=[];this.review=[];this.board=[];this.pot=0;this.result='Take your seat.';}
 next(i,pred=p=>p.inHand){for(let n=1;n<=6;n++){let j=(i+n)%6;if(pred(this.players[j]))return j}return -1}
 start(){if(!this.done)return false;if(this.format==='tournament'&&(this.players[0].stack===0||this.players.filter(p=>p.stack>0).length===1))return false;
 if(this.format==='cash')this.players.forEach((p,i)=>{if(i&&p.stack===0)p.stack=2000});if(this.players[0].stack===0)return false;
 this.hand++;this.level=this.format==='cash'?0:Math.floor((this.hand-1)/8);this.bb=[20,30,50,80,120,200,300,500,800,1200,2000][Math.min(this.level,10)];this.sb=Math.floor(this.bb/2);this.done=false;this.board=[];this.pot=0;this.current=0;this.lastRaise=this.bb;this.street=0;this.log=[];this.review=[];this.result='';this.cards=deck();for(let i=51;i>0;i--){let j=Math.floor(this.rng()*(i+1));[this.cards[i],this.cards[j]]=[this.cards[j],this.cards[i]]}
 this.players.forEach(p=>Object.assign(p,{inHand:p.stack>0,folded:p.stack===0,bet:0,total:0,actedAt:null,hole:[],action:'',startStack:p.stack}));this.button=this.next(this.button);this.players.filter(p=>p.inHand).forEach(p=>p.hole=[this.cards.pop(),this.cards.pop()]);let heads=this.players.filter(p=>p.inHand).length===2;this.small=heads?this.button:this.next(this.button);this.big=this.next(this.small);this.pay(this.small,this.sb);this.pay(this.big,this.bb);this.players[this.small].action='Small blind';this.players[this.big].action='Big blind';this.current=this.bb;this.turn=this.next(this.big,p=>p.inHand&&!p.folded&&p.stack>0);this.advance();return true;
 }
 pay(i,amount){let p=this.players[i],a=Math.min(p.stack,Math.max(0,amount));p.stack-=a;p.bet+=a;p.total+=a;this.pot+=a;return a}
 legal(i=this.turn){let p=this.players[i];if(!p||this.done)return {};let call=Math.min(p.stack,Math.max(0,this.current-p.bet)),max=p.bet+p.stack,min=this.current+this.lastRaise;
 let reopened=p.actedAt===null||this.current-p.actedAt>=this.lastRaise;let other=this.players.some((q,j)=>j!==i&&q.inHand&&!q.folded&&q.stack>0);
 return {call,max,min:Math.min(min,max),fullMin:min,canRaise:reopened&&other&&max>this.current,check:call===0};}
 act(type,amount=0){if(this.done)throw Error('Hand is complete');let i=this.turn,p=this.players[i],l=this.legal();if(!['fold','call','raise'].includes(type))throw Error('Invalid action');if(type==='raise'&&(!l.canRaise||!Number.isInteger(amount)||amount>l.max||amount<l.min))throw Error('Choose a legal raise amount');
 if(type==='fold'){p.folded=true;p.action='Fold'}else if(type==='call'){let paid=this.pay(i,l.call);p.action=paid?'Call '+paid:'Check'}else{let old=this.current;this.pay(i,amount-p.bet);this.current=p.bet;if(this.current-old>=this.lastRaise)this.lastRaise=this.current-old;p.action=(old?'Raise to ':'Bet ')+p.bet}
 if(p.stack===0&&!p.folded)p.action+=' · all-in';p.actedAt=this.current;this.log.push({street:this.street,seat:i,type,amount,text:p.name+': '+p.action});this.turn=this.next(i,q=>q.inHand&&!q.folded&&q.stack>0);this.advance();}
 advance(){if(this.done)return;let live=this.players.filter(p=>p.inHand&&!p.folded);if(live.length===1){this.finish(false);return}let active=live.filter(p=>p.stack>0);let pending=active.filter(p=>p.actedAt===null||p.bet<this.current);
 if(active.length<=1&&(!active.length||active[0].bet>=this.current)){while(this.board.length<5)this.dealStreet();this.finish(true);return}
 if(!pending.length){if(this.street===3){this.finish(true);return}this.dealStreet();this.players.forEach(p=>{p.bet=0;p.actedAt=null;p.action=p.folded?'Fold':p.stack===0?'All-in':''});this.current=0;this.lastRaise=this.bb;this.turn=this.next(this.button,p=>p.inHand&&!p.folded&&p.stack>0);return}
 if(!pending.includes(this.players[this.turn]))this.turn=this.next(this.turn,p=>pending.includes(p));}
 dealStreet(){this.cards.pop();let n=this.board.length===0?3:1;for(let j=0;j<n;j++)this.board.push(this.cards.pop());this.street++}
 finish(showdown){this.showdown=showdown;let levels=[...new Set(this.players.map(p=>p.total).filter(Boolean))].sort((a,b)=>a-b),prev=0,awards=Array(6).fill(0);this.pots=[];
 for(let level of levels){let contributors=this.players.map((p,i)=>({p,i})).filter(x=>x.p.total>=level),amount=(level-prev)*contributors.length;prev=level;let eligible=contributors.filter(x=>!x.p.folded),winners;
 if(contributors.length===1){awards[contributors[0].i]+=amount;this.pots.push({amount,description:amount+' uncalled chips returned to '+contributors[0].p.name});continue}
 if(!eligible.length)throw Error('No eligible winner');let best=Math.max(...eligible.map(x=>evaluate([...x.p.hole,...this.board])));winners=eligible.filter(x=>!showdown||evaluate([...x.p.hole,...this.board])===best).sort((a,b)=>(a.i-this.button+5)%6-(b.i-this.button+5)%6);let share=Math.floor(amount/winners.length),rem=amount%winners.length;winners.forEach((x,j)=>awards[x.i]+=share+(j<rem?1:0));this.pots.push({amount,description:winners.map(x=>x.p.name).join(' & ')+' win '+amount+(showdown?' · '+handName([...winners[0].p.hole,...this.board]):' · everyone else folded')});}
 this.players.forEach((p,i)=>{p.stack+=awards[i];p.tilt=Math.max(0,Math.min(.22,p.tilt+(p.stack<p.startStack?.035:-.025)))});this.result=this.pots.map(p=>p.description).join('. ');this.done=true;this.turn=-1;
 }
 view(i){let p=this.players[i];return {hole:[...p.hole],board:[...this.board],pot:this.pot,street:this.street,button:this.button,seat:i,bb:this.bb,difficulty:this.difficulty,format:this.format,legal:this.legal(i),players:this.players.map(({hole,...publicInfo})=>({...publicInfo})),style:i,tilt:p.tilt};}
}
export function advice(v,trials=220,rng=Math.random){let active=v.players.filter(p=>p.inHand&&!p.folded).length-1,eq=equity(v.hole,v.board,Math.max(1,active),trials,rng),l=v.legal;
 // Eligible pot excludes money above this player's possible final contribution.
 let me=v.players[v.seat],cap=me.total+l.call,eligible=v.players.reduce((s,p)=>s+Math.min(p.total,cap),0);let odds=l.call/(eligible+l.call||1),late=[v.button,(v.button+5)%6].includes(v.seat),rs=v.hole.map(rank).sort((a,b)=>b-a),pair=rs[0]===rs[1],suited=suit(v.hole[0])===suit(v.hole[1]);
 let pre=pair?.46+rs[0]/32:(rs[0]+rs[1])/38+(suited?.065:0)+(rs[0]-rs[1]<=2?.04:0);let strength=v.street?eq:pre;
 let recommended=l.call?(eq>odds+.09?'call':'fold'):'call';if(l.canRaise&&strength>(v.street?Math.max(.6,1/(active+1)+.3):late?.71:.79))recommended='raise';
 if(!v.street&&l.call<=v.bb&&pre>(late?.53:.62))recommended=l.canRaise?'raise':'call';
 let reason=recommended==='fold'?'The price looks demanding for this hand. Folding preserves chips for stronger opportunities.':recommended==='raise'?'This hand can support an aggressive line. Raise for value against hands that can continue, while considering position.':l.call?'Continuing looks reasonable at this price, but an opponent’s strong betting range can reduce your actual equity.':'Checking keeps weaker hands in and controls the pot. A bet can also be reasonable with a clear value or bluff purpose.';
 return {eq,odds,pre,late,recommended,reason};}
export function chooseAI(v,rng=Math.random){let a=advice(v,v.difficulty==='advanced'?160:85,rng),l=v.legal,style=v.style,r=rng(),easy=v.difficulty==='beginner',tilt=v.difficulty==='advanced'?v.tilt:0;
 let strength=v.street?a.eq:a.pre,threshold=v.street?Math.max(.57,1/v.players.filter(p=>p.inHand&&!p.folded).length+.27):(a.late?.69:.78),aggression=[0,.12,.015,.26,.025,.09][style]+tilt;
 const ranks=v.hole.map(rank),draw=v.board.length>0&&v.board.length<5&&(Array.from({length:4},(_,s)=>[...v.hole,...v.board].filter(c=>suit(c)===s).length).includes(4)||a.eq>.3&&a.eq<.5);
 let bluff=!easy&&r<aggression*(draw?1.45:.65)&&v.players.filter(p=>p.inHand&&!p.folded).length<=3;
 if(l.canRaise&&(strength>threshold+(style===2?.12:style===3?-.1:0)||bluff)){let fraction=style===3?.8:style===4?.45:rng()<.5?.4:.7;let amount=v.street?Math.round(v.players[v.seat].bet+l.call+(v.pot+l.call)*fraction):Math.round(v.bb*(a.late?2.5:3)+v.legal.call);return {type:'raise',amount:Math.max(l.min,Math.min(l.max,amount))}}
 if(!l.call)return {type:'call'};let margin=style===2?.14:style===4?-.17:style===3?-.035:.045;
 let okay=v.street?a.eq>a.odds+margin:a.pre>(style===4?.36:style===2?.67:a.late?.5:.58)&&a.eq>a.odds+margin;
 if(!easy&&rng()<.07&&a.eq>a.odds-.04)okay=!okay;
 return {type:okay?'call':'fold'};}

import {useEffect,useRef,useState} from 'react';
import {cardDefaults,cardLabel,cardEdges,createCardRound,resolveCardRound,validCardConfig} from '../../shared/cards.mjs';
import type {CardConfig,CardRecord,CardRound,Difficulty,PlayingCard,Preset,Session} from '../lib/types';

type Props={presets:Preset<CardConfig>[];onSave:(s:Session)=>Promise<void>;onPreset:(p:Preset<CardConfig>)=>Promise<void>;onBusy:(v:boolean)=>void};
const signed=(n:number)=>`${n>=0?'+':''}${n.toFixed(2)}`;
const fields:{key:keyof Omit<CardConfig,'showFairValue'>;label:string;min:number;max:number;step?:number}[]=[
 {key:'rounds',label:'Rounds',min:3,max:50},
 {key:'roundSeconds',label:'Seconds per decision',min:5,max:120},
 {key:'visibleCards',label:'Visible cards',min:1,max:5},
 {key:'hiddenCards',label:'Hidden cards',min:1,max:3},
 {key:'spread',label:'Quoted spread',min:0.1,max:8,step:0.1},
 {key:'maxEdge',label:'Maximum mispricing edge',min:0.1,max:5,step:0.1},
 {key:'quoteNoise',label:'Dealer valuation noise (± units)',min:0,max:10,step:0.1},
 {key:'aggressiveness',label:'Dealer aggressiveness',min:0,max:1,step:0.05},
 {key:'noiseTradeProbability',label:'Random dealer demand probability',min:0,max:1,step:0.05},
];
export default function CardGame({presets,onSave,onPreset,onBusy}:Props){
 const [config,setConfig]=useState<CardConfig>(structuredClone(cardDefaults.Easy));
 const [difficulty,setDifficulty]=useState<Difficulty>('Easy');
 const [phase,setPhase]=useState<'setup'|'choose'|'review'|'result'>('setup');
 const [round,setRound]=useState<CardRound|null>(null);
 const [records,setRecords]=useState<CardRecord[]>([]);
 const [remaining,setRemaining]=useState(config.roundSeconds);
 const [error,setError]=useState('');const [presetName,setPresetName]=useState('');
 const [presetSaving,setPresetSaving]=useState(false);const [saving,setSaving]=useState(false);const [saved,setSaved]=useState(false);
 const [result,setResult]=useState<Session|null>(null);
 const current=useRef<CardRound|null>(null);const recordRef=useRef<CardRecord[]>([]);const active=useRef(false);
 const clock=useRef({start:0,roundStart:0,deadline:0});const actionRef=useRef<(action:'buy'|'sell'|'pass',timeout?:boolean)=>void>(()=>{});
 const buyButton=useRef<HTMLButtonElement>(null);const nextButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>()=>{active.current=false;onBusy(false);},[onBusy]);
 useEffect(()=>{if(phase==='choose')buyButton.current?.focus();if(phase==='review')nextButton.current?.focus();},[phase]);
 useEffect(()=>{
  if(phase!=='choose')return;
  const timer=setInterval(()=>{if(!active.current)return;const seconds=Math.max(0,Math.ceil((clock.current.deadline-performance.now())/1000));setRemaining(seconds);if(!seconds)actionRef.current('pass',true);},100);
  const key=(event:KeyboardEvent)=>{
   if(event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
   const action=({b:'buy',s:'sell',p:'pass'} as const)[event.key.toLowerCase() as 'b'|'s'|'p'];
   if(action){event.preventDefault();actionRef.current(action);}
  };
  window.addEventListener('keydown',key);return()=>{clearInterval(timer);window.removeEventListener('keydown',key);};
 },[phase]);
 useEffect(()=>{
  if(!['choose','review'].includes(phase)||(result&&saved))return;
  const prevent=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent);
 },[phase,result,saved]);
 async function persist(session:Session){setSaving(true);setError('');try{await onSave(session);setSaved(true);}catch(e){setError((e as Error).message);}finally{setSaving(false);}}
 function deal(){
  const next=createCardRound(config);current.current=next;setRound(next);
  const now=performance.now();clock.current.roundStart=now;clock.current.deadline=now+config.roundSeconds*1000;
  active.current=true;setRemaining(config.roundSeconds);setPhase('choose');
 }
 function start(){
  if(!validCardConfig(config)){setError('Keep each setting within its displayed limits.');return;}
  recordRef.current=[];setRecords([]);setResult(null);setError('');setSaved(false);clock.current.start=performance.now();onBusy(true);deal();
 }
 function complete(all:CardRecord[]){
  const edge=all.reduce((sum,r)=>sum+r.edge,0);const pnl=all.reduce((sum,r)=>sum+r.pnl,0);
  const correct=all.filter(r=>r.correct).length;const fills=all.filter(r=>r.action!=='pass').length;
  const decisions=all.filter(r=>!r.timedOut);
  const session:Session={id:crypto.randomUUID(),timestamp:new Date().toISOString(),game:'cards',difficulty,config:structuredClone(config),
   score:edge,capturedEdge:edge,availableEdge:all.reduce((sum,r)=>sum+r.bestEdge,0),missedEdge:all.reduce((sum,r)=>sum+r.missedEdge,0),
   pnl,grossPnl:pnl,penalties:0,correct,errors:all.length-correct,accuracy:correct/all.length,
   avgResponseMs:decisions.length?decisions.reduce((sum,r)=>sum+r.responseMs,0)/decisions.length:0,
   duration:Math.max(0.001,(performance.now()-clock.current.start)/1000),fills,rounds:all.length,fillRate:fills/all.length};
  setResult(session);
 }
 function choose(action:'buy'|'sell'|'pass',timeout=false){
  if(!active.current||!current.current)return;
  active.current=false;const now=performance.now();timeout=timeout||now>=clock.current.deadline;
  const outcome=resolveCardRound(current.current,action,timeout);
  const record:CardRecord={...outcome,round:current.current,responseMs:Math.min(config.roundSeconds*1000,now-clock.current.roundStart)};
  const all=[...recordRef.current,record];recordRef.current=all;setRecords(all);setPhase('review');
  if(all.length===config.rounds)complete(all);
 }
 actionRef.current=choose;
 function next(){if(active.current)return;if(recordRef.current.length===config.rounds){setPhase('result');onBusy(false);if(result)void persist(result);}else deal();}
 function edit(nextConfig:CardConfig){setConfig(nextConfig);setDifficulty('Custom');}
 function field(item:typeof fields[number]){return <label className="mental-setting" key={item.key}><span>{item.label}<small>{item.min}–{item.max}</small></span><input type="number" aria-label={item.label} min={item.min} max={item.max} step={item.step||1} value={config[item.key]} onChange={e=>edit({...config,[item.key]:Number(e.target.value)})}/></label>;}
 const totalEdge=records.reduce((sum,r)=>sum+r.edge,0),totalPnl=records.reduce((sum,r)=>sum+r.pnl,0);

 if(phase==='result'&&result)return <main className="result dice-result">
  <p className="eyebrow">SESSION COMPLETE · CARD MARKET</p><h1>{result.score>=0?'Think in expected value.':'Find the edge, then act.'}</h1>
  <div className={`bigscore ${result.score<0?'danger':''}`}>{signed(result.score)}<span>captured expected edge · score</span></div>
  <div className="metrics"><Metric value={signed(result.pnl!)} label="Realized P&L"/><Metric value={`${Math.round(result.accuracy*100)}%`} label="Optimal decisions"/><Metric value={result.missedEdge!.toFixed(2)} label="Edge left behind"/><Metric value={`${result.fills} / ${result.rounds}`} label="Trades / rounds"/></div>
  <p className="hint">Best available edge: {result.availableEdge!.toFixed(2)}. Edge left behind includes missed opportunities and losses from negative-edge trades. Realized P&L also reflects the hidden card draws.</p>
  <p className="muted">{saving?'Saving session…':saved?'Session saved.':'Session not yet saved.'}</p>{error&&<p className="danger" role="alert">{error} <button disabled={saving} onClick={()=>persist(result)}>Retry save</button></p>}
  <button className="primary" disabled={!saved} onClick={start}>Deal again ↗</button> <button disabled={!saved} onClick={()=>setPhase('setup')}>Adjust settings</button><p><a href="#/history">View progress →</a></p>
  <details className="panel trade-details"><summary>Review all {records.length} decisions</summary><div className="tablewrap"><table><thead><tr><th>Round</th><th>Visible hand</th><th>Bid / ask</th><th>EV</th><th>Choice</th><th>Edge</th><th>P&L</th></tr></thead><tbody>{records.map((r,i)=><tr key={i}><td>{i+1}</td><td>{r.round.visible.map(cardLabel).join(' ')}</td><td>{r.round.bid.toFixed(2)} / {r.round.ask.toFixed(2)}</td><td>{r.round.fairValue.toFixed(4)}</td><td>{r.timedOut?'Timeout':r.action}</td><td>{signed(r.edge)}</td><td>{signed(r.pnl)}</td></tr>)}</tbody></table></div></details>
 </main>;

 if((phase==='choose'||phase==='review')&&round){
  const review=phase==='review'?records.at(-1):undefined;
  const visibleSum=round.visible.reduce((sum,c)=>sum+c.rank,0);
  const edges=cardEdges(round);
  return <main className="play dice-play card-play">
   <div className="playbar"><span>CARD MARKET</span><span>Round {phase==='choose'?records.length+1:records.length} / {config.rounds}</span><span className={phase==='choose'&&remaining<=5?'danger':''}>{phase==='choose'?`${remaining}s`:'Review'}<small>{phase==='choose'?'to decide':'timer paused'}</small></span></div>
   <div className="market-metrics"><Metric value={signed(totalEdge)} label="Captured edge · score"/><Metric value={signed(totalPnl)} label="Realized P&L"/><Metric value={`${records.filter(r=>r.correct).length} / ${records.length}`} label="Optimal decisions"/></div>
   <section className="card-surface"><p className="eyebrow">PAYOUT = SUM OF ALL CARD VALUES</p>
    <div className="playing-hand">{round.visible.map((card,i)=><Card key={`visible-${i}`} card={card}/>)}{round.hidden.map((card,i)=><Card key={`hidden-${i}`} card={review?card:undefined} revealed={!!review}/>)}</div>
    <p className="hint">A = 1 · J = 11 · Q = 12 · K = 13<br/>{round.hidden.length} hidden {round.hidden.length===1?'card':'cards'}, drawn without replacement. Fresh deck each round.</p>
    <div className="book"><div><span>Dealer bid</span><strong>{round.bid.toFixed(2)}</strong><small>You sell here</small></div><span className="book-divider">/</span><div><span>Dealer ask</span><strong>{round.ask.toFixed(2)}</strong><small>You buy here</small></div></div>
    {review?<div className="card-review panel" role="status"><h2 className={review.correct?'correct':'danger'}>{review.timedOut?'Timed out — recorded as a pass.':review.correct?'Optimal decision.':'A better edge was available.'}</h2>
      <p>You {review.action==='pass'?'passed':`${review.action==='buy'?'bought':'sold'} at ${review.price!.toFixed(2)}`} · edge {signed(review.edge)} · realized P&L {signed(review.pnl)}</p>
      <p className="hint">Fair value = {visibleSum} + {round.hidden.length} × (364 − {visibleSum}) / {52-round.visible.length} = {round.fairValue.toFixed(4)}.</p>
      <p className="hint">Buy edge {signed(edges.buy)} · Sell edge {signed(edges.sell)} · Pass 0.00.<br/>Best action: {review.bestAction}. Actual payout: {round.payout}.</p>
      <button ref={nextButton} className="primary" onClick={next}>{records.length===config.rounds?'See results':'Next hand'} ↵</button>
    </div>:<>
     {config.showFairValue&&<p className="ev-hint">Fair value hint: <strong>{round.fairValue.toFixed(4)}</strong></p>}
     <div className="take-actions"><button ref={buyButton} className="primary" aria-keyshortcuts="B" onClick={()=>choose('buy')}>Buy <kbd>B</kbd></button><button aria-keyshortcuts="S" onClick={()=>choose('sell')}>Sell <kbd>S</kbd></button><button aria-keyshortcuts="P" onClick={()=>choose('pass')}>Pass <kbd>P</kbd></button></div>
     <p className="hint">Buy below fair value. Sell above it. Otherwise pass.<br/>All quotes are firm for one unit. Every trade settles this round.</p>
    </>}
   </section>
  </main>;
 }

 return <main><div className="pageheading"><div><p className="eyebrow">04 / MARKETS</p><h1>Card market taking</h1><p className="muted">A hand, a market, a decision.</p></div><a className="textlink" href="#/">← All modes</a></div>
  <div className="setupgrid"><section className="panel"><h2>Your session</h2><label className="fieldlabel">Difficulty</label><div className="segmented">{(['Easy','Medium','Hard','Custom'] as Difficulty[]).map(d=><button key={d} aria-pressed={difficulty===d} className={difficulty===d?'selected':''} onClick={()=>{setDifficulty(d);if(d!=='Custom')setConfig(structuredClone(cardDefaults[d]));}}>{d}</button>)}</div>
   {fields.slice(0,4).map(field)}<label className="hint-toggle"><input type="checkbox" checked={config.showFairValue} onChange={e=>edit({...config,showFairValue:e.target.checked})}/>Show fair-value hint</label>
   <details className="advanced"><summary>Spread & dealer behavior</summary>{fields.slice(4).map(field)}<p className="hint">The dealer’s noisy valuation and demand sometimes skew its quote away from fair value. A displayed quote always fills when you choose to trade.</p></details>
   {error&&<p className="danger" role="alert">{error}</p>}<button className="primary full" onClick={start}>Deal the cards <span>↗</span></button>
  </section><aside><section className="panel"><p className="eyebrow">THE RULES</p><h2>Good decisions beat good luck.</h2><p className="muted">Every round starts with a fresh 52-card deck. Value the visible hand plus its hidden cards, then choose buy, sell or pass.</p><p className="hint">A = 1, J = 11, Q = 12, K = 13. Remove visible cards when calculating the average remaining card. The whole deck’s value is 364.</p><p className="hint">Score = expected edge captured. Buy edge = fair value − ask. Sell edge = bid − fair value. Passing adds zero. Negative-edge trades lower your score; missed opportunities appear as edge left behind.</p><p className="hint">The hidden cards are revealed after your choice. Realized P&L is separate from your score. A timeout counts as an incorrect pass, with zero edge.</p><div className="rule"><kbd>B</kbd><span>Buy at the ask</span></div><div className="rule"><kbd>S</kbd><span>Sell at the bid</span></div><div className="rule"><kbd>P</kbd><span>Pass</span></div></section>
   <section className="panel presets"><h2>Saved presets</h2>{presets.length?<select aria-label="Load preset" value="" onChange={e=>{const p=presets.find(p=>p.id===e.target.value);if(p)edit(structuredClone(p.config));}}><option value="">Choose a preset</option>{presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>:<p className="muted">Save a hand size and pace to revisit.</p>}
    <form onSubmit={async e=>{e.preventDefault();if(!validCardConfig(config)){setError('Fix the settings before saving.');return;}setPresetSaving(true);try{await onPreset({id:crypto.randomUUID(),game:'cards',name:presetName.trim(),config:structuredClone(config)});setPresetName('');setError('');}catch(e){setError((e as Error).message);}finally{setPresetSaving(false);}}}><input aria-label="Preset name" placeholder="Preset name" maxLength={60} required value={presetName} onChange={e=>setPresetName(e.target.value)}/><button disabled={!presetName.trim()||presetSaving}>Save</button></form>
   </section></aside></div>
 </main>;
}
function Metric({value,label}:{value:string|number;label:string}){return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;}
function Card({card,revealed=false}:{card?:PlayingCard;revealed?:boolean}){
 return <div className={`playing-card ${!card?'card-hidden':''} ${revealed?'card-revealed':''} ${card&&['♥','♦'].includes(card.suit)?'red-suit':''}`} aria-label={card?`${revealed?'Revealed ':''}${cardLabel(card)}`:'Hidden card'}>
  {card?<><span className="card-rank">{({1:'A',11:'J',12:'Q',13:'K'} as Record<number,string>)[card.rank]||card.rank}</span><span className="card-suit">{card.suit}</span></>:<span>?</span>}
 </div>;
}

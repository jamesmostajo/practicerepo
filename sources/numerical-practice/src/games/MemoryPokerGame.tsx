import {useEffect,useRef,useState} from 'react';
import {createMemoryPokerRound,memoryPokerDefaults,memoryPokerLimits,resolveMemoryPokerRound,validMemoryPokerConfig} from '../../shared/memory-poker.mjs';
import type {Difficulty,MemoryPokerConfig,MemoryPokerRecord,MemoryPokerRound,PlayingCard,Preset,Session} from '../lib/types';

type Props={presets:Preset<MemoryPokerConfig>[];onSave:(s:Session)=>Promise<void>;onPreset:(p:Preset<MemoryPokerConfig>)=>Promise<void>;onBusy:(v:boolean)=>void};
type Phase='setup'|'memorize'|'select'|'review'|'result';
const fields:{key:keyof MemoryPokerConfig;label:string}[]=[
 {key:'rounds',label:'Rounds'},
 {key:'memorizeSeconds',label:'Seconds to memorize'},
 {key:'selectSeconds',label:'Seconds to choose'},
];
const rankText=(rank:number)=>({1:'A',11:'J',12:'Q',13:'K'} as Record<number,string>)[rank]||String(rank);
const label=(card:PlayingCard)=>`${rankText(card.rank)}${card.suit}`;
const red=(card:PlayingCard)=>card.suit==='♥'||card.suit==='♦';

export default function MemoryPokerGame({presets,onSave,onPreset,onBusy}:Props){
 const [config,setConfig]=useState<MemoryPokerConfig>(structuredClone(memoryPokerDefaults.Medium));
 const [difficulty,setDifficulty]=useState<Difficulty>('Medium');
 const [phase,setPhase]=useState<Phase>('setup');
 const [round,setRound]=useState<MemoryPokerRound|null>(null);
 const [selection,setSelection]=useState<number[]>([]);
 const [records,setRecords]=useState<MemoryPokerRecord[]>([]);
 const [remaining,setRemaining]=useState(0);
 const [error,setError]=useState('');const [presetName,setPresetName]=useState('');
 const [presetSaving,setPresetSaving]=useState(false);const [saving,setSaving]=useState(false);const [saved,setSaved]=useState(false);
 const [result,setResult]=useState<Session|null>(null);
 const roundRef=useRef<MemoryPokerRound|null>(null);const selectionRef=useRef<number[]>([]);const recordRef=useRef<MemoryPokerRecord[]>([]);
 const phaseRef=useRef<Phase>('setup');const clock=useRef({start:0,phaseStart:0,deadline:0,total:1});
 const advanceRef=useRef<(timeout?:boolean)=>void>(()=>{});const mainButton=useRef<HTMLButtonElement>(null);
 const go=(next:Phase)=>{phaseRef.current=next;setPhase(next);};

 useEffect(()=>()=>{phaseRef.current='setup';onBusy(false);},[onBusy]);
 useEffect(()=>{if(phase==='memorize'||phase==='review')mainButton.current?.focus();},[phase,round]);
 useEffect(()=>{
  if(phase!=='memorize'&&phase!=='select')return;
  const timer=setInterval(()=>{const left=Math.max(0,clock.current.deadline-performance.now());setRemaining(left/1000);if(!left)advanceRef.current(true);},100);
  return()=>clearInterval(timer);
 },[phase,round]);
 useEffect(()=>{
  if(!['memorize','select','review'].includes(phase))return;
  const key=(event:KeyboardEvent)=>{if(event.key==='Enter'&&!event.repeat&&!(event.target instanceof HTMLButtonElement)){event.preventDefault();advanceRef.current();}};
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[phase]);
 useEffect(()=>{
  if(!['memorize','select','review'].includes(phase)||(result&&saved))return;
  const prevent=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent);
 },[phase,result,saved]);

 function startTimer(seconds:number){const now=performance.now();clock.current.phaseStart=now;clock.current.deadline=now+seconds*1000;clock.current.total=seconds;setRemaining(seconds);}
 function deal(){
  const next=createMemoryPokerRound();roundRef.current=next;setRound(next);
  selectionRef.current=[];setSelection([]);startTimer(config.memorizeSeconds);go('memorize');
 }
 function start(){
  if(!validMemoryPokerConfig(config)){setError('Keep each setting within its displayed limits.');return;}
  recordRef.current=[];setRecords([]);setResult(null);setError('');setSaved(false);clock.current.start=performance.now();onBusy(true);deal();
 }
 function beginSelection(){startTimer(config.selectSeconds);go('select');}
 function finalize(timeout=false){
  if(phaseRef.current!=='select'||!roundRef.current)return;
  const picks=selectionRef.current;if(!timeout&&picks.length!==2)return;
  const now=performance.now();
  const outcome=resolveMemoryPokerRound(roundRef.current,picks,timeout);
  const record:MemoryPokerRecord={...outcome,round:roundRef.current,responseMs:Math.min(config.selectSeconds*1000,now-clock.current.phaseStart)} as MemoryPokerRecord;
  const all=[...recordRef.current,record];recordRef.current=all;setRecords(all);go('review');
  if(all.length===config.rounds)complete(all);
 }
 function complete(all:MemoryPokerRecord[]){
  const average=all.reduce((sum,r)=>sum+r.score,0)/all.length;const correct=all.filter(r=>r.optimal).length;
  const answered=all.filter(r=>r.complete);
  setResult({id:crypto.randomUUID(),timestamp:new Date().toISOString(),game:'memory-poker',difficulty,config:structuredClone(config),
   score:average,averageScore:average,correct,errors:all.length-correct,accuracy:correct/all.length,rounds:all.length,
   avgResponseMs:answered.length?answered.reduce((sum,r)=>sum+r.responseMs,0)/answered.length:0,
   duration:Math.max(0.001,(performance.now()-clock.current.start)/1000)});
 }
 async function persist(session:Session){setSaving(true);setError('');try{await onSave(session);setSaved(true);}catch(e){setError((e as Error).message);}finally{setSaving(false);}}
 function next(){if(recordRef.current.length===config.rounds){go('result');onBusy(false);if(result)void persist(result);}else deal();}
 advanceRef.current=(timeout=false)=>{const p=phaseRef.current;if(p==='memorize')beginSelection();else if(p==='select')finalize(timeout);else if(p==='review'&&!timeout)next();};
 function toggle(index:number){
  if(phaseRef.current!=='select')return;
  const current=selectionRef.current;
  const updated=current.includes(index)?current.filter(i=>i!==index):current.length<2?[...current,index]:current;
  selectionRef.current=updated;setSelection(updated);
 }
 function edit(nextConfig:MemoryPokerConfig){setConfig(nextConfig);setDifficulty('Custom');}

 if(phase==='result'&&result){
  return <main className="result dice-result">
   <p className="eyebrow">SESSION COMPLETE · MEMORY POKER</p><h1>{result.score>=90?'Sharp memory, sharp reads.':result.score>=60?'Close to the best hand.':'Picture the grid, then read the flop.'}</h1>
   <div className="bigscore">{result.score.toFixed(1)}<span>average score · out of 100</span></div>
   <div className="metrics"><Metric value={`${result.correct} / ${result.rounds}`} label="Optimal picks"/><Metric value={`${records.filter(r=>!r.complete).length}`} label="Timeouts"/><Metric value={result.avgResponseMs?`${(result.avgResponseMs/1000).toFixed(1)}s`:'—'} label="Avg. selection time"/></div>
   <p className="hint">Round score = 100 × (pairs your hand beats) ÷ (pairs the best hand beats), out of all 120 two-card choices. Any pair tying the best hand scores 100.</p>
   <p className="muted">{saving?'Saving session…':saved?'Session saved.':'Session not yet saved.'}</p>{error&&<p className="danger" role="alert">{error} <button disabled={saving} onClick={()=>persist(result)}>Retry save</button></p>}
   <button className="primary" disabled={!saved} onClick={start}>Deal again ↗</button> <button disabled={!saved} onClick={()=>go('setup')}>Adjust settings</button><p><a href="#/history">View progress →</a></p>
   <details className="panel trade-details"><summary>Review all {records.length} rounds</summary><div className="tablewrap"><table><thead><tr><th>Round</th><th>Flop</th><th>Your pick</th><th>Your hand</th><th>Best hand</th><th>Score</th></tr></thead><tbody>{records.map((r,i)=><tr key={i}><td>{i+1}</td><td>{r.round.flop.map(label).join(' ')}</td><td>{r.complete?r.selection.map(n=>label(r.round.grid[n])).join(' '):'—'}</td><td>{r.hand??'Timeout'}</td><td>{r.bestHand}</td><td>{r.score}</td></tr>)}</tbody></table></div></details>
  </main>;
 }

 if(round&&(phase==='memorize'||phase==='select'||phase==='review')){
  const review=phase==='review'?records.at(-1):undefined;
  const optimalCards=new Set(review?review.optimalPairs.flat():[]);
  const faceUp=phase!=='select';
  const fraction=phase==='review'?0:remaining/clock.current.total;
  const total=records.reduce((sum,r)=>sum+r.score,0);
  return <main className="mp-play">
   <div className="mp-bar"><span className="mp-title">MEMORY POKER<small>Round {phase==='review'?records.length:records.length+1} / {config.rounds}</small></span>
    <span className="mp-total">{records.length?(total/records.length).toFixed(0):'—'}<small>avg score</small></span>
    <span className={`mp-clock ${phase!=='review'&&remaining<=3?'danger':''}`}>{phase==='review'?'Review':`${Math.ceil(remaining)}s`}<small>{phase==='memorize'?'memorize':phase==='select'?'choose 2':'timer paused'}</small></span></div>
   <div className="timertrack mp-track"><div style={{width:`${fraction*100}%`}}/></div>
   <section className="mp-flop" aria-label="Flop"><span className="mp-label">FLOP</span>{round.flop.map((card,i)=><Face key={i} card={phase==='memorize'?undefined:card}/>)}</section>
   <section className="mp-grid" aria-label="Card grid">{round.grid.map((card,i)=>{
    const picked=(review?review.selection:selection).includes(i);
    return <button key={i} type="button" className={`mp-cell ${picked?'mp-picked':''} ${optimalCards.has(i)?'mp-optimal':''}`} disabled={phase!=='select'} aria-pressed={phase==='select'?picked:undefined}
     aria-label={faceUp?`${label(card)}${picked?', your pick':''}${optimalCards.has(i)?', optimal':''}`:`Card ${i+1}${picked?', selected':''}`} onClick={()=>toggle(i)}>
     <Face card={faceUp?card:undefined} back={!faceUp}/>{optimalCards.has(i)&&<span className="mp-star" aria-hidden="true">★</span>}
    </button>;})}</section>
   {phase==='memorize'&&<div className="mp-actions"><button ref={mainButton} className="primary" onClick={beginSelection}>I’m ready · flip cards ↵</button></div>}
   {phase==='select'&&<div className="mp-actions"><button className="primary" disabled={selection.length!==2} onClick={()=>finalize()}>{selection.length===2?'Finalize selection ↵':`Select ${2-selection.length} more card${selection.length===1?'':'s'}`}</button></div>}
   {review&&<div className="mp-review panel" role="status">
    <h2 className={review.optimal?'correct':review.complete?'':'danger'}>{review.optimal?'Best possible hand · 100':review.complete?`Score ${review.score} / 100`:'Timed out · 0 / 100'}</h2>
    <p>{review.complete?<>You: <b>{review.hand}</b> with {review.selection.map(n=><CardText key={n} card={round.grid[n]}/>)}</>:'Fewer than two cards were selected.'}</p>
    {!review.optimal&&<p>Best: <b>{review.bestHand}</b> with {review.optimalPairs.slice(0,3).map((pair,i)=><span key={i}>{i>0&&' or '}{pair.map(n=><CardText key={n} card={round.grid[n]}/>)}</span>)}{review.optimalPairs.length>3&&` (+${review.optimalPairs.length-3} more)`}</p>}
    {review.complete&&!review.optimal&&<p className="hint">{review.strongerHands} stronger hand{review.strongerHands===1?' was':'s were'} available. ★ marks the optimal cards.</p>}
    <button ref={mainButton} className="primary" onClick={next}>{records.length===config.rounds?'See results':'Next round'} ↵</button>
   </div>}
  </main>;
 }

 return <main><div className="pageheading"><div><p className="eyebrow">11 / REASONING</p><h1>Memory poker</h1><p className="muted">Sixteen cards. One look. The best hand you can remember.</p></div><a className="textlink" href="#/">← All modes</a></div>
  <div className="setupgrid"><section className="panel"><h2>Your session</h2><label className="fieldlabel">Difficulty</label><div className="segmented">{(['Easy','Medium','Hard','Custom'] as Difficulty[]).map(d=><button key={d} aria-pressed={difficulty===d} className={difficulty===d?'selected':''} onClick={()=>{setDifficulty(d);if(d!=='Custom')setConfig(structuredClone(memoryPokerDefaults[d]));}}>{d}</button>)}</div>
   {fields.map(item=>{const [min,max]=memoryPokerLimits[item.key];return <label className="mental-setting" key={item.key}><span>{item.label}<small>{min}–{max}</small></span><input type="number" aria-label={item.label} min={min} max={max} step={1} value={config[item.key]} onChange={e=>edit({...config,[item.key]:Number(e.target.value)})}/></label>;})}
   {error&&<p className="danger" role="alert">{error}</p>}<button className="primary full" onClick={start}>Deal the grid <span>↗</span></button>
  </section><aside><section className="panel"><p className="eyebrow">THE RULES</p><h2>Remember, then build.</h2><p className="muted">Sixteen cards from a 52-card deck are dealt face up in a 4 × 4 grid. Memorize them before the timer ends.</p><p className="hint">The grid then flips face down and a three-card flop is drawn from the rest of the deck. Pick two grid cards to make the best five-card poker hand with the flop. Finalize to stop the timer early; when time runs out, two selected cards are submitted automatically.</p><p className="hint">Round score = 100 × (two-card choices your hand beats) ÷ (choices the best hand beats), out of all 120 pairs. Any pair tying the best hand scores 100; the weakest scores 0. Fewer than two picks at the buzzer scores 0. Session score is the average.</p><p className="hint">Aces play high or low (A-2-3-4-5). Suits never break ties.</p><div className="rule"><kbd>Enter</kbd><span>Ready · finalize · next round</span></div></section>
   <section className="panel presets"><h2>Saved presets</h2>{presets.length?<select aria-label="Load preset" value="" onChange={e=>{const p=presets.find(p=>p.id===e.target.value);if(p)edit(structuredClone(p.config));}}><option value="">Choose a preset</option>{presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>:<p className="muted">Save a pace and round count to revisit.</p>}
    <form onSubmit={async e=>{e.preventDefault();if(!validMemoryPokerConfig(config)){setError('Fix the settings before saving.');return;}setPresetSaving(true);try{await onPreset({id:crypto.randomUUID(),game:'memory-poker',name:presetName.trim(),config:structuredClone(config)});setPresetName('');setError('');}catch(e){setError((e as Error).message);}finally{setPresetSaving(false);}}}><input aria-label="Preset name" placeholder="Preset name" maxLength={60} required value={presetName} onChange={e=>setPresetName(e.target.value)}/><button disabled={!presetName.trim()||presetSaving}>Save</button></form>
   </section></aside></div>
 </main>;
}
function Metric({value,label}:{value:string|number;label:string}){return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;}
function CardText({card}:{card:PlayingCard}){return <span className={`mp-cardtext ${red(card)?'red-suit':''}`}>{label(card)}</span>;}
function Face({card,back=false}:{card?:PlayingCard;back?:boolean}){
 if(!card)return <span className={`mp-face ${back?'mp-back':'mp-blank'}`} aria-hidden="true">{back?'':'?'}</span>;
 return <span className={`mp-face ${red(card)?'red-suit':''}`} aria-label={label(card)}><b>{rankText(card.rank)}</b><i>{card.suit}</i></span>;
}

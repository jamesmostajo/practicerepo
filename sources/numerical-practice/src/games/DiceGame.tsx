import {useEffect,useRef,useState} from 'react';
import {createDiceState,diceDefaults,diceView,quoteError,resolveDiceRound,diceSettlement,validDiceConfig} from '../../shared/dice.mjs';
import type {DiceConfig,Difficulty,Preset,Session} from '../lib/types';

type DiceState=ReturnType<typeof createDiceState>;
type Props={presets:Preset<DiceConfig>[];onSave:(s:Session)=>Promise<void>;onPreset:(p:Preset<DiceConfig>)=>Promise<void>;onBusy:(v:boolean)=>void};
const signed=(n:number)=>`${n>=0?'+':''}${n.toFixed(2)}`;
const fields:{key:keyof DiceConfig;label:string;min:number;max:number;step?:number}[]=[
 {key:'rounds',label:'Quoting rounds',min:3,max:50},
 {key:'diceCount',label:'Number of dice',min:2,max:3},
 {key:'roundSeconds',label:'Seconds per quote',min:5,max:120},
 {key:'maxSpread',label:'Maximum spread',min:0.1,max:10,step:0.1},
 {key:'aggressiveness',label:'Counterparty aggressiveness',min:0,max:1,step:0.05},
 {key:'noise',label:'Value noise (± price units)',min:0,max:5,step:0.1},
 {key:'noiseTradeProbability',label:'Random trade probability',min:0,max:1,step:0.05},
 {key:'inventoryPenalty',label:'Inventory penalty per round',min:0.01,max:1,step:0.01},
 {key:'positionLimit',label:'Position limit (units)',min:1,max:20},
 {key:'hiddenModifier',label:'Hidden modifier (± units)',min:0,max:5},
 {key:'eventProbability',label:'Downside event probability',min:0,max:1,step:0.05},
 {key:'eventLoss',label:'Downside event payout reduction',min:0,max:10},
];

export default function DiceGame({presets,onSave,onPreset,onBusy}:Props){
 const [config,setConfig]=useState<DiceConfig>(structuredClone(diceDefaults.Easy));
 const [difficulty,setDifficulty]=useState<Difficulty>('Easy');
 const [phase,setPhase]=useState<'setup'|'quote'|'review'|'result'>('setup');
 const [model,setModel]=useState<DiceState|null>(null);
 const [bid,setBid]=useState('');const [ask,setAsk]=useState('');
 const [remaining,setRemaining]=useState(config.roundSeconds);
 const [error,setError]=useState('');const [presetName,setPresetName]=useState('');
 const [result,setResult]=useState<Session|null>(null);const [saving,setSaving]=useState(false);const [saved,setSaved]=useState(false);
 const [presetSaving,setPresetSaving]=useState(false);
 const stateRef=useRef<DiceState|null>(null);const quoteActive=useRef(false);
 const clock=useRef({start:0,roundStart:0,deadline:0});
 const input=useRef<HTMLInputElement>(null);const nextButton=useRef<HTMLButtonElement>(null);
 const timeoutRef=useRef<()=>void>(()=>{});
 useEffect(()=>()=>{quoteActive.current=false;onBusy(false);},[onBusy]);
 useEffect(()=>{
  if(phase==='quote'){input.current?.focus();input.current?.select();}
  if(phase==='review')nextButton.current?.focus();
 },[phase]);
 useEffect(()=>{
  if(phase!=='quote')return;
  const timer=setInterval(()=>{if(!quoteActive.current)return;const left=Math.max(0,Math.ceil((clock.current.deadline-performance.now())/1000));setRemaining(left);if(left===0)timeoutRef.current();},100);
  return()=>clearInterval(timer);
 },[phase]);
 useEffect(()=>{
  if(!['quote','review'].includes(phase))return;
  const prevent=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',prevent);
  return()=>window.removeEventListener('beforeunload',prevent);
 },[phase]);
 async function persist(session:Session){setSaving(true);setError('');try{await onSave(session);setSaved(true);}catch(e){setError((e as Error).message);}finally{setSaving(false);}}
 function start(){
  if(!validDiceConfig(config)){setError('Keep each setting within its displayed limits.');return;}
  const state=createDiceState(config);stateRef.current=state;setModel(state);
  const now=performance.now();clock.current={start:now,roundStart:now,deadline:now+config.roundSeconds*1000};quoteActive.current=true;
  setBid('');setAsk('');setRemaining(config.roundSeconds);setError('');setSaved(false);setPhase('quote');onBusy(true);
 }
 function finish(state:DiceState){
  const settlement=diceSettlement(state);
  const submitted=state.records.filter(r=>r.bid!==null);
  const session:Session={id:crypto.randomUUID(),timestamp:new Date().toISOString(),game:'dice',difficulty,config:structuredClone(config),
   score:settlement.netPnl,pnl:settlement.netPnl,grossPnl:settlement.grossPnl,penalties:state.penalties,
   fills:state.fills,rounds:config.rounds,maxInventory:state.maxInventory,fillRate:state.fills/config.rounds,
   correct:state.submitted,errors:state.timeouts,accuracy:state.submitted/config.rounds,
   avgResponseMs:submitted.length?submitted.reduce((sum,r)=>sum+r.responseMs,0)/submitted.length:0,
   duration:Math.max(0.001,(performance.now()-clock.current.start)/1000)};
  setResult(session);setPhase('result');onBusy(false);void persist(session);
 }
 function submit(timeout=false){
  const state=stateRef.current;if(!state||!quoteActive.current)return;
  const now=performance.now();timeout=timeout||now>=clock.current.deadline;
  const quote=timeout?null:{bid:bid.trim()===''?NaN:Number(bid),ask:ask.trim()===''?NaN:Number(ask)};
  if(quote){const message=quoteError(config,quote.bid,quote.ask);if(message){setError(message);return;}}
  quoteActive.current=false;setError('');
  const next=resolveDiceRound(state,quote,Math.min(config.roundSeconds*1000,now-clock.current.roundStart));
  stateRef.current=next;setModel(next);
  if(next.done)finish(next);else setPhase('review');
 }
 timeoutRef.current=()=>submit(true);
 function nextRound(){
  if(quoteActive.current)return;
  const now=performance.now();clock.current.roundStart=now;clock.current.deadline=now+config.roundSeconds*1000;
  quoteActive.current=true;setRemaining(config.roundSeconds);setError('');setPhase('quote');
 }
 function edit(next:DiceConfig){setConfig(next);setDifficulty('Custom');}
 function field(item:typeof fields[number]){return <label className="mental-setting" key={item.key}><span>{item.label}<small>{item.min}–{item.max}</small></span><input type="number" aria-label={item.label} min={item.min} max={item.max} step={item.step||1} value={config[item.key]} onChange={e=>edit({...config,[item.key]:Number(e.target.value)})}/></label>;}

 if(phase==='result'&&result&&model){const settlement=diceSettlement(model);return <main className="result dice-result">
  <p className="eyebrow">SESSION SETTLED · DICE MARKET</p><h1>{result.pnl!>=0?'A market well made.':'Every fill teaches.'}</h1>
  <div className={`bigscore ${result.pnl!<0?'danger':''}`}>{signed(result.pnl!)}<span>net P&L · score</span></div>
  <div className="metrics"><Metric value={signed(result.grossPnl!)} label="Gross realized P&L"/><Metric value={result.penalties!.toFixed(2)} label="Total penalties"/><Metric value={`${model.fills} / ${config.rounds}`} label="Rounds filled"/><Metric value={model.maxInventory} label="Peak position"/></div>
  <section className="panel settlement"><h2>Final payout: {settlement.settlement.toFixed(2)}</h2><p className="muted">Dice {model.dice.join(' + ')} · modifier {signed(model.modifier)} · event {model.eventHappened?`−${config.eventLoss}`:'did not occur'}</p><p className="hint">Cash {signed(model.cash)} + {model.inventory} units × {settlement.settlement.toFixed(2)} = gross P&L {signed(settlement.grossPnl)}. All inventory is now settled to zero.</p><p className="hint">Inventory charges {model.records.reduce((sum,r)=>sum+r.inventoryCharge,0).toFixed(2)} + missed-quote charges {model.timeouts.toFixed(2)} = penalties {model.penalties.toFixed(2)}.</p></section>
  <p className="muted">{saving?'Saving session…':saved?'Session saved.':'Session not yet saved.'}</p>{error&&<p className="danger" role="alert">{error} <button disabled={saving} onClick={()=>persist(result)}>Retry save</button></p>}
  <button className="primary" disabled={!saved} onClick={start}>Make another market ↗</button> <button disabled={!saved} onClick={()=>setPhase('setup')}>Adjust settings</button><p><a href="#/history">View progress →</a></p>
  <details className="panel trade-details"><summary>Review all {config.rounds} rounds</summary><div className="tablewrap"><table><thead><tr><th>Round</th><th>Bid / Ask</th><th>Your fill</th><th>Inventory</th><th>Penalty</th></tr></thead><tbody>{model.records.map(r=><tr key={r.round}><td>{r.round}</td><td>{r.bid===null?'Timed out':`${r.bid.toFixed(2)} / ${r.ask!.toFixed(2)}`}</td><td>{r.quantity?`${r.action==='buy'?'Sold':'Bought'} ${r.quantity} @ ${r.price!.toFixed(2)}`:r.reason}</td><td>{r.inventory}</td><td>{(r.inventoryCharge+r.timeoutCharge).toFixed(2)}</td></tr>)}</tbody></table></div></details>
 </main>;}

 if((phase==='quote'||phase==='review')&&model){
  const view=diceView(model);const record=model.records.at(-1);
  return <main className="play dice-play"><div className="playbar"><span>DICE MARKET</span><span>Round {phase==='quote'?model.round+1:model.round} / {config.rounds}</span><span className={phase==='quote'&&remaining<=5?'danger':''}>{phase==='quote'?`${remaining}s`:'Review'}<small>{phase==='quote'?'to quote':'timer paused'}</small></span></div>
   <div className="market-metrics"><Metric value={signed(view.markedPnl)} label="Marked P&L, net"/><Metric value={`${model.inventory>0?'+':''}${model.inventory} / ±${config.positionLimit}`} label="Inventory / limit"/><Metric value={model.penalties.toFixed(2)} label="Penalties paid"/></div>
   {phase==='review'&&record?<section className="panel round-review" role="status"><p className="eyebrow">ROUND {record.round} COMPLETE</p><h1>{record.quantity?`You ${record.action==='buy'?'sold':'bought'} 1 @ ${record.price!.toFixed(2)}`:'No fill this round.'}</h1><p className="muted">{record.reason==='Quote timed out'?'Quote timed out. A 1.00 penalty was charged.':record.reason==='Position limit blocked the fill'?'Your position limit blocked this fill.':record.quantity?'Inventory and cash updated.':'The counterparty passed on your market.'}</p><p className="hint">Inventory charge: {record.inventoryCharge.toFixed(2)}. {model.inventory>0?'You are long: lower your quotes to encourage selling.':model.inventory<0?'You are short: raise your quotes to encourage buying.':'Your position is flat.'}</p><button ref={nextButton} className="primary" onClick={nextRound}>Next round ↵</button></section>:
   <section className="quote-surface"><p className="eyebrow">ONE CONTRACT · {config.diceCount} SIX-SIDED DICE</p>
    <div className="dice-display" aria-label={`${view.visibleDice.length} revealed dice: ${view.visibleDice.join(', ')||'none'}. ${view.unknownDice} hidden.`}>{view.visibleDice.map((d,i)=><span key={i} className="die revealed">{d}</span>)}{Array.from({length:view.unknownDice},(_,i)=><span key={`hidden-${i}`} className="die">?</span>)}</div>
    <p className="public-value">Public fair value <strong>{view.publicValue.toFixed(2)}</strong></p>
    <p className="hint">{config.hiddenModifier?`Hidden modifier: −${config.hiddenModifier} to +${config.hiddenModifier}. `:'No hidden modifier. '}{config.eventProbability&&config.eventLoss?`${Math.round(config.eventProbability*100)}% chance of a −${config.eventLoss} payout event.`:'No downside event.'}</p>
    <form onSubmit={e=>{e.preventDefault();submit();}}><div className="quote-inputs"><label>Your bid<input ref={input} autoFocus aria-label="Your bid" type="number" step="0.01" value={bid} onChange={e=>setBid(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();document.getElementById('dice-ask')?.focus();}}}/><small>You buy at this price</small></label><span>/</span><label>Your ask<input id="dice-ask" aria-label="Your ask" type="number" step="0.01" value={ask} onChange={e=>setAsk(e.target.value)}/><small>You sell at this price</small></label></div>
     <p className="hint">Spread ≤ {config.maxSpread} · Price range {view.minPrice}–{view.maxPrice} · One unit per fill</p>
     {error&&<p role="alert" className="danger">{error}</p>}<button className="primary" type="submit">Quote market ↵</button>
    </form>
    <p className="hint">Position charge after each round: {config.inventoryPenalty} × inventory².<br/>{Math.abs(model.inventory)===config.positionLimit?'At the position limit: fills that increase exposure will be blocked.':'Use your quotes to balance edge and inventory.'}</p>
   </section>}
  </main>;
 }
 return <main><div className="pageheading"><div><p className="eyebrow">03 / MARKETS</p><h1>Market making · Dice</h1><p className="muted">Price the uncertainty. Keep your position in check.</p></div><a className="textlink" href="#/">← All modes</a></div>
  <div className="setupgrid"><section className="panel"><h2>Your market</h2><label className="fieldlabel">Difficulty</label><div className="segmented">{(['Easy','Medium','Hard','Custom'] as Difficulty[]).map(d=><button key={d} className={difficulty===d?'selected':''} aria-pressed={difficulty===d} onClick={()=>{setDifficulty(d);if(d!=='Custom')setConfig(structuredClone(diceDefaults[d]));}}>{d}</button>)}</div>{fields.slice(0,4).map(field)}
   <details className="advanced"><summary>Counterparty, inventory & event risk</summary>{fields.slice(4).map(field)}<p className="hint">Probabilities use 0–1. The counterparty knows the hidden modifier, but not unrevealed dice or the final event outcome.</p></details>
   {error&&<p className="danger" role="alert">{error}</p>}<button className="primary full" onClick={start}>Start market <span>↗</span></button>
  </section><aside><section className="panel"><p className="eyebrow">THE RULES</p><h2>One contract. Many quotes.</h2><p className="muted">The final dice sum, plus a hidden modifier and any event loss, is the payout per unit. Some dice are revealed as the session progresses.</p><p className="hint">Quote a bid below your ask. A counterparty may buy, sell or pass. All fills are one unit. Cash and inventory carry between rounds.</p><p className="hint">Score = final cash + inventory × payout − penalties. Every round costs {config.inventoryPenalty} × inventory². Missing a quote costs another 1.00. All remaining units settle at the end.</p><p className="hint">Running P&L uses public fair value, so it can differ from final realized P&L. Review screens pause the quote timer.</p><div className="rule"><kbd>enter</kbd><span>Bid → ask → submit</span></div></section>
   <section className="panel presets"><h2>Saved presets</h2>{presets.length?<select aria-label="Load preset" value="" onChange={e=>{const p=presets.find(p=>p.id===e.target.value);if(p)edit(structuredClone(p.config));}}><option value="">Choose a preset</option>{presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>:<p className="muted">Save a market you want to practice.</p>}
    <form onSubmit={async e=>{e.preventDefault();if(!validDiceConfig(config)){setError('Fix the settings before saving.');return;}setPresetSaving(true);try{await onPreset({id:crypto.randomUUID(),game:'dice',name:presetName.trim(),config:structuredClone(config)});setPresetName('');setError('');}catch(e){setError((e as Error).message);}finally{setPresetSaving(false);}}}><input aria-label="Preset name" placeholder="Preset name" maxLength={60} required value={presetName} onChange={e=>setPresetName(e.target.value)}/><button disabled={!presetName.trim()||presetSaving}>Save</button></form>
   </section></aside></div>
 </main>;
}
function Metric({value,label}:{value:string|number;label:string}){return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;}

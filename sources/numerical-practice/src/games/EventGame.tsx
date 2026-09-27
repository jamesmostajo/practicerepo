import {useEffect,useRef,useState} from 'react';
import {createEventRound,eventDefaults,eventQuoteError,resolveEventRound,validEventConfig} from '../../shared/events.mjs';
import type {Difficulty,EventConfig,EventRecord,EventRound,Preset,Session} from '../lib/types';

type Props={presets:Preset<EventConfig>[];onSave:(s:Session)=>Promise<void>;onPreset:(p:Preset<EventConfig>)=>Promise<void>;onBusy:(v:boolean)=>void};
const signed=(value:number)=>`${value>=0?'+':''}${value.toFixed(2)}`;
const fields:{key:keyof EventConfig;label:string;min:number;max:number;step?:number}[]=[
 {key:'rounds',label:'Events per session',min:3,max:50},
 {key:'roundSeconds',label:'Seconds per forecast and quote',min:5,max:120},
 {key:'evidenceSamples',label:'Historical observations per event',min:5,max:200},
 {key:'maxSpread',label:'Maximum spread (0–100 price units)',min:1,max:50,step:0.5},
 {key:'noiseTraders',label:'Noise traders per event',min:1,max:8},
 {key:'noiseActivity',label:'Noise trader probability of trading',min:0,max:1,step:0.05},
 {key:'informedAggressiveness',label:'Informed trader aggressiveness',min:0.1,max:1,step:0.05},
 {key:'calibrationWeight',label:'Calibration score weight',min:1,max:100},
];
export default function EventGame({presets,onSave,onPreset,onBusy}:Props){
 const [config,setConfig]=useState<EventConfig>(structuredClone(eventDefaults.Easy));const [difficulty,setDifficulty]=useState<Difficulty>('Easy');
 const [phase,setPhase]=useState<'setup'|'quote'|'review'|'result'>('setup');
 const [round,setRound]=useState<EventRound|null>(null);const [records,setRecords]=useState<EventRecord[]>([]);
 const [forecast,setForecast]=useState('');const [bid,setBid]=useState('');const [ask,setAsk]=useState('');
 const [remaining,setRemaining]=useState(config.roundSeconds);const [error,setError]=useState('');
 const [result,setResult]=useState<Session|null>(null);const [saved,setSaved]=useState(false);const [saving,setSaving]=useState(false);
 const [presetName,setPresetName]=useState('');const [presetSaving,setPresetSaving]=useState(false);
 const current=useRef<EventRound|null>(null),recordRef=useRef<EventRecord[]>([]),active=useRef(false);
 const clock=useRef({start:0,roundStart:0,deadline:0});const timeoutRef=useRef<()=>void>(()=>{});
 const forecastInput=useRef<HTMLInputElement>(null),bidInput=useRef<HTMLInputElement>(null),askInput=useRef<HTMLInputElement>(null),nextButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>()=>{active.current=false;onBusy(false);},[onBusy]);
 useEffect(()=>{if(phase==='quote')forecastInput.current?.focus();if(phase==='review')nextButton.current?.focus();},[phase]);
 useEffect(()=>{if(phase!=='quote')return;const timer=setInterval(()=>{if(!active.current)return;const seconds=Math.max(0,Math.ceil((clock.current.deadline-performance.now())/1000));setRemaining(seconds);if(!seconds)timeoutRef.current();},100);return()=>clearInterval(timer);},[phase]);
 useEffect(()=>{if(!['quote','review'].includes(phase)||(result&&saved))return;const prevent=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent);},[phase,result,saved]);
 async function persist(session:Session){setSaving(true);setError('');try{await onSave(session);setSaved(true);}catch(e){setError((e as Error).message);}finally{setSaving(false);}}
 function beginRound(){
  const next=createEventRound(config);current.current=next;setRound(next);
  const now=performance.now();clock.current.roundStart=now;clock.current.deadline=now+config.roundSeconds*1000;
  active.current=true;setForecast('');setBid('');setAsk('');setError('');setRemaining(config.roundSeconds);setPhase('quote');
 }
 function start(){if(!validEventConfig(config)){setError('Keep each setting within its displayed limits.');return;}recordRef.current=[];setRecords([]);setResult(null);setSaved(false);clock.current.start=performance.now();onBusy(true);beginRound();}
 function complete(all:EventRecord[]){
  const grossPnl=all.reduce((sum,r)=>sum+r.grossPnl,0),penalties=all.reduce((sum,r)=>sum+r.penalties,0),pnl=grossPnl-penalties;
  const brier=all.reduce((sum,r)=>sum+r.brier,0)/all.length,bonus=config.calibrationWeight*all.length*(0.25-brier);
  const submitted=all.filter(r=>!r.timedOut),fills=all.reduce((sum,r)=>sum+r.fills,0),visits=submitted.length*(config.noiseTraders+1);
  const session:Session={id:crypto.randomUUID(),timestamp:new Date().toISOString(),game:'events',difficulty,config:structuredClone(config),
   score:pnl+bonus,pnl,grossPnl,penalties,brier,calibrationBonus:bonus,fills,rounds:all.length,traderVisits:visits,fillRate:visits?fills/visits:0,
   correct:submitted.length,errors:all.length-submitted.length,accuracy:submitted.length/all.length,
   avgResponseMs:submitted.length?submitted.reduce((sum,r)=>sum+r.responseMs,0)/submitted.length:0,
   duration:Math.max(0.001,(performance.now()-clock.current.start)/1000),
   forecasts:all.map(r=>({probability:r.forecast,outcome:r.round.outcome,timedOut:r.timedOut}))};
  setResult(session);
 }
 function submit(timeout=false){
  if(!active.current||!current.current)return;const now=performance.now();timeout=timeout||now>=clock.current.deadline;
  const number=(v:string)=>v.trim()===''?NaN:Number(v);
  const quote=timeout?null:{forecast:number(forecast),bid:number(bid),ask:number(ask)};
  if(quote){const message=eventQuoteError(config,quote.forecast,quote.bid,quote.ask);if(message){setError(message);return;}}
  active.current=false;setError('');const outcome=resolveEventRound(current.current,quote,config);
  const record:EventRecord={...outcome,round:current.current,responseMs:Math.min(config.roundSeconds*1000,now-clock.current.roundStart)};
  const all=[...recordRef.current,record];recordRef.current=all;setRecords(all);setPhase('review');if(all.length===config.rounds)complete(all);
 }
 timeoutRef.current=()=>submit(true);
 function next(){if(active.current)return;if(recordRef.current.length===config.rounds){setPhase('result');onBusy(false);if(result)void persist(result);}else beginRound();}
 function edit(c:EventConfig){setConfig(c);setDifficulty('Custom');}
 function field(item:typeof fields[number]){return <label className="mental-setting" key={item.key}><span>{item.label}<small>{item.min}–{item.max}</small></span><input type="number" aria-label={item.label} min={item.min} max={item.max} step={item.step||1} value={config[item.key]} onChange={event=>edit({...config,[item.key]:Number(event.target.value)})}/></label>;}
 const totalPnl=records.reduce((sum,r)=>sum+r.pnl,0),totalScore=records.reduce((sum,r)=>sum+r.score,0),meanBrier=records.length?records.reduce((sum,r)=>sum+r.brier,0)/records.length:null;

 if(phase==='result'&&result)return <main className="result dice-result"><p className="eyebrow">SESSION COMPLETE · EVENT CONTRACTS</p><h1>Price the odds.</h1><div className={`bigscore ${result.score<0?'danger':''}`}>{signed(result.score)}<span>combined P&L + calibration score</span></div>
  <div className="metrics"><Metric value={signed(result.pnl!)} label="Net realized P&L"/><Metric value={result.brier!.toFixed(4)} label="Brier · lower is better"/><Metric value={signed(result.calibrationBonus!)} label="Calibration adjustment"/><Metric value={`${result.fills} / ${result.traderVisits}`} label="Fills / trader visits"/></div>
  <section className="panel"><h2>Your score</h2><p>Net P&L {signed(result.pnl!)} + {config.calibrationWeight} × {result.rounds} × (0.25 − {result.brier!.toFixed(4)}) = {signed(result.score)}.</p><p className="hint">Gross P&L {signed(result.grossPnl!)} less {result.penalties!.toFixed(2)} in timeout charges. Brier uses every event, including a default 50% forecast for each of the {result.errors} timed-out rounds.</p></section>
  <p className="muted">{saving?'Saving session…':saved?'Session saved.':'Session not yet saved.'}</p>{error&&<p className="danger" role="alert">{error} <button disabled={saving} onClick={()=>persist(result)}>Retry save</button></p>}
  <button className="primary" disabled={!saved} onClick={start}>Price more events ↗</button> <button disabled={!saved} onClick={()=>setPhase('setup')}>Adjust settings</button><p><a href="#/history">View progress & calibration →</a></p>
  <details className="panel trade-details"><summary>Review all {records.length} events</summary><div className="tablewrap"><table><thead><tr><th>Event</th><th>Forecast</th><th>Bid / ask</th><th>True probability</th><th>Outcome</th><th>Net P&L</th><th>Brier</th></tr></thead><tbody>{records.map((r,i)=><tr key={i}><td className="question-cell">{r.round.prompt}</td><td>{(r.forecast*100).toFixed(1)}%{r.timedOut?' (default)':''}</td><td>{r.timedOut?'Timed out':`${r.bid!.toFixed(2)} / ${r.ask!.toFixed(2)}`}</td><td>{(r.round.trueProbability*100).toFixed(0)}%</td><td>{r.round.outcome?'Yes':'No'}</td><td>{signed(r.pnl)}</td><td>{r.brier.toFixed(4)}</td></tr>)}</tbody></table></div></details>
 </main>;

 if((phase==='quote'||phase==='review')&&round){const review=phase==='review'?records.at(-1):undefined;const samplePercent=100*round.successes/round.samples;
  return <main className="play dice-play event-play"><div className="playbar"><span>EVENT CONTRACTS</span><span>Event {review?records.length:records.length+1} / {config.rounds}</span><span className={!review&&remaining<=5?'danger':''}>{review?'Review':`${remaining}s`}<small>{review?'timer paused':'to forecast & quote'}</small></span></div>
   <div className="market-metrics"><Metric value={signed(totalScore)} label="Combined score"/><Metric value={signed(totalPnl)} label="Net realized P&L"/><Metric value={meanBrier===null?'—':meanBrier.toFixed(4)} label="Brier · lower is better"/></div>
   <section className="event-surface"><p className="eyebrow">SIMULATED EVENT · YES PAYS 100 · NO PAYS 0</p><h1>{round.prompt}</h1><div className="event-evidence"><strong>{round.successes} / {round.samples}</strong><span>past {round.evidenceLabel} · {samplePercent.toFixed(1)}%</span></div><p className="hint">Independent observations under the same simulated conditions.<br/>The sample rate is noisy; the informed trader knows the underlying probability.</p>
    {review?<div className="panel event-review" role="status"><h2>Outcome: {round.outcome?'Yes · payout 100':'No · payout 0'}</h2><p>True probability: <strong>{(round.trueProbability*100).toFixed(0)}%</strong> · Your forecast: <strong>{(review.forecast*100).toFixed(1)}%</strong>{review.timedOut?' (timeout default)':''}</p>
     <div className="score-breakdown"><span>Net P&L <b>{signed(review.pnl)}</b></span><span>Brier <b>{review.brier.toFixed(4)}</b></span><span>Adjustment <b>{signed(review.calibrationBonus)}</b></span></div>
     {review.timedOut?<p className="hint">No trades. A 1.00 timeout charge and a default 50% forecast were recorded.</p>:<><p className="hint">Cash {signed(review.cash)} + {review.inventory} units × {round.outcome*100} = {signed(review.grossPnl)}. The position is now settled to zero.</p><div className="tablewrap"><table><thead><tr><th>Trader</th><th>Your fill</th></tr></thead><tbody>{review.trades.map((trade,i)=><tr key={i}><td>{trade.role}</td><td>{trade.action==='pass'?'No trade':`You ${trade.action==='buy'?'sold':'bought'} 1 @ ${trade.price!.toFixed(2)}`}</td></tr>)}</tbody></table></div></>}
     <p className="hint">Brier = ({review.forecast.toFixed(3)} − {round.outcome})². It measures forecast accuracy against the outcome, not distance from the hidden probability.</p>
     <button ref={nextButton} className="primary" onClick={next}>{records.length===config.rounds?'See results':'Next event'} ↵</button>
    </div>:<form onSubmit={event=>{event.preventDefault();submit();}}>
     <label className="forecast-input">Your probability forecast (%)<input ref={forecastInput} aria-label="Your probability forecast" type="number" min="0" max="100" step="0.01" autoFocus value={forecast} onChange={e=>setForecast(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();bidInput.current?.focus();}}}/></label>
     <div className="quote-inputs"><label>Your bid<input ref={bidInput} aria-label="Your bid" type="number" min="0" max="100" step="0.01" value={bid} onChange={e=>setBid(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();askInput.current?.focus();}}}/><small>You buy YES here</small></label><span>/</span><label>Your ask<input ref={askInput} aria-label="Your ask" type="number" min="0" max="100" step="0.01" value={ask} onChange={e=>setAsk(e.target.value)}/><small>You sell YES here</small></label></div>
     <p className="hint">Spread ≤ {config.maxSpread} · {config.noiseTraders} noise traders + 1 informed trader · One unit per trader</p>{error&&<p className="danger" role="alert">{error}</p>}<button className="primary" type="submit">Submit forecast & quote ↵</button><p className="hint">Your forecast is scored separately from your quote. All positions settle after this event.</p>
    </form>}
   </section>
  </main>;
 }
 return <main><div className="pageheading"><div><p className="eyebrow">06 / MARKETS</p><h1>Event contracts</h1><p className="muted">Make a market. Learn how well you know the odds.</p></div><a className="textlink" href="#/">← All modes</a></div><div className="setupgrid"><section className="panel"><h2>Your session</h2><label className="fieldlabel">Difficulty</label><div className="segmented">{(['Easy','Medium','Hard','Custom'] as Difficulty[]).map(d=><button key={d} aria-pressed={difficulty===d} className={difficulty===d?'selected':''} onClick={()=>{setDifficulty(d);if(d!=='Custom')setConfig(structuredClone(eventDefaults[d]));}}>{d}</button>)}</div>
  {fields.slice(0,4).map(field)}<details className="advanced"><summary>Traders & calibration scoring</summary>{fields.slice(4).map(field)}<p className="hint">Noise activity and aggressiveness use 0–1. Calibration weight controls how much Brier performance contributes to the combined score.</p></details>
  {error&&<p className="danger" role="alert">{error}</p>}<button className="primary full" onClick={start}>Start pricing events <span>↗</span></button>
 </section><aside><section className="panel"><p className="eyebrow">THE RULES</p><h2>Forecast honestly. Quote carefully.</h2><p className="muted">Each event pays 100 if it happens, 0 otherwise. Use the sample of past outcomes to estimate its chance, then quote a two-way YES market.</p><p className="hint">Noise traders buy or sell randomly. One informed trader knows the true probability, but not the future outcome, and trades more when your quote offers edge.</p><p className="hint">Combined score = net P&L + {config.calibrationWeight} × events × (0.25 − mean Brier). A constant 50% forecast has Brier 0.25; lower is better. Forecasts and quotes are separate inputs.</p><p className="hint">A missed deadline makes no trades, charges 1.00, and records a default 50% forecast. Reviews pause the timer. All scenarios and histories are simulated.</p><div className="rule"><kbd>enter</kbd><span>Forecast → bid → ask → submit</span></div></section>
 <section className="panel presets"><h2>Saved presets</h2>{presets.length?<select aria-label="Load preset" value="" onChange={e=>{const p=presets.find(p=>p.id===e.target.value);if(p)edit(structuredClone(p.config));}}><option value="">Choose a preset</option>{presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>:<p className="muted">Save a pace, evidence size and trader mix.</p>}
 <form onSubmit={async e=>{e.preventDefault();if(!validEventConfig(config)){setError('Fix the settings before saving.');return;}setPresetSaving(true);try{await onPreset({id:crypto.randomUUID(),game:'events',name:presetName.trim(),config:structuredClone(config)});setPresetName('');setError('');}catch(e){setError((e as Error).message);}finally{setPresetSaving(false);}}}><input aria-label="Preset name" placeholder="Preset name" maxLength={60} required value={presetName} onChange={e=>setPresetName(e.target.value)}/><button disabled={!presetName.trim()||presetSaving}>Save</button></form></section></aside></div></main>;
}
function Metric({value,label}:{value:string|number;label:string}){return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;}

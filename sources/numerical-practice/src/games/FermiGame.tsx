import {useEffect,useRef,useState} from 'react';
import {createFermiQuestions,fermiDefaults,intervalError,parseEstimate,scoreInterval,validFermiConfig} from '../../shared/fermi.mjs';
import type {Difficulty,FermiConfig,FermiQuestion,FermiRecord,Preset,Session} from '../lib/types';

type Props={presets:Preset<FermiConfig>[];onSave:(s:Session)=>Promise<void>;onPreset:(p:Preset<FermiConfig>)=>Promise<void>;onBusy:(v:boolean)=>void};
const fmt=(n:number)=>n>=1e12||n<0.001?n.toExponential(4):n.toLocaleString('en-US',{maximumFractionDigits:4});
const fields:{key:keyof Omit<FermiConfig,'questionSet'>;label:string;min:number;max:number;step?:number}[]=[
 {key:'rounds',label:'Questions',min:3,max:20},{key:'roundSeconds',label:'Seconds per estimate',min:10,max:180},
 {key:'questionLevel',label:'Question level',min:1,max:3},{key:'precisionWeight',label:'Precision weight',min:0.5,max:2,step:0.05},
 {key:'speedWeight',label:'Maximum speed discount',min:0,max:0.5,step:0.05}
];
export default function FermiGame({presets,onSave,onPreset,onBusy}:Props){
 const [config,setConfig]=useState<FermiConfig>(structuredClone(fermiDefaults.Easy));const [difficulty,setDifficulty]=useState<Difficulty>('Easy');
 const [phase,setPhase]=useState<'setup'|'estimate'|'review'|'result'>('setup');
 const [questions,setQuestions]=useState<FermiQuestion[]>([]);const [records,setRecords]=useState<FermiRecord[]>([]);
 const [low,setLow]=useState('');const [high,setHigh]=useState('');const [remaining,setRemaining]=useState(config.roundSeconds);
 const [error,setError]=useState('');const [result,setResult]=useState<Session|null>(null);const [saved,setSaved]=useState(false);const [saving,setSaving]=useState(false);
 const [presetName,setPresetName]=useState('');const [presetSaving,setPresetSaving]=useState(false);
 const questionRef=useRef<FermiQuestion[]>([]);const recordRef=useRef<FermiRecord[]>([]);const active=useRef(false);
 const clock=useRef({start:0,roundStart:0,deadline:0});const timeoutRef=useRef<()=>void>(()=>{});
 const lowInput=useRef<HTMLInputElement>(null);const highInput=useRef<HTMLInputElement>(null);const nextButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>()=>{active.current=false;onBusy(false);},[onBusy]);
 useEffect(()=>{if(phase==='estimate')lowInput.current?.focus();if(phase==='review')nextButton.current?.focus();},[phase]);
 useEffect(()=>{if(phase!=='estimate')return;const timer=setInterval(()=>{if(!active.current)return;const left=Math.max(0,Math.ceil((clock.current.deadline-performance.now())/1000));setRemaining(left);if(!left)timeoutRef.current();},100);return()=>clearInterval(timer);},[phase]);
 useEffect(()=>{if(!['estimate','review'].includes(phase)||(result&&saved))return;const prevent=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent);},[phase,result,saved]);
 async function persist(session:Session){setSaving(true);setError('');try{await onSave(session);setSaved(true);}catch(e){setError((e as Error).message);}finally{setSaving(false);}}
 function beginRound(){const now=performance.now();clock.current.roundStart=now;clock.current.deadline=now+config.roundSeconds*1000;active.current=true;setLow('');setHigh('');setError('');setRemaining(config.roundSeconds);setPhase('estimate');}
 function start(){if(!validFermiConfig(config)){setError('Keep each setting within its displayed limits.');return;}const next=createFermiQuestions(config);questionRef.current=next;setQuestions(next);recordRef.current=[];setRecords([]);setResult(null);setSaved(false);clock.current.start=performance.now();onBusy(true);beginRound();}
 function complete(all:FermiRecord[]){
  const score=all.reduce((sum,r)=>sum+r.score,0),hits=all.filter(r=>r.hit).length,answered=all.filter(r=>!r.timedOut);
  const session:Session={id:crypto.randomUUID(),timestamp:new Date().toISOString(),game:'fermi',difficulty,config:structuredClone(config),score,
   correct:hits,errors:all.length-hits,accuracy:hits/all.length,rounds:all.length,averageScore:score/all.length,answered:answered.length,
   averageRelativeWidth:answered.length?answered.reduce((sum,r)=>sum+r.relativeWidth!,0)/answered.length:null,
   avgResponseMs:answered.length?answered.reduce((sum,r)=>sum+r.responseMs,0)/answered.length:0,
   duration:Math.max(0.001,(performance.now()-clock.current.start)/1000)};
  setResult(session);
 }
 function submit(timeout=false){
  if(!active.current)return;const now=performance.now();timeout=timeout||now>=clock.current.deadline;
  const lower=timeout?null:parseEstimate(low),upper=timeout?null:parseEstimate(high);
  if(!timeout){const message=intervalError(lower,upper);if(message){setError(message);return;}}
  active.current=false;setError('');const question=questionRef.current[recordRef.current.length];const responseMs=Math.min(config.roundSeconds*1000,now-clock.current.roundStart);
  const record:FermiRecord={...scoreInterval(question.target,lower,upper,responseMs,config,timeout),question,low:lower,high:upper,responseMs};
  const all=[...recordRef.current,record];recordRef.current=all;setRecords(all);setPhase('review');if(all.length===config.rounds)complete(all);
 }
 timeoutRef.current=()=>submit(true);
 function next(){if(active.current)return;if(recordRef.current.length===config.rounds){setPhase('result');onBusy(false);if(result)void persist(result);}else beginRound();}
 function edit(c:FermiConfig){setConfig(c);setDifficulty('Custom');}
 const total=records.reduce((sum,r)=>sum+r.score,0);

 if(phase==='result'&&result)return <main className="result dice-result"><p className="eyebrow">SESSION COMPLETE · FERMI ESTIMATION</p><h1>Measure your uncertainty.</h1><div className="bigscore">{result.averageScore!.toFixed(1)}<span>average points per question · out of 100</span></div>
  <div className="metrics"><Metric value={`${Math.round(result.accuracy*100)}%`} label="Interval hit rate"/><Metric value={result.score.toFixed(2)} label="Total points"/><Metric value={result.averageRelativeWidth===null?'—':`${(result.averageRelativeWidth!*100).toFixed(1)}%`} label="Average width / target"/><Metric value={`${(result.avgResponseMs/1000).toFixed(1)}s`} label="Avg. submitted response"/></div>
  <p className="muted">{saving?'Saving session…':saved?'Session saved.':'Session not yet saved.'}</p>{error&&<p className="danger" role="alert">{error} <button disabled={saving} onClick={()=>persist(result)}>Retry save</button></p>}
  <button className="primary" disabled={!saved} onClick={start}>Estimate again ↗</button> <button disabled={!saved} onClick={()=>setPhase('setup')}>Adjust settings</button><p><a href="#/history">View progress →</a></p>
  <details className="panel trade-details"><summary>Review all {records.length} estimates</summary><div className="tablewrap"><table><thead><tr><th>Question</th><th>Your interval</th><th>Target</th><th>Result</th><th>Points</th></tr></thead><tbody>{records.map((r,i)=><tr key={i}><td className="question-cell">{r.question.prompt}</td><td>{r.timedOut?'Timed out':`${fmt(r.low!)}–${fmt(r.high!)}`}</td><td>{fmt(r.question.target)} {r.question.unit}</td><td>{r.hit?'Hit':'Miss'}</td><td>{r.score.toFixed(2)}</td></tr>)}</tbody></table></div></details>
 </main>;
 if((phase==='estimate'||phase==='review')&&questions.length){
  const review=phase==='review'?records.at(-1):undefined;const question=review?.question||questions[records.length];
  return <main className="play dice-play fermi-play"><div className="playbar"><span>FERMI ESTIMATION</span><span>Question {review?records.length:records.length+1} / {config.rounds}</span><span className={!review&&remaining<=5?'danger':''}>{review?'Review':`${remaining}s`}<small>{review?'timer paused':'to estimate'}</small></span></div>
   <div className="market-metrics"><Metric value={total.toFixed(2)} label="Total points"/><Metric value={`${records.filter(r=>r.hit).length} / ${records.length}`} label="Intervals containing target"/></div>
   <section className="fermi-surface"><p className="eyebrow">{question.kind==='scenario'?'MODELED SCENARIO':'REFERENCE BENCHMARK'} · {question.unit}</p><h1>{question.prompt}</h1><p className="muted assumptions">{question.assumptions}</p>
    {review?<div className="panel interval-review" role="status"><h2 className={review.hit?'correct':'danger'}>{review.timedOut?'Time ran out.':review.hit?'Your interval contains the target.':'The target is outside your interval.'}</h2><p className="target-number">{fmt(question.target)} <span>{question.unit}</span></p>
     {!review.timedOut&&<><p className="hint">Your interval: {fmt(review.low!)}–{fmt(review.high!)} {question.unit}</p><IntervalPlot low={review.low!} high={review.high!} target={question.target}/></>}
     <p>{question.explanation}</p><p className="hint">{question.sourceUrl?<a href={question.sourceUrl} target="_blank" rel="noreferrer">{question.sourceLabel} ↗</a>:question.sourceLabel}</p>
     <div className="score-breakdown"><span>Precision <b>{review.precision.toFixed(3)}</b></span><span>Speed <b>{review.speedFactor.toFixed(3)}</b></span><span>Points <b>{review.score.toFixed(2)}</b></span></div><p className="hint">{review.hit?'100 × precision × speed.':'Misses and timeouts earn zero points.'}</p>
     <button ref={nextButton} className="primary" onClick={next}>{records.length===config.rounds?'See results':'Next question'} ↵</button>
    </div>:<form onSubmit={event=>{event.preventDefault();submit();}}><div className="interval-inputs"><label>Lower bound<input ref={lowInput} autoFocus aria-label="Lower bound" type="text" inputMode="text" autoComplete="off" value={low} onChange={e=>setLow(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();highInput.current?.focus();}}}/></label><span>to</span><label>Upper bound<input ref={highInput} aria-label="Upper bound" type="text" inputMode="text" autoComplete="off" value={high} onChange={e=>setHigh(e.target.value)}/></label></div>
     <p className="hint">Answer in {question.unit}. Examples: 2,500 · 2.5k · 2.5e3.<br/>Use positive bounds; lower must be smaller than upper.</p>{error&&<p className="danger" role="alert">{error}</p>}<button className="primary" type="submit">Submit interval ↵</button>
    </form>}
   </section>
  </main>;
 }
 return <main><div className="pageheading"><div><p className="eyebrow">05 / REASONING</p><h1>Fermi estimation</h1><p className="muted">Be approximately right. Know how uncertain you are.</p></div><a className="textlink" href="#/">← All modes</a></div><div className="setupgrid"><section className="panel"><h2>Your session</h2><label className="fieldlabel">Difficulty</label><div className="segmented">{(['Easy','Medium','Hard','Custom'] as Difficulty[]).map(d=><button key={d} aria-pressed={difficulty===d} className={difficulty===d?'selected':''} onClick={()=>{setDifficulty(d);if(d!=='Custom')setConfig(structuredClone(fermiDefaults[d]));}}>{d}</button>)}</div>
  {fields.map(item=><label className="mental-setting" key={item.key}><span>{item.label}<small>{item.min}–{item.max}</small></span><input type="number" aria-label={item.label} min={item.min} max={item.max} step={item.step||1} value={config[item.key]} onChange={e=>edit({...config,[item.key]:Number(e.target.value)})}/></label>)}
  <label className="mental-setting"><span>Question set</span><select aria-label="Question set" value={config.questionSet} onChange={e=>edit({...config,questionSet:e.target.value as FermiConfig['questionSet']})}><option value="mixed">Mixed</option><option value="benchmarks">Benchmarks</option><option value="scenarios">Modeled scenarios</option></select></label>
  {error&&<p className="danger" role="alert">{error}</p>}<button className="primary full" onClick={start}>Start estimating <span>↗</span></button>
 </section><aside><section className="panel"><p className="eyebrow">THE RULES</p><h2>Accuracy, then precision.</h2><p className="muted">Give a low and high estimate. If the target falls inside, you earn up to 100 points. Tighter successful ranges earn more; faster answers get a smaller bonus.</p><p className="hint">Reference questions use fixed, sometimes rounded values. Scenarios use the assumptions stated in the prompt. Each review explains the benchmark.</p><p className="hint">Precision weight makes wide intervals cost more. Speed discount sets the maximum reduction from using the full timer. History compares average points per question and hit rate.</p><div className="rule"><kbd>enter</kbd><span>Lower → upper → submit</span></div><p className="hint">Use “How to play” in the header for the formula and a worked example.</p></section>
 <section className="panel presets"><h2>Saved presets</h2>{presets.length?<select aria-label="Load preset" value="" onChange={e=>{const p=presets.find(p=>p.id===e.target.value);if(p)edit(structuredClone(p.config));}}><option value="">Choose a preset</option>{presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>:<p className="muted">Save a question mix and pace.</p>}
 <form onSubmit={async e=>{e.preventDefault();if(!validFermiConfig(config)){setError('Fix the settings before saving.');return;}setPresetSaving(true);try{await onPreset({id:crypto.randomUUID(),game:'fermi',name:presetName.trim(),config:structuredClone(config)});setPresetName('');setError('');}catch(e){setError((e as Error).message);}finally{setPresetSaving(false);}}}><input aria-label="Preset name" placeholder="Preset name" maxLength={60} required value={presetName} onChange={e=>setPresetName(e.target.value)}/><button disabled={!presetName.trim()||presetSaving}>Save</button></form></section></aside></div></main>;
}
function Metric({value,label}:{value:string|number;label:string}){return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;}
function IntervalPlot({low,high,target}:{low:number;high:number;target:number}){
 const min=Math.min(low,target),max=Math.max(high,target);const pos=(v:number)=>30+(v-min)/(max-min)*440;
 return <svg className="interval-plot" viewBox="0 0 500 58" role="img" aria-label={`Interval ${fmt(low)} to ${fmt(high)}; target ${fmt(target)}. Linear scale.`}><line x1="30" x2="470" y1="22" y2="22" stroke="var(--border)"/><line x1={pos(low)} x2={pos(high)} y1="22" y2="22" stroke="var(--accent)" strokeWidth="8"/><line x1={pos(target)} x2={pos(target)} y1="10" y2="35" stroke="var(--text)" strokeWidth="3"/><text x="250" y="53" textAnchor="middle" fill="var(--muted)" fontSize="12">Range in green · target marked by vertical line</text></svg>;
}

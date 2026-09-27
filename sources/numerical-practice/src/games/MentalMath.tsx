import {variedGenerator} from '../../shared/variety.mjs';
import {useEffect,useRef,useState} from 'react';
import {mentalDefaults,mentalTopics,topicLabels,validMentalConfig,mentalProblem,mentalAnswerCorrect,parseMentalAnswer} from '../../shared/mental.mjs';
import type {Difficulty,MentalConfig,Preset,Session} from '../lib/types';
const nextVariedProblem=variedGenerator(mentalProblem,q=>q.prompt);

type Question=ReturnType<typeof mentalProblem>;
type Props={presets:Preset<MentalConfig>[];onSave:(s:Session)=>Promise<void>;onPreset:(p:Preset<MentalConfig>)=>Promise<void>;onBusy:(value:boolean)=>void};
const settings:{key:keyof Omit<MentalConfig,'topics'>;label:string;min:number;max:number;step?:number}[]=[
  {key:'duration',label:'Duration (seconds)',min:10,max:3600},
  {key:'maxAmount',label:'Maximum amount',min:100,max:1000000},
  {key:'maxRate',label:'Maximum annual rate / percentage',min:1,max:100},
  {key:'maxDenominator',label:'Maximum fraction denominator',min:2,max:100},
  {key:'maxYears',label:'Maximum years',min:1,max:10},
  {key:'decimals',label:'Fraction decimal places',min:1,max:4},
  {key:'compoundTolerance',label:'Compounding tolerance (%)',min:0.1,max:5,step:0.1},
];
export default function MentalMath({presets,onSave,onPreset,onBusy}:Props){
  const [config,setConfig]=useState<MentalConfig>(structuredClone(mentalDefaults.Medium));
  const [difficulty,setDifficulty]=useState<Difficulty>('Medium');
  const [phase,setPhase]=useState<'setup'|'play'|'result'>('setup');
  const [question,setQuestion]=useState<Question>(()=>nextVariedProblem(config));
  const [answer,setAnswer]=useState('');
  const [review,setReview]=useState<{correct:boolean;explanation:string}|null>(null);
  const [remaining,setRemaining]=useState(120);
  const [score,setScore]=useState(0);
  const [error,setError]=useState('');
  const [presetName,setPresetName]=useState('');
  const [presetSaving,setPresetSaving]=useState(false);
  const [result,setResult]=useState<Session|null>(null);
  const [saved,setSaved]=useState(false);
  const [saving,setSaving]=useState(false);
  const input=useRef<HTMLInputElement>(null);
  const nextButton=useRef<HTMLButtonElement>(null);
  const run=useRef({active:false,deadline:0,questionStart:0,correct:0,errors:0,times:[] as number[],reviewing:false});
  const finishRef=useRef<()=>void>(()=>{});

  useEffect(()=>()=>{run.current.active=false;onBusy(false);},[onBusy]);
  useEffect(()=>{if(phase==='play'){if(review)nextButton.current?.focus();else input.current?.focus();}},[phase,question,review]);
  useEffect(()=>{
    if(phase!=='play')return;
    const tick=()=>{const left=Math.max(0,Math.ceil((run.current.deadline-performance.now())/1000));setRemaining(left);if(!left)finishRef.current();};
    const timer=setInterval(tick,100);
    const prevent=(event:BeforeUnloadEvent)=>{event.preventDefault();};
    window.addEventListener('beforeunload',prevent);
    return()=>{clearInterval(timer);window.removeEventListener('beforeunload',prevent);};
  },[phase]);

  async function save(session:Session){
    setSaving(true);setError('');
    try{await onSave(session);setSaved(true);}catch(e){setError((e as Error).message);}finally{setSaving(false);}
  }
  function finish(){
    const r=run.current;if(!r.active)return;r.active=false;onBusy(false);
    const session:Session={id:crypto.randomUUID(),timestamp:new Date().toISOString(),game:'mental-math',difficulty,
      score:r.correct,correct:r.correct,errors:r.errors,accuracy:r.correct/Math.max(1,r.correct+r.errors),
      avgResponseMs:r.times.length?r.times.reduce((a,b)=>a+b,0)/r.times.length:0,duration:config.duration,config:structuredClone(config)};
    setResult(session);setPhase('result');void save(session);
  }
  finishRef.current=finish;
  function start(){
    if(!validMentalConfig(config)){setError('Choose at least one topic and keep each setting within its displayed limits.');return;}
    const now=performance.now();run.current={active:true,deadline:now+config.duration*1000,questionStart:now,correct:0,errors:0,times:[],reviewing:false};
    setQuestion(nextVariedProblem(config));setAnswer('');setReview(null);setScore(0);setRemaining(config.duration);setError('');setSaved(false);setPhase('play');onBusy(true);
  }
  function next(){
    if(!run.current.active)return;
    if(performance.now()>=run.current.deadline){finish();return;}
    run.current.reviewing=false;run.current.questionStart=performance.now();
    setQuestion(nextVariedProblem(config));setAnswer('');setReview(null);setError('');
  }
  function submit(skip=false){
    const r=run.current;if(!r.active||r.reviewing)return;
    if(performance.now()>=r.deadline){finish();return;}
    if(!skip&&parseMentalAnswer(answer,question)===null){setError('Enter a number, or press Escape to skip.');return;}
    const correct=!skip&&mentalAnswerCorrect(answer,question);
    if(correct){r.correct++;r.times.push(performance.now()-r.questionStart);setScore(r.correct);}else r.errors++;
    r.reviewing=true;setError('');setReview({correct,explanation:question.explanation});
  }
  function edit(nextConfig:MentalConfig){setConfig(nextConfig);setDifficulty('Custom');}

  if(phase==='play')return <main className="play mental-play">
    <div className="playbar"><span>TRADING MENTAL MATH</span><span className={remaining<=10?'danger':''}>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')} <small>remaining</small></span><span>{score} <small>correct</small></span></div>
    <div className="timertrack"><div style={{width:`${remaining/config.duration*100}%`}}/></div>
    <div className="problem mental-problem">
      <p className="eyebrow">{topicLabels[question.topic as keyof typeof topicLabels]} · {difficulty}</p>
      <h1>{question.prompt}</h1><p className="hint">{question.hint}</p>
      <form onSubmit={e=>{e.preventDefault();if(review)next();else submit();}}>
        {!review?<><div className="answerwithunit"><input ref={input} aria-label="Your answer" autoFocus autoComplete="off" inputMode="decimal" value={answer} onChange={e=>setAnswer(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();submit(true);}}}/>{question.unit&&<span>{question.unit}</span>}</div><button className="primary" type="submit">Check answer ↵</button></>:
          <div className="review" role="status"><p className={review.correct?'correct':'danger'}>{review.correct?'Correct.':'Not quite.'} {question.answer}{question.unit}</p><p className="explanation">{review.explanation}</p><button ref={nextButton} type="submit" className="primary">Next problem ↵</button></div>}
      </form>
      {error&&<p className="danger" role="alert">{error}</p>}
      <p className="hint"><kbd>enter</kbd> {review?'next problem':'check answer'} · <kbd>esc</kbd> skip<br/>The timer continues while reviewing answers.</p>
    </div>
  </main>;

  if(phase==='result'&&result)return <main className="result">
    <p className="eyebrow">SESSION COMPLETE · TRADING MENTAL MATH</p><h1>Sharper with numbers.</h1>
    <div className="bigscore">{result.score}<span>correct answers</span></div>
    <div className="metrics"><div><strong>{Math.round(result.accuracy*100)}%</strong><span>Accuracy</span></div><div><strong>{(result.avgResponseMs/1000).toFixed(2)}s</strong><span>Avg. correct response</span></div><div><strong>{result.errors}</strong><span>Incorrect + skipped</span></div></div>
    <p className="muted">{saving?'Saving session…':saved?'Session saved.':'Session not yet saved.'}</p>
    {error&&<p role="alert" className="danger">{error} <button disabled={saving} onClick={()=>save(result)}>Retry save</button></p>}
    <button className="primary" disabled={!saved} onClick={start}>Practice again ↗</button> <button disabled={!saved} onClick={()=>setPhase('setup')}>Adjust settings</button>
    <p><a href="#/history">View progress →</a></p>
  </main>;

  return <main>
    <div className="pageheading"><div><p className="eyebrow">02 / FOUNDATION</p><h1>Trading mental math</h1><p className="muted">Percentages, fractions and growth. At a glance.</p></div><a className="textlink" href="#/">← All modes</a></div>
    <div className="setupgrid"><section className="panel">
      <h2>Your session</h2><label className="fieldlabel">Difficulty</label>
      <div className="segmented">{(['Easy','Medium','Hard','Custom'] as Difficulty[]).map(d=><button key={d} aria-pressed={difficulty===d} className={difficulty===d?'selected':''} onClick={()=>{setDifficulty(d);if(d!=='Custom')setConfig(structuredClone(mentalDefaults[d]));}}>{d}</button>)}</div>
      <fieldset className="topics"><legend>Topics</legend>{mentalTopics.map(topic=><label key={topic}><input type="checkbox" checked={config.topics.includes(topic)} onChange={e=>edit({...config,topics:e.target.checked?[...config.topics,topic]:config.topics.filter(t=>t!==topic)})}/>{topicLabels[topic as keyof typeof topicLabels]}</label>)}</fieldset>
      {settings.map(({key,label,min,max,step})=><label className="mental-setting" key={key}><span>{label}<small>{min.toLocaleString()}–{max.toLocaleString()}</small></span><input aria-label={label} type="number" min={min} max={max} step={step||1} value={config[key]} onChange={e=>edit({...config,[key]:Number(e.target.value)})}/></label>)}
      {error&&<p className="danger" role="alert">{error}</p>}<button className="primary full" onClick={start}>Start practice <span>↗</span></button>
    </section><aside><section className="panel"><p className="eyebrow">THE RULES</p><h2>Read. Calculate. Commit.</h2><p className="muted">Press Enter to submit an answer, then review the calculation. Each correct answer earns one point.</p><div className="rule"><kbd>enter</kbd><span>Submit / next problem</span></div><div className="rule"><kbd>esc</kbd><span>Skip a problem</span></div><p className="hint">Rounding and estimate tolerance appear on each question. Percentage changes can be negative. Simple interest asks for interest earned; compounding asks for the final balance.</p></section>
      <section className="panel presets"><h2>Saved presets</h2>{presets.length?<select aria-label="Load preset" value="" onChange={e=>{const p=presets.find(p=>p.id===e.target.value);if(p)edit(structuredClone(p.config));}}><option value="">Choose a preset</option>{presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>:<p className="muted">Keep your preferred topic mix and settings.</p>}
        <form onSubmit={async e=>{e.preventDefault();if(!validMentalConfig(config)){setError('Fix the session settings before saving.');return;}setPresetSaving(true);try{await onPreset({id:crypto.randomUUID(),game:'mental-math',name:presetName.trim(),config:structuredClone(config)});setPresetName('');setError('');}catch(e){setError((e as Error).message);}finally{setPresetSaving(false);}}}><input aria-label="Preset name" placeholder="Preset name" maxLength={60} required value={presetName} onChange={e=>setPresetName(e.target.value)}/><button disabled={!presetName.trim()||presetSaving}>{presetSaving?'Saving…':'Save'}</button></form>
      </section></aside></div>
  </main>;
}

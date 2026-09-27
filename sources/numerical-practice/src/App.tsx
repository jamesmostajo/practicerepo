import {useCallback,useEffect,useRef,useState} from 'react';
import {games,streak} from '../shared/model.mjs';
import {api} from './lib/api';
import type {Data,Config,MentalConfig,DiceConfig,CardConfig,FermiConfig,EventConfig,TradingConfig,ProbabilityConfig,SeriesConfig,TwentyFourConfig,Preset,Session} from './lib/types';
import Arithmetic from './games/Arithmetic';
import MentalMath from './games/MentalMath';
import DiceGame from './games/DiceGame';
import CardGame from './games/CardGame';
import FermiGame from './games/FermiGame';
import EventGame from './games/EventGame';
import TradingGame from './games/TradingGame';
import ProbabilityGame from './games/ProbabilityGame';
import SeriesGame from './games/SeriesGame';
import TwentyFourGame from './games/TwentyFourGame';
import {calibrationBins} from '../shared/events.mjs';
import {tutorials} from './components/tutorials';
import GuidePage from './components/GuidePage';
import MarketBasics from './components/MarketBasics';

const marketGames=['dice','cards','events','trading'];
const mean=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
const performanceValue=(session:Session)=>session.game==='fermi'?(session.averageScore??session.score/(session.rounds||1)):['cards','events'].includes(session.game)?session.score:(session.pnl??session.score/session.duration*60);
const signed=(value:number)=>`${value>=0?'+':''}${value.toFixed(2)}`;

function Spark({values,large=false,digits=2}:{values:number[];large?:boolean;digits?:number}){
 if(!values.length)return <div className={large?'chart emptychart':'emptyline'}>{large?'Complete a session to see your progress.':'No sessions yet'}</div>;
 const min=values.reduce((a,b)=>Math.min(a,b),Infinity),max=values.reduce((a,b)=>Math.max(a,b),-Infinity);
 const x=(i:number)=>values.length===1?150:i/(values.length-1)*300;
 const y=(v:number)=>65-(v-min)/(max-min||1)*50;
 return <div className={large?'chartcontainer':'sparkcontainer'}><svg className={large?'chart':'spark'} viewBox="0 0 300 80" role="img" aria-label={`Session trend: ${values.map(v=>v.toFixed(digits)).join(', ')}`}>
  <path d="M0 70H300" stroke="var(--border)"/>
  <polyline points={values.map((v,i)=>`${x(i)},${y(v)}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2"/>
  {values.map((v,i)=><circle key={i} cx={x(i)} cy={y(v)} r="3" fill="var(--accent)"/>)}
 </svg>{large&&<p className="chartcaption"><span>Range: {min.toFixed(digits)} to {max.toFixed(digits)}</span><span>Oldest → latest</span></p>}</div>;
}

export default function App(){
 const [route,setRoute]=useState(location.hash.slice(1)||'/');
 const [data,setData]=useState<Data|null>(null);
 const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false);const [filter,setFilter]=useState('arithmetic');const [tier,setTier]=useState('All');
 const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('basis-theme')||'dark';}catch{return 'dark';}});
 useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem('basis-theme',theme);}catch{/* Theme still works when storage is disabled. */}},[theme]);
 useEffect(()=>{const handler=()=>setRoute(location.hash.slice(1)||'/');window.addEventListener('hashchange',handler);api().then(setData).catch(e=>setError(e.message));return()=>window.removeEventListener('hashchange',handler);},[]);
 const discarded=useRef(false);
 const onBusy=useCallback((value:boolean)=>{if(value)discarded.current=false;setBusy(value);},[]);
 function exitGame(){discarded.current=true;setBusy(false);setRoute('/');location.hash='/';}
 const sessions=data?.sessions||[];
 const ordered=[...sessions].sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
 const drills=sessions.filter(s=>!marketGames.includes(s.game)&&s.game!=='fermi');
 const markets=sessions.filter(s=>marketGames.includes(s.game));
 const selected=ordered.filter(s=>s.game===filter&&(tier==='All'||s.difficulty===tier));
 const market=marketGames.includes(filter);const cards=filter==='cards';const fermi=filter==='fermi';const events=filter==='events';const trading=filter==='trading';
 const recent=selected.slice(-10),earlier=selected.slice(-20,-10);
 const change=recent.length&&earlier.length?mean(recent.map(performanceValue))-mean(earlier.map(performanceValue)):null;
 const overall=route==='/stats',history=route==='/history';
 async function onSave(session:Session){if(discarded.current)throw Error('Session discarded.');setData(await api('sessions',session));setFilter(session.game);}
 async function onPreset(preset:Preset){setData(await api('presets',preset));}
 async function exportData(){
  try{const fresh=await api();const url=URL.createObjectURL(new Blob([JSON.stringify(fresh,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`basis-progress-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError((e as Error).message);}
 }
 function focusText(){
  if(!sessions.length)return 'Complete your first session to establish a baseline.';
  const practiced=games.map(game=>({game,sessions:sessions.filter(s=>s.game===game.id)})).filter(x=>x.sessions.length);
  const weakestDrill=practiced.filter(x=>!marketGames.includes(x.game.id)&&x.game.id!=='fermi').sort((a,b)=>mean(a.sessions.map(s=>s.accuracy))-mean(b.sessions.map(s=>s.accuracy)))[0];
  const weakestMarket=practiced.filter(x=>marketGames.includes(x.game.id)&&x.game.id!=='cards').sort((a,b)=>mean(a.sessions.map(s=>s.pnl??0))-mean(b.sessions.map(s=>s.pnl??0)))[0];
  const eventSessions=sessions.filter(s=>s.game==='events');const eventCount=eventSessions.reduce((sum,s)=>sum+(s.rounds??0),0);
  const cardSessions=sessions.filter(s=>s.game==='cards');const fermiSessions=sessions.filter(s=>s.game==='fermi');
  return <>{weakestDrill&&<p className="muted">{weakestDrill.game.name} · {Math.round((1-mean(weakestDrill.sessions.map(s=>s.accuracy)))*100)}% average error rate, highest among practiced drills.</p>}{weakestMarket&&<p className="muted">{weakestMarket.game.name} · {signed(mean(weakestMarket.sessions.map(s=>s.pnl??0)))} average net P&L, lowest among practiced P&L games. Compare similar difficulty and session lengths.</p>}{cardSessions.length>0&&<p className="muted">Card market taking · {signed(mean(cardSessions.map(s=>s.score)))} average captured edge · {Math.round(mean(cardSessions.map(s=>s.accuracy))*100)}% optimal decisions.</p>}{fermiSessions.length>0&&<p className="muted">Fermi estimation · {mean(fermiSessions.map(performanceValue)).toFixed(1)} average points per question · {Math.round(mean(fermiSessions.map(s=>s.accuracy))*100)}% interval hit rate.</p>}{eventCount>0&&<p className="muted">Event forecasts · {(eventSessions.reduce((sum,s)=>sum+(s.brier??0)*(s.rounds??0),0)/eventCount).toFixed(4)} Brier over {eventCount} events. Lower is better; a constant 50% forecast scores 0.2500.</p>}</>;
 }

 return <>
  {!busy&&__PARENT_SITE_URL__&&<div className="site-return"><a href={__PARENT_SITE_URL__}>← Main site</a></div>}
  {!busy&&<header><a className="brand" href="#/"><span className="brandmark">b.</span>basis<span className="brandmeta">QUANT PRACTICE</span></a><nav><a className={route==='/'?'active':''} href="#/">Practice</a><a className={history?'active':''} href="#/history">History</a><a className={overall?'active':''} href="#/stats">Overview</a><a className={route.startsWith('/guide')?'active':''} href={`#/guide/${Object.hasOwn(tutorials,route.split('/')[2])?route.split('/')[2]:'basics'}/${Object.hasOwn(tutorials,route.split('/')[2])?'walkthrough':'start'}`}>Guide</a></nav><button className="theme" aria-label={`Switch to ${theme==='dark'?'light':'dark'} mode`} onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?'☼':'◐'}</button></header>}
  {busy&&<div className="game-exit-bar"><button onClick={exitGame} aria-describedby="discard-session-note">← Exit to dashboard</button><span id="discard-session-note">Exit discards this session. Progress won’t be saved.</span></div>}
  {error&&<div className="banner" role="alert">{error} <button onClick={()=>{setError('');api().then(setData).catch(e=>setError(e.message));}}>Retry connection</button></div>}
  {!data?<main><h1>{error?(__STATIC_BUILD__?'Storage unavailable':'Connection unavailable'):'Loading your practice space…'}</h1></main>:
   (route==='/guide'||route.startsWith('/guide/basics'))?<MarketBasics route={route}/>:route.startsWith('/guide')?<GuidePage route={route}/>:route==='/play/arithmetic'?<Arithmetic presets={data.presets.filter(p=>p.game==='arithmetic') as Preset<Config>[]} onSave={onSave} onPreset={onPreset} onBusy={onBusy}/>:
   route==='/play/mental-math'?<MentalMath presets={data.presets.filter(p=>p.game==='mental-math') as Preset<MentalConfig>[]} onSave={onSave} onPreset={onPreset} onBusy={onBusy}/>:
   route==='/play/dice'?<DiceGame presets={data.presets.filter(p=>p.game==='dice') as Preset<DiceConfig>[]} onSave={onSave} onPreset={onPreset} onBusy={onBusy}/>:
   route==='/play/cards'?<CardGame presets={data.presets.filter(p=>p.game==='cards') as Preset<CardConfig>[]} onSave={onSave} onPreset={onPreset} onBusy={onBusy}/>:route==='/play/fermi'?<FermiGame presets={data.presets.filter(p=>p.game==='fermi') as Preset<FermiConfig>[]} onSave={onSave} onPreset={onPreset} onBusy={onBusy}/>:route==='/play/events'?<EventGame presets={data.presets.filter(p=>p.game==='events') as Preset<EventConfig>[]} onSave={onSave} onPreset={onPreset} onBusy={onBusy}/>:route==='/play/trading'?<TradingGame presets={data.presets.filter(p=>p.game==='trading') as Preset<TradingConfig>[]} onSave={onSave} onPreset={onPreset} onBusy={onBusy}/>:route==='/play/ev'?<ProbabilityGame presets={data.presets.filter(p=>p.game==='ev') as Preset<ProbabilityConfig>[]} onSave={onSave} onPreset={onPreset} onBusy={onBusy}/>:route==='/play/series'?<SeriesGame presets={data.presets.filter(p=>p.game==='series') as Preset<SeriesConfig>[]} onSave={onSave} onPreset={onPreset} onBusy={onBusy}/>:route==='/play/twenty-four'?<TwentyFourGame presets={data.presets.filter(p=>p.game==='twenty-four') as Preset<TwentyFourConfig>[]} onSave={onSave} onPreset={onPreset} onBusy={onBusy}/>:history||overall?<main>
    <div className="pageheading"><div><p className="eyebrow">YOUR PRACTICE, OVER TIME</p><h1>{overall?'The bigger picture.':'Session history.'}</h1></div><div className="actions"><button onClick={exportData}>Export JSON ↓</button><label className="button">Import JSON ↑<input className="visuallyhidden" type="file" accept=".json,application/json" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>10*1024*1024)throw Error('Backup exceeds 10 MB.');const next=await api('import',JSON.parse(await file.text()));setData(next);setNotice('Backup merged. Existing sessions were preserved.');setError('');}catch(e){setError((e as Error).message);}e.target.value='';}}/></label></div></div>
    {__STATIC_BUILD__&&<p className="storage-note">Progress stays in this browser on this device. Export JSON for backup or to move between devices; clearing site data removes it.</p>}
    {notice&&<p role="status">{notice}</p>}
    {overall&&<><div className="statstrip"><Stat value={sessions.length} label="Total sessions"/><Stat value={`${streak(sessions)} days`} label="Current streak"/><Stat value={drills.length?`${Math.round(mean(drills.map(s=>s.accuracy))*100)}%`:'—'} label="Drill accuracy"/><Stat value={markets.length?signed(markets.reduce((n,s)=>n+(s.pnl??0),0)):'—'} label="Total market net P&L"/><Stat value={`${Math.round(sessions.reduce((n,s)=>n+s.duration,0)/60)} min`} label="Time practiced"/></div><section className="panel"><h2>Focus for your next session</h2>{focusText()}</section></>}
    <div className="filters"><select aria-label="Game history" value={filter} onChange={e=>setFilter(e.target.value)}>{games.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select><select aria-label="Difficulty history" value={tier} onChange={e=>setTier(e.target.value)}>{['All','Easy','Medium','Hard','Custom'].map(t=><option key={t}>{t}</option>)}</select><span className="muted">{selected.length} sessions</span></div>
    <div className="chartgrid"><section className="panel"><h2>{events?'Combined score':fermi?'Points per question':cards?'Captured expected edge':market?'Net realized P&L':'Score per minute'}</h2><p className="hint">{change===null?'Trend appears after 11 sessions.':`${change>=0?'+':''}${change.toFixed(2)} vs. the preceding sessions · latest 10`}</p><Spark values={selected.map(performanceValue)} large/>{market&&<p className="hint">{events?'Net P&L plus calibration adjustment.':cards?'Expected edge, independent of the card draws.':'After penalties.'} Compare sessions with the same round count and difficulty.</p>}</section><section className="panel"><h2>{trading?'Optimal taking decisions (%)':events?'Brier score · lower is better':fermi?'Interval hit rate (%)':cards?'Optimal decisions (%)':market?'Fill rate (%)':'Accuracy (%)'}</h2><p className="hint">{trading?'Taking decisions with maximum expected edge / rounds. Timeouts count as incorrect.':events?'Mean (forecast − outcome)², on a 0–1 scale. Constant 50% baseline: 0.25.':fermi?'Intervals containing the target / all questions. Timeouts count as misses.':cards?'Decisions maximizing expected edge / all rounds. Timeouts are incorrect.':market?'Rounds with a fill / total rounds. More fills do not guarantee better P&L.':'Correct / (correct + missed checks + skips)'}</p><Spark values={selected.map(s=>events?(s.brier??0):(market&&!cards&&!trading?(s.fillRate??0):s.accuracy)*100)} large digits={events?4:2}/></section></div>
    {events&&<EventCalibration sessions={selected}/>}
    {trading&&<div className="chartgrid"><section className="panel"><h2>Passive net P&L</h2><p className="hint">Quoting results after quote timeout charges.</p><Spark values={selected.map(s=>s.passivePnl??0)} large/></section><section className="panel"><h2>Active net P&L</h2><p className="hint">Taking results after taking timeout charges.</p><Spark values={selected.map(s=>s.activePnl??0)} large/></section></div>}
    <section className="panel"><h2>Personal bests · {games.find(g=>g.id===filter)?.name}</h2><div className="metrics">{['Easy','Medium','Hard','Custom'].map(d=>{const values=ordered.filter(s=>s.game===filter&&s.difficulty===d).map(performanceValue);const best=values.reduce((a,b)=>Math.max(a,b),-Infinity);return <Stat key={d} label={d} value={!values.length?'—':fermi?`${best.toFixed(1)}/100`:market?signed(best):`${best.toFixed(1)}/min`}/>;})}</div></section>
    <div className="tablewrap"><table><thead><tr><th>Date</th><th>Difficulty</th><th>{trading?'Net / passive / active':events?'Score / net P&L':fermi?'Avg / total points':cards?'Captured edge':market?'Net P&L':'Score'}</th><th>{events?'Brier / adjustment':fermi?'Hit rate / avg width':cards?'Realized P&L / optimal':market?'Gross / penalties':'Accuracy'}</th>{market&&<th>Fills / {trading?'stages':events?'visits':'rounds'}</th>}<th>Avg. response</th><th>Duration</th></tr></thead><tbody>{[...selected].reverse().map(s=><tr key={s.id}><td>{new Date(s.timestamp).toLocaleString()}</td><td>{s.difficulty}</td><td>{trading?`${signed(s.pnl??0)} / ${signed(s.passivePnl??0)} / ${signed(s.activePnl??0)}`:events?`${signed(s.score)} / ${signed(s.pnl??0)}`:fermi?`${performanceValue(s).toFixed(1)} / ${s.score.toFixed(2)}`:cards?signed(s.score):market?signed(s.pnl??0):s.score}</td><td>{events?`${(s.brier??0).toFixed(4)} / ${signed(s.calibrationBonus??0)}`:fermi?`${Math.round(s.accuracy*100)}% / ${s.averageRelativeWidth==null?'—':(s.averageRelativeWidth*100).toFixed(1)+'%'}`:cards?`${signed(s.pnl??0)} / ${Math.round(s.accuracy*100)}%`:market?`${signed(s.grossPnl??0)} / ${(s.penalties??0).toFixed(2)}`:`${Math.round(s.accuracy*100)}%`}</td>{market&&<td>{s.fills??0} / {trading?2*(s.rounds??0):events?(s.traderVisits??0):(s.rounds??0)}</td>}<td>{(s.avgResponseMs/1000).toFixed(2)}s</td><td>{Math.round(s.duration)}s</td></tr>)}</tbody></table>{!selected.length&&<p className="empty">No sessions here yet. Your first one sets the baseline.</p>}</div>
   </main>:
   route==='/'?<main>
    <div className="pageheading"><div><p className="eyebrow">THE DAILY PRACTICE</p><h1>Keep your edge.</h1><p className="muted">A clear head. A few minutes. A little progress.</p></div><div className="streak"><span>↗</span><strong>{streak(sessions)}</strong><small>day streak</small></div></div>
    <div className="summary"><span><b>{sessions.length}</b> sessions completed</span><span><b>{drills.reduce((n,s)=>n+s.correct,0)}</b> correct answers</span><span>{__STATIC_BUILD__?'Saved in this browser':'Local & private'}</span></div>
    <div className="sectionheading"><h2>Choose your practice</h2><span className="muted">{String(games.filter(g=>g.available).length).padStart(2,'0')} / {games.length} modes ready</span></div>
    <div className="gamegrid">{games.map((g,i)=>{
     const ss=ordered.filter(s=>s.game===g.id);const isMarket=marketGames.includes(g.id);
     const best=ss.map(performanceValue).reduce((a,b)=>Math.max(a,b),-Infinity);
     const body=<><div className="cardtop"><span className="gameicon">{g.icon}</span><span className={g.available?'tag ready':'tag'}>{g.available?'READY':'UPCOMING'}</span></div><p className="eyebrow">{g.category} <span> / {String(i+1).padStart(2,'0')}</span></p><h2>{g.name}</h2><p className="description">{g.description}</p><div className="cardstats"><div><span>{g.id==='events'?'BEST SCORE':g.id==='fermi'?'BEST AVG':g.id==='cards'?'BEST EDGE':isMarket?'BEST P&L':'BEST / MIN'}</span><strong>{ss.length?(isMarket?signed(best):best.toFixed(1)):'—'}</strong></div><div><span>STREAK</span><strong>{streak(ss)}<small> days</small></strong></div><Spark values={ss.slice(-12).map(performanceValue)}/></div><div className="cardfoot">{g.available?'Start practicing':'Coming in the next builds'}<span>{g.available?'↗':'·'}</span></div></>;
     return g.available?<a key={g.id} className="gamecard available" href={`#/play/${g.id}`}>{body}</a>:<article key={g.id} className="gamecard upcoming">{body}</article>;
    })}</div><footer>Built for deliberate practice.<span>No accounts. No distractions.</span></footer>
   </main>:<main><h1>Mode not available yet.</h1><a href="#/">Back to practice</a></main>}
 </>;
}
function Stat({value,label}:{value:string|number;label:string}){return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;}

function EventCalibration({sessions}:{sessions:Session[]}){
 const forecasts=sessions.flatMap(s=>s.forecasts||[]);const bins=calibrationBins(forecasts);
 const weightedBrier=forecasts.length?forecasts.reduce((sum,f)=>sum+(f.probability-f.outcome)**2,0)/forecasts.length:null;
 return <div className="chartgrid"><section className="panel"><h2>Net realized P&L</h2><p className="hint">Trading results after timeout charges; excludes the calibration adjustment.</p><Spark values={sessions.map(s=>s.pnl??0)} large/></section>
 <section className="panel"><h2>Forecast calibration</h2><p className="calibration-note">{forecasts.length} events · weighted Brier {weightedBrier===null?'—':weightedBrier.toFixed(4)}. Small bins are noisy; compare average forecasts with observed YES frequency.</p><div className="tablewrap"><table><thead><tr><th>Forecast bin</th><th>Count</th><th>Avg. forecast</th><th>YES rate</th></tr></thead><tbody>{bins.map(bin=><tr key={bin.label}><td>{bin.label}</td><td>{bin.count}</td><td>{bin.averageForecast===null?'—':`${(bin.averageForecast*100).toFixed(1)}%`}</td><td>{bin.observedFrequency===null?'—':`${(bin.observedFrequency*100).toFixed(1)}%`}</td></tr>)}</tbody></table></div><p className="calibration-note">Uses the current difficulty filter. Timeout defaults (50%) are included. Brier measures overall probability accuracy, not calibration alone.</p></section></div>;
}

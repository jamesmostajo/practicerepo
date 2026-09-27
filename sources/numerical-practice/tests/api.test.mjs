import {twentyFourDefaults} from '../shared/twenty-four.mjs';
import {seriesDefaults} from '../shared/series.mjs';
import {probabilityDefaults} from '../shared/probability.mjs';
import {tradingDefaults} from '../shared/trading.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {defaults} from '../shared/model.mjs';
import {mentalDefaults} from '../shared/mental.mjs';
import {diceDefaults} from '../shared/dice.mjs';
import {cardDefaults} from '../shared/cards.mjs';
import {eventDefaults} from '../shared/events.mjs';
import {fermiDefaults} from '../shared/fermi.mjs';

test('local API saves, deduplicates, validates imports and rejects foreign origins',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'basis-api-'));
 const child=spawn(process.execPath,['server/index.mjs','--production'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'15173',DATA_FILE:path.join(dir,'progress.json')},stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Server did not start')),10000);child.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(timeout);resolve();}});child.on('error',reject);child.on('exit',code=>{clearTimeout(timeout);reject(Error('Server exited: '+code));});});
  const request=(route,body,extra={})=>fetch('http://localhost:15173/api/'+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...extra},body:body===undefined?undefined:JSON.stringify(body)});
  assert.equal((await (await request('progress')).json()).sessions.length,0);
  const session={id:'test-session',game:'arithmetic',timestamp:new Date().toISOString(),difficulty:'Medium',score:10,correct:10,errors:2,accuracy:10/12,avgResponseMs:1250,duration:120,config:defaults.Medium};
  assert.equal((await request('sessions',session)).status,200);
  assert.equal((await (await request('sessions',session)).json()).sessions.length,1);
  const backup=await (await request('progress')).json();
  assert.equal((await (await request('import',backup)).json()).sessions.length,1);
  assert.equal((await request('import',{...backup,version:99})).status,400);
  assert.equal((await (await request('progress')).json()).sessions.length,1);
  assert.equal((await request('sessions',{...session,id:'bad',accuracy:9})).status,400);
  assert.equal((await request('sessions',session,{Origin:'https://example.com'})).status,403);
  assert.equal((await request('presets',{id:'p',name:'My preset',game:'arithmetic',config:defaults.Easy})).status,200);
  assert.equal((await (await request('progress')).json()).presets.length,1);
  assert.equal((await request('sessions',{...session,id:'mental-session',game:'mental-math',config:mentalDefaults.Medium})).status,200);
  assert.equal((await request('presets',{id:'mental-preset',name:'Fractions',game:'mental-math',config:{...mentalDefaults.Easy,topics:['fraction']}})).status,200);
  const mixed=await (await request('progress')).json();
  assert.equal(mixed.sessions.length,2);assert.equal(mixed.presets.length,2);
  assert.equal((await request('import',mixed)).status,200);
  assert.equal((await (await request('progress')).json()).sessions.length,2);
  const dice={...session,id:'dice-session',game:'dice',config:{...diceDefaults.Easy,rounds:3},correct:3,errors:0,accuracy:1,
    score:2,pnl:2,grossPnl:2.5,penalties:0.5,fills:1,rounds:3,maxInventory:1,fillRate:1/3};
  assert.equal((await request('sessions',dice)).status,200);
  assert.equal((await request('presets',{id:'dice-preset',name:'Dice warmup',game:'dice',config:diceDefaults.Easy})).status,200);
  const all=await (await request('progress')).json();
  assert.equal(all.sessions.length,3);assert.equal(all.presets.length,3);
  assert.equal((await request('import',all)).status,200);
  assert.equal((await request('sessions',{...dice,id:'bad-dice',grossPnl:999})).status,400);
  const cards={...session,id:'card-session',game:'cards',config:{...cardDefaults.Easy,rounds:3},correct:2,errors:1,accuracy:2/3,
    score:2,capturedEdge:2,availableEdge:5,missedEdge:3,pnl:-3,fills:2,rounds:3,fillRate:2/3};
  assert.equal((await request('sessions',cards)).status,200);
  assert.equal((await request('presets',{id:'card-preset',name:'Card warmup',game:'cards',config:cardDefaults.Easy})).status,200);
  const four=await (await request('progress')).json();assert.equal(four.sessions.length,4);assert.equal(four.presets.length,4);
  assert.equal((await request('import',four)).status,200);
  assert.equal((await (await request('progress')).json()).sessions.length,4);
  assert.equal((await request('sessions',{...cards,id:'bad-cards',missedEdge:0})).status,400);
  const fermi={...session,id:'fermi-session',game:'fermi',config:{...fermiDefaults.Easy,rounds:3},correct:2,errors:1,accuracy:2/3,
    score:150,averageScore:50,rounds:3,answered:3,averageRelativeWidth:0.4};
  assert.equal((await request('sessions',fermi)).status,200);
  assert.equal((await request('presets',{id:'fermi-preset',name:'Estimation warmup',game:'fermi',config:fermiDefaults.Easy})).status,200);
  const five=await (await request('progress')).json();assert.equal(five.sessions.length,5);assert.equal(five.presets.length,5);
  assert.equal((await request('import',five)).status,200);
  assert.equal((await (await request('progress')).json()).sessions.length,5);
  assert.equal((await request('sessions',{...fermi,id:'bad-fermi',averageScore:100})).status,400);
  const events={...session,id:'event-session',game:'events',config:{...eventDefaults.Easy,rounds:3},correct:3,errors:0,accuracy:1,
    rounds:3,score:2,pnl:2,grossPnl:2,penalties:0,brier:0.25,calibrationBonus:0,traderVisits:9,fills:1,fillRate:1/9,
    forecasts:[1,0,1].map(outcome=>({probability:0.5,outcome,timedOut:false}))};
  assert.equal((await request('sessions',events)).status,200);
  assert.equal((await request('presets',{id:'event-preset',name:'Events warmup',game:'events',config:eventDefaults.Easy})).status,200);
  const six=await (await request('progress')).json();assert.equal(six.sessions.length,6);assert.equal(six.presets.length,6);
  assert.equal((await request('import',six)).status,200);
  assert.equal((await (await request('progress')).json()).sessions.length,6);
  assert.equal((await request('sessions',{...events,id:'bad-event',calibrationBonus:99})).status,400);
  const trading={...session,id:'trading-session',game:'trading',config:{...tradingDefaults.Easy,rounds:3},correct:2,errors:1,accuracy:2/3,
    rounds:3,score:2,pnl:2,passivePnl:4,activePnl:-2,grossPnl:3,penalties:1,quoteTimeouts:1,activeTimeouts:0,passiveFills:1,activeFills:2,fills:3,fillRate:0.5};
  assert.equal((await request('sessions',trading)).status,200);
  assert.equal((await request('presets',{id:'trading-preset',name:'Combined warmup',game:'trading',config:tradingDefaults.Easy})).status,200);
  const seven=await (await request('progress')).json();assert.equal(seven.sessions.length,7);assert.equal(seven.presets.length,7);
  assert.equal((await request('import',seven)).status,200);
  assert.equal((await (await request('progress')).json()).sessions.length,7);
  assert.equal((await request('sessions',{...trading,id:'bad-trading',activePnl:99})).status,400);
  const ev={...session,id:'ev-session',game:'ev',config:probabilityDefaults.Easy};
  assert.equal((await request('sessions',ev)).status,200);
  assert.equal((await request('presets',{id:'ev-preset',name:'Odds warmup',game:'ev',config:probabilityDefaults.Easy})).status,200);
  const eight=await (await request('progress')).json();assert.equal(eight.sessions.length,8);assert.equal(eight.presets.length,8);
  assert.equal((await request('import',eight)).status,200);
  assert.equal((await (await request('progress')).json()).sessions.length,8);
  assert.equal((await request('sessions',{...ev,id:'bad-ev',score:99})).status,400);
  const series={...session,id:'series-session',game:'series',config:seriesDefaults.Easy};
  assert.equal((await request('sessions',series)).status,200);
  assert.equal((await request('presets',{id:'series-preset',name:'Patterns warmup',game:'series',config:seriesDefaults.Easy})).status,200);
  const nine=await (await request('progress')).json();assert.equal(nine.sessions.length,9);assert.equal(nine.presets.length,9);
  assert.equal((await request('import',nine)).status,200);
  assert.equal((await (await request('progress')).json()).sessions.length,9);
  assert.equal((await request('sessions',{...series,id:'bad-series',score:99})).status,400);
  const twentyFour={...session,id:'twenty-four-session',game:'twenty-four',config:twentyFourDefaults.Easy};
  assert.equal((await request('sessions',twentyFour)).status,200);
  assert.equal((await request('presets',{id:'twenty-four-preset',name:'24 warmup',game:'twenty-four',config:twentyFourDefaults.Easy})).status,200);
  const ten=await (await request('progress')).json();assert.equal(ten.sessions.length,10);assert.equal(ten.presets.length,10);
  assert.equal((await request('import',ten)).status,200);
  assert.equal((await (await request('progress')).json()).sessions.length,10);
  assert.equal((await request('sessions',{...twentyFour,id:'bad-24',score:99})).status,400);
 }finally{child.kill();await new Promise(resolve=>child.once('exit',resolve));await rm(dir,{recursive:true,force:true});}
});

import {emptyData,validateData} from './model.mjs';
/** Same validated merge semantics as the local server; never replace prior progress. */
export function updateBrowserProgress(current,route,body){
 const data=validateData(current??emptyData());
 if(!route||route==='progress')return data;
 if(route==='sessions')return validateData({...data,sessions:data.sessions.some(s=>s.id===body?.id)?data.sessions:[...data.sessions,body]});
 if(route==='presets')return validateData({...data,presets:[...data.presets.filter(p=>p.id!==body?.id),body]});
 if(route==='import'){
  validateData(body);const sessions=new Set(data.sessions.map(s=>s.id)),presets=new Set(data.presets.map(p=>p.id));
  return validateData({...data,sessions:[...data.sessions,...body.sessions.filter(s=>!sessions.has(s.id))],presets:[...data.presets,...body.presets.filter(p=>!presets.has(p.id))]});
 }
 throw Error('Unsupported progress operation.');
}

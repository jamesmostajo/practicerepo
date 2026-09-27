import {browserApi} from './browserStore';
import type {Data} from './types';
export async function api(route='',body?:unknown):Promise<Data>{if(__STATIC_BUILD__)return browserApi(route,body);const res=await fetch('/api/'+(route||'progress'),body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw Error(data.error||'Could not reach local server.');return data;}

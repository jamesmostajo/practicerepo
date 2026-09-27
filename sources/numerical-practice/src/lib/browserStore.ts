import {updateBrowserProgress} from '../../shared/browser-progress.mjs';
import type {Data} from './types';
let connection:Promise<IDBDatabase>|undefined;
function open(){
 if(!connection)connection=new Promise<IDBDatabase>((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(Error('Browser storage is unavailable. Allow site storage to save progress.'));return;}
  // Scope to this installation path so sibling apps on one Pages domain remain separate.
  const path=new URL('.',location.href).pathname;
  const request=indexedDB.open(`basis-progress:${path}`,1);
  request.onupgradeneeded=()=>request.result.createObjectStore('progress');
  request.onerror=()=>reject(Error('Could not open browser storage. Check site storage permissions.'));
  request.onblocked=()=>reject(Error('Close other tabs of this app and retry storage access.'));
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();connection=undefined;};resolve(db);};
 }).catch(error=>{connection=undefined;throw error;});
 return connection;
}
export async function browserApi(route='',body?:unknown):Promise<Data>{
 const db=await open();return new Promise((resolve,reject)=>{
  const write=body!==undefined;const transaction=db.transaction('progress',write?'readwrite':'readonly'),store=transaction.objectStore('progress');
  let result:Data;let failure:Error|undefined;
  transaction.oncomplete=()=>resolve(result);
  transaction.onabort=()=>reject(failure||Error('Could not save browser progress. Storage may be full or disabled. Export a backup before clearing site data.'));
  transaction.onerror=()=>{failure=Error('Browser storage failed. Your existing progress has not been replaced.');};
  const request=store.get('data');
  request.onsuccess=()=>{try{result=updateBrowserProgress(request.result,route,body) as Data;if(write)store.put(result,'data');}catch(error){failure=error as Error;transaction.abort();}};
 });
}

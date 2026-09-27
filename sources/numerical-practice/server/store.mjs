import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {emptyData,validateData} from '../shared/model.mjs';
export function createStore(file){
 let queue=Promise.resolve();
 async function read(){try{return validateData(JSON.parse(await readFile(file,'utf8')));}catch(e){if(e.code==='ENOENT')return emptyData();throw e;}}
 function update(fn){const result=queue.then(async()=>{const data=validateData(await fn(await read()));await mkdir(path.dirname(file),{recursive:true});await writeFile(file+'.tmp',JSON.stringify(data,null,2));await rename(file+'.tmp',file);return data;});queue=result.catch(()=>{});return result;}
 return {read,update};
}

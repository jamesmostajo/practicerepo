import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {createStore} from './store.mjs';
import {validateData} from '../shared/model.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT||5173);
const store=createStore(process.env.DATA_FILE||path.join(root,'data/progress.json'));
const production=process.argv.includes('--production');
const vite=production?null:await (await import('vite')).createServer({root,server:{middlewareMode:true},appType:'spa'});
const server=http.createServer(async(req,res)=>{
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(req.url?.startsWith('/api/')){
  try{
   if(!['localhost','127.0.0.1','[::1]'].some(h=>req.headers.host===`${h}:${port}`))return send(403,{error:'Local requests only.'});
   if(req.headers.origin&&!['http://localhost:'+port,'http://127.0.0.1:'+port].includes(req.headers.origin))return send(403,{error:'Origin rejected.'});
   if(req.method==='GET'&&req.url==='/api/progress')return send(200,await store.read());
   if(req.method!=='POST')return send(404,{error:'Not found.'});
   if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON required.'});
   let raw='',size=0;for await(const chunk of req){size+=chunk.length;if(size>10*1024*1024)return send(413,{error:'Backup exceeds 10 MB.'});raw+=chunk;}
   const body=JSON.parse(raw);
   if(req.url==='/api/sessions')return send(200,await store.update(d=>({...d,sessions:d.sessions.some(s=>s.id===body.id)?d.sessions:[...d.sessions,body]})));
   if(req.url==='/api/presets')return send(200,await store.update(d=>({...d,presets:[...d.presets.filter(p=>p.id!==body.id),body]})));
   if(req.url==='/api/import'){validateData(body);return send(200,await store.update(d=>({...d,sessions:[...d.sessions,...body.sessions.filter(s=>!d.sessions.some(x=>x.id===s.id))],presets:[...d.presets,...body.presets.filter(p=>!d.presets.some(x=>x.id===p.id))]})));}
   return send(404,{error:'Not found.'});
  }catch(e){console.error(e.message);return send(400,{error:e.message||'Unable to save progress.'});}
 }
 if(vite)return vite.middlewares(req,res);
 try{const url=new URL(req.url,'http://localhost');const rel=decodeURIComponent(url.pathname).replace(/^\/+/, '');const candidate=path.resolve(root,'dist',rel);if(!candidate.startsWith(path.join(root,'dist')+path.sep)&&rel)throw Error();let file=candidate;if(!path.extname(rel))file=path.join(root,'dist/index.html');const data=await readFile(file);const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[ext]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Basis is ready at http://localhost:${port}`));
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,async()=>{await vite?.close();server.close(()=>process.exit(0));});

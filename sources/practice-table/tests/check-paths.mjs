import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../poker/',import.meta.url)),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(x=>x[1]).filter(x=>!x.includes(':')&&!['../','./'].includes(x));
const jsFiles=fs.readdirSync(root).filter(x=>x.endsWith('.js'));
for(const file of jsFiles){let source=fs.readFileSync(path.join(root,file),'utf8');refs.push(...[...source.matchAll(/from ['"]([^'"]+)['"]/g)].map(x=>x[1]));}
for(const base of ['https://example.github.io/poker/','https://example.github.io/my-repo/games/poker/']){
 for(const ref of refs){assert(!ref.startsWith('/'),'Root-absolute asset would lose project prefix');const resolved=new URL(ref,base);assert(resolved.href.startsWith(base));assert(fs.existsSync(path.join(root,ref)),ref+' missing');}
 assert.equal(new URL('../',base).pathname,base.includes('my-repo')?'/my-repo/games/':'/');
}
assert(!/<base\b/i.test(html));
assert(html.indexOf('./style.css')<html.indexOf('./theme.css'));
assert(html.indexOf('./theme.css')<html.indexOf('./responsive.css'));
assert(!/https:\/\/.*chatgpt\.site/.test(html));
console.log('Relative assets, module imports, stylesheet order, and parent links passed at root and nested project paths.');

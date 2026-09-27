import {readFileSync} from 'node:fs';
const site=JSON.parse(readFileSync(new URL('./site.config.json',import.meta.url),'utf8'));
export default ({mode})=>({
 base:mode==='pages'?'./':'/',
 define:{__STATIC_BUILD__:JSON.stringify(mode==='pages'),__PARENT_SITE_URL__:JSON.stringify(mode==='pages'?site.parentSiteUrl:'')},
 build:{outDir:mode==='pages'?'dist-static':'dist'}
});

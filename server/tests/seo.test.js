import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {resolveSeo,renderSeoHead,injectSeo,sitemapXml,ROBOTS,SITE_ORIGIN} from '../services/seo.js';

const id='6b05ea478f45378a9ed8dfaa';
const sources={event:async()=>null,content:async()=>null,news:async()=>null};
test('SEO static public pages use distinct titles and one stable canonical, including the events alias',async()=>{
 const home=await resolveSeo('/');
 const rankings=await resolveSeo('/rankings');
 assert.match(home.title,/קארדסקול.*חוגי פוקימון/);
 assert.notEqual(home.title,rankings.title);
 assert.equal(home.canonical,SITE_ORIGIN+'/');
 assert.equal((await resolveSeo('/events/')).canonical,SITE_ORIGIN+'/tournaments');
 const original=await readFile(new URL('../../index.html',import.meta.url),'utf8');
 const html=injectSeo(original,home);
 assert.equal((html.match(/<title>/g)||[]).length,1);
 assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
 assert.match(html,/application\/ld\+json/);
 assert.ok(html.includes('<div id="root"></div>'));
 assert.ok(!html.includes('bolt.new'));
});
test('SEO does not expose private routes, child names or unpublished content, and escapes metadata',async()=>{
 for (const path of ['/manage','/manage/teams/'+id,'/admin/users','/login','/dashboard','/all-stars/players/'+id,'/teams/'+id,'/tournaments/'+id,'/tournaments/'+id+'/register','/store','/not-a-page','/content/'+id,'/events/'+id,'/news/'+id]) {
   const meta=await resolveSeo(path,sources);
   assert.equal(meta.indexable,false,path);
   assert.equal(meta.canonical,undefined);
   assert.match(renderSeoHead(meta),/noindex, follow/);
 }
 const event=await resolveSeo('/events/'+id,{...sources,event:async()=>({title:'A "quoted" <script>alert(1)</script> & title',description:'<p>Hello</p>'})});
 assert.equal(event.indexable,true);
 assert.equal(event.canonical,SITE_ORIGIN+'/events/'+id);
 const html=renderSeoHead(event);
 assert.ok(!html.includes('<script>alert(1)</script>'));
 assert.ok(html.includes('&quot;quoted&quot;'));
 assert.ok(html.includes('&amp; title'));
});
test('sitemap lists published entities and excludes updates whose events are not public',()=>{
 const xml=sitemapXml({events:[{_id:'event'}],pages:[{_id:'content'}],updates:[{_id:'standalone'},{_id:'linked',eventId:'event'},{_id:'hidden',eventId:'draft'}]});
 for(const path of ['/','/tournaments','/rankings','/events/event','/content/content','/news/standalone','/news/linked'])assert.ok(xml.includes('<loc>'+SITE_ORIGIN+path+'</loc>'),path);
 assert.ok(!xml.includes('/news/hidden'));
 assert.ok(!xml.includes('/manage'));
 assert.ok(!xml.includes('/all-stars/players/'));
 assert.ok(!xml.includes('<loc>'+SITE_ORIGIN+'/events</loc>'));
 assert.ok(ROBOTS.includes('Sitemap: '+SITE_ORIGIN+'/sitemap.xml'));
 assert.ok(!ROBOTS.includes('Disallow: /manage'));
});

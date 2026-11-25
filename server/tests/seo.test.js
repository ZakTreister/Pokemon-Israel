import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import {defaultSiteSettings,navigationPages,validSocialUrl} from '../../shared/siteSettings.js';
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

// QR CI builds before running the server suite; verify the real Vite output too.
test('built HTML retains the SEO injection boundary when a build exists',async()=>{
 const file=new URL('../../dist/index.html',import.meta.url);
 if(!existsSync(file))return;
 const html=injectSeo(await readFile(file,'utf8'),await resolveSeo('/rankings'));
 assert.match(html,/<title>דירוג ליגת הפוקימון הישראלית \| קארדסקול<\/title>/);
 assert.ok(html.includes('rel="canonical" href="'+SITE_ORIGIN+'/rankings"'));
 assert.equal((html.match(/<title>/g)||[]).length,1);
});


test('fixed visibility and navigation settings are independent, aliases canonical and social URLs safe',async()=>{
 const settings=defaultSiteSettings();
 assert.deepEqual(navigationPages(settings,'menu').map(p=>p.to),['/rankings','/all-stars','/tournaments','/news','/store','/birthday']);
 settings.pages.find(p=>p.path==='/tournaments').active=false;
 settings.pages.find(p=>p.path==='/rankings').menu=false;
 assert.ok(!navigationPages(settings,'menu').some(p=>p.to==='/rankings'||p.to==='/tournaments'));
 assert.ok(navigationPages(settings,'footer').some(p=>p.to==='/rankings'));
 for(const path of ['/events','/EVENTS','/tournaments/'])assert.equal((await resolveSeo(path,sources,settings)).disabled,true);
 assert.equal((await resolveSeo('/rankings',sources,settings)).indexable,true);
 assert.ok(!sitemapXml({settings}).includes('<loc>'+SITE_ORIGIN+'/tournaments</loc>'));
 for(const url of ['javascript:alert(1)','http://instagram.com/a','https://instagram.com.evil.test/a','https://user:pass@instagram.com/a'])assert.equal(validSocialUrl('instagram',url),false);
 assert.equal(validSocialUrl('instagram','https://www.instagram.com/a/'),true);
});

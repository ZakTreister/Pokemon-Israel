import {getSiteSettings} from './siteSettings.js';
import {readFile} from 'node:fs/promises';
import {buildSitemap,injectSeo,noIndexSeo,resolveSeo,ROBOTS} from './seo.js';

// Independent of the API and of the React router; no redirects or changes to
// public/private authorization. A slow metadata lookup cannot block the SPA.
async function resolveWithin(path, timeoutMs=800) {
  let timer;
  try {
    return await Promise.race([
      getSiteSettings().then(settings=>resolveSeo(path,undefined,settings)),
      new Promise(resolve=>{timer=setTimeout(()=>resolve(noIndexSeo()),timeoutMs);}),
    ]);
  } catch {
    return noIndexSeo();
  } finally {
    clearTimeout(timer);
  }
}

export function registerSeoEndpoints(app) {
  app.get('/robots.txt',(_req,res)=>res.type('text/plain').send(ROBOTS));
  app.get('/sitemap.xml',async (_req,res)=>{
    try {
      const xml=await buildSitemap();
      res.set('Cache-Control','no-cache').type('application/xml').send(xml);
    } catch {
      res.status(503).type('text/plain').send('Sitemap temporarily unavailable');
    }
  });
}

export function createSpaSeoHandler(indexFile) {
  let template;
  return async (req,res)=>{
    const meta=await resolveWithin(req.path);
    res.set('Cache-Control','no-cache');
    if(meta.disabled)res.status(404);
    if(!meta.indexable) res.set('X-Robots-Tag','noindex, follow');
    try {
      template ||= await readFile(indexFile,'utf8');
      res.type('html').send(injectSeo(template,meta));
    } catch {
      // Preserve the pre-existing static-file fallback if the template cannot
      // be read. Do not advertise an incorrect canonical on a failed response.
      res.set('X-Robots-Tag','noindex, follow');
      res.sendFile(indexFile);
    }
  };
}

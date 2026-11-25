import Event from '../models/eventModel.js';
import ContentPage from '../models/contentPageModel.js';
import Update from '../models/updateModel.js';
import {defaultSiteSettings,pageActive} from '../../shared/siteSettings.js';
import {getSiteSettings} from './siteSettings.js';

export const SITE_ORIGIN = 'https://cardschool.co.il';
export const SITE_NAME = 'CardSchool – קארדסקול';
const LOGO = SITE_ORIGIN + '/pokemon_kids_logo.png';
export const HOME_TITLE = 'קארדסקול | חוגי פוקימון וליגת הפוקימון הישראלית';
export const HOME_DESCRIPTION = 'קארדסקול (CardSchool) – חוגי קלפי פוקימון לילדים, אירועים וטורנירים, דירוג הליגה הישראלית ונבחרות All Stars. הכירו את קהילת הפוקימון והצטרפו לחוג.';
const publicPages = {
  '/': [HOME_TITLE, HOME_DESCRIPTION],
  '/tournaments': ['אירועים וטורנירי פוקימון בישראל | קארדסקול', 'אירועי קארדסקול, טורנירי חוגי הפוקימון ומפגשי נבחרות All Stars. מועדים, פרטים ותוצאות.'],
  '/rankings': ['דירוג ליגת הפוקימון הישראלית | קארדסקול', 'הדירוג הארצי המצטבר של שחקני חוגי הפוקימון של קארדסקול ותוצאות הליגה.'],
  '/all-stars': ['נבחרות All Stars | קארדסקול', 'הכירו את נבחרות המתקדמים של קארדסקול ועקבו אחר מפגשי נבחרות הפוקימון.'],
  '/news': ['חדשות הפוקימון והליגה | קארדסקול', 'חדשות, עדכונים והכרזות מקהילת הפוקימון של קארדסקול.'],
  '/gallery': ['גלריית אירועי פוקימון | קארדסקול', 'תמונות וסרטונים מאירועי קארדסקול ומפעילות ליגת הפוקימון.'],
  '/deck-stats': ['סטטיסטיקות דקים בפוקימון | קארדסקול', 'נתוני דקים וסטטיסטיקות של משחקי קלפי פוקימון בליגה הישראלית.'],
};

const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const text = (value, limit) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit).trim();
const canonicalPath = path => {
  const normalized = path.replace(/\/+$/, '') || '/';
  if (normalized === '/events') return '/tournaments';
  if (normalized === '/index.html') return '/';
  return normalized;
};
const excluded = () => ({title: SITE_NAME, description: HOME_DESCRIPTION, indexable:false});
const publicMeta = (path, title, description) => ({
  title, description, indexable:true, canonical:SITE_ORIGIN+path,
});

async function publishedEvent(id) {
  return Event.findOne({_id:id,status:'published'}).select('title description').lean().maxTimeMS(600);
}
async function publishedContent(id) {
  return ContentPage.findOne({_id:id,status:'published'}).select('title subtitle bodyHtml').lean().maxTimeMS(600);
}
async function publishedNews(id) {
  const update=await Update.findById(id).select('title content eventId').lean().maxTimeMS(600);
  if (!update) return null;
  if (update.eventId && !await Event.exists({_id:update.eventId,status:'published'}).maxTimeMS(600)) return null;
  return update;
}

// Only explicitly approved public routes can be indexed. Child profiles, team
// roster/details, individual tournament results, QR, admin and unknown routes
// are deliberately excluded in the first SEO phase.
export async function resolveSeo(path, sources = {
  event:publishedEvent, content:publishedContent, news:publishedNews,
}, settings=defaultSiteSettings()) {
  const normalized = canonicalPath(path);
  if(!pageActive(settings,normalized))return {...excluded(),disabled:true};
  if (Object.hasOwn(publicPages, normalized)) return publicMeta(normalized,...publicPages[normalized]);
  const match = /^\/(events|content|news)\/([a-f0-9]{24})$/i.exec(normalized);
  if (!match || !['events','content','news'].includes(match[1])) return excluded();
  const [,kind,id] = match;
  const entity = await sources[kind === 'events' ? 'event' : kind](id);
  if (!entity) return excluded();
  const title = text(entity.title, 100) || 'קארדסקול';
  const description = text(entity.description || entity.subtitle || entity.content || entity.bodyHtml, 170) || HOME_DESCRIPTION;
  return publicMeta('/'+kind+'/'+id.toLowerCase(), title+' | קארדסקול', description);
}

export const noIndexSeo = excluded;

export function renderSeoHead(meta) {
  const tags = [
    '<title>'+escape(meta.title)+'</title>',
    '<meta name="description" content="'+escape(meta.description)+'" />',
    '<meta name="robots" content="'+(meta.indexable ? 'index, follow' : 'noindex, follow')+'" />',
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="'+escape(SITE_NAME)+'" />',
    '<meta property="og:locale" content="he_IL" />',
    '<meta property="og:title" content="'+escape(meta.title)+'" />',
    '<meta property="og:description" content="'+escape(meta.description)+'" />',
    '<meta property="og:image" content="'+LOGO+'" />',
    '<meta name="twitter:card" content="summary" />',
    '<meta name="twitter:title" content="'+escape(meta.title)+'" />',
    '<meta name="twitter:description" content="'+escape(meta.description)+'" />',
    '<meta name="twitter:image" content="'+LOGO+'" />',
  ];
  if (meta.indexable && meta.canonical) {
    tags.push('<link rel="canonical" href="'+escape(meta.canonical)+'" />');
    tags.push('<meta property="og:url" content="'+escape(meta.canonical)+'" />');
  }
  if (meta.canonical === SITE_ORIGIN+'/') {
    const organization={'@context':'https://schema.org','@type':'Organization',name:'CardSchool',alternateName:'קארדסקול',url:SITE_ORIGIN+'/',logo:LOGO};
    const website={'@context':'https://schema.org','@type':'WebSite',name:'קארדסקול',alternateName:'CardSchool',url:SITE_ORIGIN+'/'};
    tags.push('<script type="application/ld+json">'+JSON.stringify(organization)+'</script>');
    tags.push('<script type="application/ld+json">'+JSON.stringify(website)+'</script>');
  }
  return tags.join('\n    ');
}

export function injectSeo(html, meta) {
  const marker = /<!--\s*seo:start\s*-->[\s\S]*?<!--\s*seo:end\s*-->/;
  if (!marker.test(html)) throw new Error('Missing SEO template markers');
  return html.replace(marker, () =>
    '<!-- seo:start -->\n    '+renderSeoHead(meta)+'\n    <!-- seo:end -->');
}

export const ROBOTS = 'User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: '+SITE_ORIGIN+'/sitemap.xml\n';

export function sitemapXml({events=[],pages=[],updates=[],settings=defaultSiteSettings()}={}) {
  const ids = new Set(events.map(event=>String(event._id)));
  const paths = [...Object.keys(publicPages).filter(path=>pageActive(settings,path)),
    ...events.map(event=>'/events/'+String(event._id)),
    ...pages.map(page=>'/content/'+String(page._id)),
    ...updates.filter(update=>!update.eventId||ids.has(String(update.eventId))).map(update=>'/news/'+String(update._id))];
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
    [...new Set(paths)].map(path=>'  <url><loc>'+escape(SITE_ORIGIN+path)+'</loc></url>').join('\n')+'\n</urlset>\n';
}
export async function buildSitemap() {
  const [events,pages,updates,settings] = await Promise.all([
    Event.find({status:'published'}).select('_id').lean(),
    ContentPage.find({status:'published'}).select('_id').lean(),
    Update.find({}).select('_id eventId').lean(),
    getSiteSettings(),
  ]);
  return sitemapXml({events,pages,updates,settings});
}

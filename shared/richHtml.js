// Shared restricted rich HTML grammar. Do not permit arbitrary CSS or attributes.
const tags=new Set(['p','h2','h3','h4','strong','b','em','i','u','ul','ol','li','blockquote','a','br','hr','span','div','img']);
const voidTags=new Set(['br','hr','img']);
const alignmentTags=new Set(['p','h2','h3','h4','blockquote','li']);
const alignment=['align-center','align-right','align-left'];
const visibility=['mobile-only','desktop-only'];
const classGroups={
  div:new Set([...alignment,...visibility,'layout-2-col','layout-3-col','content-card','content-highlight']),
  img:new Set([...alignment,'image-small','image-medium','image-full']),
  a:new Set(['cta-button']),
};
export function escapeRichText(value) {
  return String(value).replace(/&(?!(?:amp|lt|gt|quot|apos|nbsp|#\d{1,7}|#x[\da-f]{1,6});)/gi,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function linkUrl(input){
  const url=input.replace(/&amp;/g,'&').trim();
  if(!url||/[\s\u0000-\u001f\u007f\\<>"]/u.test(url)||url.length>2000)throw new Error('קישור לא תקין');
  if(/^\/(?!\/)/.test(url)||/^#[\w-]+$/.test(url))return url;
  if(!/^https?:\/\//i.test(url))throw new Error('קישור חייב להיות HTTP, HTTPS או נתיב מקומי');
  let parsed;
  try{parsed=new URL(url)}catch{throw new Error('קישור לא תקין')}
  if(!['http:','https:'].includes(parsed.protocol)||!parsed.hostname||parsed.username||parsed.password)throw new Error('קישור לא תקין');
  return url;
}
function imageUrl(input){
  const url=linkUrl(input);
  if(!/^https:\/\//i.test(url))throw new Error('כתובת תמונה חייבת להתחיל ב-HTTPS');
  const parsed=new URL(url);
  if(!/\.(?:jpe?g|png|webp)$/i.test(parsed.pathname))throw new Error('יש להשתמש בכתובת תמונה מסוג JPEG, PNG או WebP');
  return url;
}
function readAttributes(source){
  const attrs=new Map();
  let remaining=source;
  while(remaining.trim()){
    const match=/^\s+([a-z][a-z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(remaining);
    if(!match)throw new Error('מאפייני HTML אינם תקינים');
    const name=match[1].toLowerCase();
    if(attrs.has(name))throw new Error('מאפיין HTML כפול');
    attrs.set(name,match[2]??match[3]);remaining=remaining.slice(match[0].length);
  }
  return attrs;
}
export function sanitizeRichHtml(input){
  if(typeof input!=='string'||input.length>50000)throw new Error('תוכן HTML לא תקין או ארוך מדי');
  const parts=input.match(/<[^>]*>|[^<]+|</g)||[];
  const stack=[],output=[];
  for(const part of parts){
    if(!part.startsWith('<')){output.push(escapeRichText(part));continue;}
    let match=part.match(/^<\/([a-z0-9]+)\s*>$/i);
    if(match){
      const tag=match[1].toLowerCase();
      if(!tags.has(tag)||voidTags.has(tag)||stack.pop()!==tag)throw new Error('תגיות HTML אינן מאוזנות או אינן נתמכות');
      output.push('</'+tag+'>');continue;
    }
    match=part.match(/^<([a-z0-9]+)((?:\s[\s\S]*?)?)\s*(\/?)>$/i);
    if(!match)throw new Error('HTML לא נתמך');
    const tag=match[1].toLowerCase();
    if(!tags.has(tag)||(match[3]&&!voidTags.has(tag)))throw new Error('תגית HTML אינה נתמכת');
    const attrs=readAttributes(match[2]);
    const allowed=new Set([...(classGroups[tag]?['class']:[]),...(tag==='a'?['href']:[]),...(tag==='img'?['src','alt']:[]),...(alignmentTags.has(tag)?['style','align']:[])]);
    for(const name of attrs.keys())if(!allowed.has(name))throw new Error('מאפיין HTML אינו נתמך: '+name);
    let out='<'+tag;
    if(tag==='a'){
      if(stack.includes('a')||!attrs.has('href'))throw new Error('קישור לא תקין');
      out+=' href="'+linkUrl(attrs.get('href')).replace(/&/g,'&amp;')+'"';
    }
    if(tag==='img'){
      if(!attrs.has('src'))throw new Error('כתובת תמונה חסרה');
      const alt=escapeRichText(attrs.get('alt')??'');
      if(alt.length>1000)throw new Error('תיאור התמונה ארוך מדי');
      out+=' src="'+imageUrl(attrs.get('src')).replace(/&/g,'&amp;')+'" alt="'+alt+'"';
    }
    if(attrs.has('class')){
      const classes=attrs.get('class').trim().split(/\s+/);
      if(classes.some(c=>!classGroups[tag].has(c))||new Set(classes).size!==classes.length)throw new Error('מחלקת CSS אינה נתמכת');
      for(const group of [alignment,visibility,['layout-2-col','layout-3-col'],['image-small','image-medium','image-full']]){
        if(classes.filter(c=>group.includes(c)).length>1)throw new Error('מחלקות CSS סותרות');
      }
      out+=' class="'+classes.join(' ')+'"';
    }
    if(attrs.has('style')||attrs.has('align')){
      if(attrs.has('style')&&attrs.has('align'))throw new Error('יישור כפול');
      const align=attrs.has('style')?/^text-align:\s*(center|right|left);?$/i.exec(attrs.get('style'))?.[1]:/^(center|right|left)$/i.exec(attrs.get('align'))?.[1];
      if(!align)throw new Error('סגנון HTML אינו נתמך');
      out+=' style="text-align: '+align.toLowerCase()+'"';
    }
    output.push(out+'>');if(!voidTags.has(tag))stack.push(tag);
  }
  if(stack.length)throw new Error('יש לסגור את כל תגיות ה-HTML');
  const result=output.join('');if(result.length>50000)throw new Error('תוכן HTML ארוך מדי');return result;
}

// Empty editor scaffolding is not a mobile override; images and rules count as content.
export function hasRichContent(html){
 return typeof html==='string'&&(/<(?:img|hr)(?:\s|>)/i.test(html)||!!html.replace(/<[^>]*>/g,'').replace(/&(?:nbsp|#160|#x0*a0);/gi,' ').trim());
}

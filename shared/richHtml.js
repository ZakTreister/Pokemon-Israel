// Deliberately restricted HTML grammar. Never return untrusted tags or attributes.
// Reject unsupported HTML instead of attempting to parse arbitrary browser markup.
const tags=new Set(['p','h2','h3','h4','strong','b','em','i','u','ul','ol','li','blockquote','a','br','hr','span','div','img']);
const voidTags=new Set(['br','hr','img']);
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
export function sanitizeRichHtml(input){
  if(typeof input!=='string'||input.length>50000)throw new Error('תוכן HTML לא תקין או ארוך מדי');
  const parts=input.match(/<[^>]*>|[^<]+|</g)||[];
  const stack=[];
  const output=[];
  for(const part of parts){
    if(!part.startsWith('<')){output.push(escapeRichText(part));continue;}
    let match=part.match(/^<\/([a-z0-9]+)\s*>$/i);
    if(match){
      const tag=match[1].toLowerCase();
      if(!tags.has(tag)||voidTags.has(tag)||stack.pop()!==tag)throw new Error('תגיות HTML אינן מאוזנות או אינן נתמכות');
      output.push('</'+tag+'>');continue;
    }
    match=part.match(/^<img\s+src\s*=\s*(?:"([^"]*)"|'([^']*)')(?:\s+alt\s*=\s*(?:"([^"]*)"|'([^']*)'))?\s*\/?>$/i);
    if(match){
      const url=linkUrl(match[1]??match[2]);
      if(!/^https:\/\//i.test(url)&&!/^\/(?!\/)/.test(url))throw new Error('תמונה חייבת להשתמש ב-HTTPS או בנתיב מקומי');
      const alt=escapeRichText(match[3]??match[4]??'');
      if(alt.length>1000)throw new Error('תיאור התמונה ארוך מדי');
      output.push('<img src="'+url.replace(/&/g,'&amp;')+'" alt="'+alt+'">');continue;
    }
    match=part.match(/^<div\s+class\s*=\s*(?:"(mobile-only|desktop-only)"|'(mobile-only|desktop-only)')\s*>$/);
    if(match){
      output.push('<div class="'+(match[1]??match[2])+'">');stack.push('div');continue;
    }
    match=part.match(/^<a\s+href\s*=\s*(?:"([^"]*)"|'([^']*)')\s*>$/i);
    if(match){
      if(stack.includes('a'))throw new Error('אין לקנן קישורים');
      output.push('<a href="'+linkUrl(match[1]??match[2]).replace(/&/g,'&amp;')+'">');stack.push('a');continue;
    }
    match=part.match(/^<(p|h2|h3|h4|blockquote|li)\s+(?:style\s*=\s*(?:"text-align:\s*(center|right|left);?"|'text-align:\s*(center|right|left);?')|align\s*=\s*(?:"(center|right|left)"|'(center|right|left)'))\s*>$/i);
    if(match){
      const tag=match[1].toLowerCase(),align=(match[2]||match[3]||match[4]||match[5]).toLowerCase();
      output.push('<'+tag+' style="text-align: '+align+'">');stack.push(tag);continue;
    }
    match=part.match(/^<([a-z0-9]+)\s*(\/?)>$/i);
    if(match){
      const tag=match[1].toLowerCase();
      if(!tags.has(tag)||['a','img','div'].includes(tag)||(match[2]&&!voidTags.has(tag)))throw new Error('תגית HTML אינה נתמכת');
      output.push('<'+tag+'>');if(!voidTags.has(tag))stack.push(tag);continue;
    }
    throw new Error('HTML לא נתמך: יש להסיר סקריפטים, מאפיינים וסגנונות');
  }
  if(stack.length)throw new Error('יש לסגור את כל תגיות ה-HTML');
  const result=output.join('');if(result.length>50000)throw new Error('תוכן HTML ארוך מדי');return result;
}

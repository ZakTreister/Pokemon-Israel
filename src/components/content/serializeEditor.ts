import { escapeRichText, sanitizeRichHtml } from '../../../shared/richHtml.js';

const tags = new Set(['p', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote', 'a', 'span']);
const blocks = new Set(['div', 'p', 'h2', 'h3', 'h4', 'ul', 'ol', 'blockquote']);
const discarded = new Set(['script', 'style', 'iframe', 'object', 'embed', 'img', 'svg', 'video', 'audio', 'template']);

// Browser editing commands can emit divs, fonts and spans with style attributes.
// Convert to the existing restricted HTML grammar; never serialize arbitrary attributes.
export function serializeEditor(root: HTMLElement): string {
  const serialize = (node: Node): string => {
    if (node.nodeType === 3) return escapeRichText((node.textContent ?? '').replace(/&/g, '&amp;'));
    if (node.nodeType !== 1) return '';
    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (discarded.has(tag)) return '';
    if (tag === 'br' || tag === 'hr') return '<' + tag + '>';
    let content = Array.from(node.childNodes).map(serialize).join('');
    if (tag === 'a') {
      const href = element.getAttribute('href');
      if (!href) return content;
      return '<a href="' + escapeRichText(href.replace(/&/g, '&amp;')) + '">' + content + '</a>';
    }
    const align = (element.style.textAlign || element.getAttribute('align') || '').toLowerCase();
    const attr = ['center','right','left'].includes(align) ? ' style="text-align: '+align+'"' : '';
    if (tag === 'div') {
      if (Array.from(element.children).some(child => blocks.has(child.tagName.toLowerCase()))) {
        // Browser commands may wrap selected paragraphs in an aligned div.
        return attr ? content.replace(/<(p|h2|h3|h4|blockquote|li)(?: style="text-align: (?:center|right|left)")?>/g, '<$1'+attr+'>') : content;
      }
      return '<p'+attr+'>' + content + '</p>';
    }
    if (tag === 'span' || tag === 'font') {
      const style = element.style;
      if (style.fontWeight === 'bold' || Number(style.fontWeight) >= 600) content = '<strong>' + content + '</strong>';
      if (style.fontStyle === 'italic') content = '<em>' + content + '</em>';
      if (style.textDecorationLine.includes('underline') || style.textDecoration.includes('underline')) content = '<u>' + content + '</u>';
      return content;
    }
    return tags.has(tag) ? '<' + tag + (['p','h2','h3','h4','blockquote','li'].includes(tag)?attr:'') + '>' + content + '</' + tag + '>' : content;
  };
  return sanitizeRichHtml(Array.from(root.childNodes).map(serialize).join(''));
}

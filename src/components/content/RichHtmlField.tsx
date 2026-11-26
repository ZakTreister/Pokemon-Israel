import { useEffect, useId, useRef, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Link2, Unlink, Quote, Undo2, Redo2, AlignCenter, AlignRight, ImagePlus, Smartphone, Monitor } from 'lucide-react';
import { escapeRichText, sanitizeRichHtml } from '../../../shared/richHtml.js';
import Button from '../ui/Button';
import SafeHtml from './SafeHtml';
import { richHtmlClassName } from './richHtmlStyles';
import { serializeEditor } from './serializeEditor';

type Props = { value: string; onChange: (value: string) => void; label?: string };
const actions = [
  { command: 'undo', label: 'בטל פעולה', Icon: Undo2 },
  { command: 'redo', label: 'שחזר פעולה', Icon: Redo2 },
  { command: 'bold', label: 'הדגשה', Icon: Bold },
  { command: 'italic', label: 'כתב נטוי', Icon: Italic },
  { command: 'underline', label: 'קו תחתון', Icon: Underline },
  { command: 'justifyCenter', label: 'מרכז טקסט', Icon: AlignCenter },
  { command: 'justifyRight', label: 'יישור לימין', Icon: AlignRight },
  { command: 'insertUnorderedList', label: 'רשימת תבליטים', Icon: List },
  { command: 'insertOrderedList', label: 'רשימה ממוספרת', Icon: ListOrdered },
  { command: 'unlink', label: 'הסר קישור', Icon: Unlink },
] as const;

export default function RichHtmlField({ value, onChange, label = 'תוכן' }: Props) {
  const id = useId();
  const editor = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const lastValue = useRef<string | null>(null);
  const [mode, setMode] = useState<'visual' | 'source'>(() => {
    try { sanitizeRichHtml(value); return 'visual'; } catch { return 'source'; }
  });
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [imageUrl,setImageUrl]=useState<string|null>(null);
  const [imageAlt,setImageAlt]=useState('');
  const [error, setError] = useState('');

  // Do not overwrite the live DOM on every keystroke: that loses selection and undo history.
  useEffect(() => {
    if (mode !== 'visual' || !editor.current || lastValue.current === value) return;
    try {
      editor.current.innerHTML = sanitizeRichHtml(value);
      lastValue.current = value;
      savedRange.current = null;
    } catch {
      setMode('source');
      setError('יש לתקן את קוד ה-HTML לפני מעבר לעריכה ויזואלית.');
    }
  }, [value, mode]);

  const rememberSelection = () => {
    const selection = editor.current?.ownerDocument.getSelection();
    if (selection?.rangeCount && editor.current?.contains(selection.getRangeAt(0).commonAncestorContainer)) {
      savedRange.current = selection.getRangeAt(0).cloneRange();
    }
  };
  const restoreSelection = () => {
    const node = editor.current;
    if (!node) return false;
    node.focus();
    const selection = node.ownerDocument.getSelection();
    if (selection && savedRange.current && node.contains(savedRange.current.commonAncestorContainer)) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
    return true;
  };
  const publish = () => {
    const node = editor.current;
    if (!node) return;
    try {
      const html = serializeEditor(node);
      lastValue.current = html;
      onChange(html);
      setError('');
      rememberSelection();
    } catch (e) {
      // Keep the parent value and visible editor consistent if a browser operation exceeds the limit.
      node.innerHTML = sanitizeRichHtml(lastValue.current ?? '');
      savedRange.current = null;
      setError(e instanceof Error ? e.message : 'לא ניתן לעדכן את התוכן');
    }
  };
  const command = (name: string, argument?: string) => {
    if (!restoreSelection()) return;
    const doc = editor.current!.ownerDocument;
    try {
      doc.execCommand('styleWithCSS', false, 'false');
      doc.execCommand('defaultParagraphSeparator', false, 'p');
      if (!doc.execCommand(name, false, argument)) {
        setError('הפעולה אינה זמינה במיקום זה או בדפדפן הנוכחי.');
        return;
      }
      publish();
    } catch {
      setError('הפעולה אינה נתמכת בדפדפן הנוכחי.');
    }
  };
  const switchMode = (next: 'visual' | 'source') => {
    if (next === mode) return;
    if (next === 'visual') {
      try {
        const html = sanitizeRichHtml(value);
        onChange(html);
        lastValue.current = null;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'HTML לא תקין');
        return;
      }
    }
    setLinkUrl(null);
    setImageUrl(null);
    savedRange.current = null;
    setError('');
    setMode(next);
  };
  const openLink = () => {
    rememberSelection();
    const range = savedRange.current;
    if (!range || range.collapsed || !editor.current?.contains(range.commonAncestorContainer)) {
      setError('יש לסמן את הטקסט שברצונך להפוך לקישור.');
      return;
    }
    const element = range.startContainer.nodeType === 1 ? range.startContainer as Element : range.startContainer.parentElement;
    const anchor = element?.closest('a');
    setImageUrl(null);
    setLinkUrl(anchor?.getAttribute('href') ?? '');
    setError('');
  };
  const applyLink = () => {
    if (linkUrl === null) return;
    try {
      const url = linkUrl.trim();
      sanitizeRichHtml('<a href="' + escapeRichText(url) + '">קישור</a>');
      if (!savedRange.current || savedRange.current.collapsed) throw new Error('יש לסמן טקסט לקישור.');
      command('createLink', url);
      setLinkUrl(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'קישור לא תקין');
    }
  };

  const openImage=()=>{
    rememberSelection();
    setLinkUrl(null);
    setImageUrl('');
    setImageAlt('');
    setError('');
  };
  const applyImage=()=>{
    if(imageUrl===null||!editor.current)return;
    try{
      const attr=(input:string)=>escapeRichText(input.replace(/&/g,'&amp;'));
      const html=sanitizeRichHtml('<img src="'+attr(imageUrl.trim())+'" alt="'+attr(imageAlt)+'">');
      const node=editor.current;
      const doc=node.ownerDocument;
      const selection=doc.getSelection();
      const range=savedRange.current?.cloneRange()??doc.createRange();
      if(!savedRange.current||!node.contains(range.commonAncestorContainer)){
        range.selectNodeContents(node);
        range.collapse(false);
      }
      range.collapse(false);
      const template=doc.createElement('template');
      template.innerHTML=html;
      const image=template.content.firstChild!;
      range.insertNode(image);
      range.setStartAfter(image);
      range.collapse(true);
      node.focus();
      selection?.removeAllRanges();
      selection?.addRange(range);
      publish();
      setImageUrl(null);
    }catch(e){setError(e instanceof Error?e.message:'כתובת תמונה לא תקינה');}
  };
  const addDeviceBlock=(visibility:'mobile-only'|'desktop-only')=>{
    const node=editor.current;
    if(!node)return;
    const doc=node.ownerDocument;
    const block=doc.createElement('div');
    block.className=visibility;
    const paragraph=doc.createElement('p');
    paragraph.textContent=visibility==='mobile-only'?'תוכן למובייל':'תוכן לדסקטופ';
    block.append(paragraph);
    const after=doc.createElement('p');
    after.append(doc.createElement('br'));
    node.append(block,after);
    node.focus();
    const range=doc.createRange();
    range.selectNodeContents(paragraph);
    const selection=doc.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    publish();
  };

  return (
    <div className="space-y-2" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span id={id} className="font-bold">{label}</span>
        <div className="flex gap-1" aria-label="מצב עריכת תוכן">
          <Button type="button" size="sm" contextual variant={mode === 'visual' ? 'secondary' : 'outline'} aria-pressed={mode === 'visual'} onClick={() => switchMode('visual')}>עריכה ויזואלית</Button>
          <Button type="button" size="sm" contextual variant={mode === 'source' ? 'secondary' : 'outline'} aria-pressed={mode === 'source'} onClick={() => switchMode('source')}>HTML</Button>
        </div>
      </div>
      {mode === 'visual' ? (
        <div className="border rounded-md bg-card">
          <div role="group" aria-label="עיצוב תוכן" className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
            <select aria-label="סוג פסקה" value="" className="border rounded p-2 bg-card" onChange={e => command('formatBlock', e.target.value)} onMouseDown={rememberSelection}>
              <option value="" disabled>סוג פסקה</option>
              <option value="p">פסקה</option>
              <option value="h2">כותרת 2</option>
              <option value="h3">כותרת 3</option>
              <option value="h4">כותרת 4</option>
            </select>
            {actions.map(({ command: name, label, Icon }) => (
              <Button key={name} type="button" variant="ghost" size="icon" aria-label={label} title={label} onMouseDown={e => e.preventDefault()} onClick={() => command(name)}><Icon size={18}/></Button>
            ))}
            <Button type="button" variant="ghost" size="icon" aria-label="הוסף או ערוך קישור" title="הוסף או ערוך קישור" onMouseDown={e => e.preventDefault()} onClick={openLink}><Link2 size={18}/></Button>
            <Button type="button" variant="ghost" size="icon" aria-label="ציטוט" title="ציטוט" onMouseDown={e => e.preventDefault()} onClick={() => command('formatBlock', 'blockquote')}><Quote size={18}/></Button>
            <Button type="button" variant="ghost" size="icon" aria-label="הוסף תמונה" title="הוסף תמונה" onMouseDown={e=>e.preventDefault()} onClick={openImage}><ImagePlus size={18}/></Button>
            <Button type="button" variant="ghost" size="icon" aria-label="מובייל בלבד" title="הוסף אזור למובייל בלבד" onMouseDown={e=>e.preventDefault()} onClick={()=>addDeviceBlock('mobile-only')}><Smartphone size={18}/></Button>
            <Button type="button" variant="ghost" size="icon" aria-label="דסקטופ בלבד" title="הוסף אזור לדסקטופ בלבד" onMouseDown={e=>e.preventDefault()} onClick={()=>addDeviceBlock('desktop-only')}><Monitor size={18}/></Button>
          </div>
          {imageUrl!==null&&<div className="flex flex-wrap items-end gap-2 p-2 border-b">
            <label className="flex-1 min-w-40">כתובת תמונה<input autoFocus type="text" maxLength={2000} dir="ltr" className="block w-full border rounded p-2 bg-card" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();applyImage();}if(e.key==='Escape'){e.preventDefault();setImageUrl(null);restoreSelection();}}}/></label>
            <label className="flex-1 min-w-40">טקסט חלופי לתמונה<input type="text" maxLength={500} className="block w-full border rounded p-2 bg-card" value={imageAlt} onChange={e=>setImageAlt(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();applyImage();}}}/></label>
            <Button type="button" size="sm" disabled={!imageUrl.trim()} onClick={applyImage}>הוסף תמונה</Button>
            <Button type="button" size="sm" variant="outline" onClick={()=>{setImageUrl(null);restoreSelection();}}>ביטול</Button>
          </div>}
          {linkUrl !== null && <div className="flex flex-wrap items-end gap-2 p-2 border-b">
            <label className="flex-1 min-w-40">כתובת הקישור<input autoFocus type="text" maxLength={2000} dir="ltr" className="block w-full border rounded p-2 bg-card" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } if (e.key === 'Escape') { e.preventDefault(); setLinkUrl(null); restoreSelection(); } }}/></label>
            <Button type="button" size="sm" onClick={applyLink}>החל</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => { setLinkUrl(null); restoreSelection(); }}>ביטול</Button>
          </div>}
          <div ref={editor} role="textbox" aria-labelledby={id} aria-multiline="true" contentEditable suppressContentEditableWarning dir="rtl" className={richHtmlClassName + ' cs-rich-html-editor min-h-48 p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'} onInput={publish} onKeyUp={rememberSelection} onMouseUp={rememberSelection} onBlur={rememberSelection} onPaste={e => { e.preventDefault(); rememberSelection(); command('insertText', e.clipboardData.getData('text/plain')); }} onDrop={e => e.preventDefault()} onClick={e => { if ((e.target as Element).closest('a')) e.preventDefault(); }}/>
        </div>
      ) : (
        <textarea aria-labelledby={id} maxLength={50000} rows={10} className="block w-full border rounded-md p-3 bg-card font-mono text-sm" dir="ltr" value={value} onChange={e => { onChange(e.target.value); setError(''); }}/>
      )}
      <p className="text-xs text-muted-foreground">סמנו טקסט להוספת קישור. תמונה ניתן להוסיף באמצעות כתובת HTTPS או נתיב מקומי. כפתורי המכשירים מוסיפים בסוף התוכן אזורים למובייל (עד 680px) ולדסקטופ (מעל 680px); שני האזורים גלויים בעריכה. סרטונים מוסיפים באזור המדיה.</p>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {mode === 'source' && value && <details className="border rounded p-3"><summary className="cursor-pointer">תצוגה מקדימה</summary><SafeHtml html={value}/></details>}
    </div>
  );
}

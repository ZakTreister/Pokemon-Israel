import {useState} from 'react';
import {escapeRichText,sanitizeRichHtml} from '../../../shared/richHtml.js';
import Button from '../ui/Button';
import SafeHtml from './SafeHtml';
export default function RichHtmlField({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const [text,setText]=useState(''),[url,setUrl]=useState(''),[error,setError]=useState('');
 const addLink=()=>{
  try{
   if(!text.trim()||!url.trim())throw new Error('יש להזין מלל וקישור');
   const link=sanitizeRichHtml('<a href="'+escapeRichText(url)+'">'+escapeRichText(text)+'</a>');
   onChange(value+link);setText('');setUrl('');setError('');
  }catch(e){setError(e instanceof Error?e.message:'קישור לא תקין')}
 };
 return <div className="space-y-2"><label className="block font-bold">תוכן (HTML)<textarea maxLength={50000} rows={8} className="block w-full border rounded-md p-3 bg-card font-mono text-sm" dir="auto" value={value} onChange={e=>onChange(e.target.value)}/></label>
 <p className="text-xs text-muted-foreground">אפשר להוסיף מלל, כותרות, הדגשה, רשימות וקישורים. סקריפטים, תמונות בקוד וסגנונות חופשיים אינם נתמכים.</p>
 <div className="grid gap-2 sm:grid-cols-2"><label>מלל הקישור<input className="block w-full border rounded p-2 bg-card" value={text} onChange={e=>setText(e.target.value)}/></label><label>כתובת הקישור<input className="block w-full border rounded p-2 bg-card" dir="ltr" value={url} onChange={e=>setUrl(e.target.value)}/></label></div>
 <Button type="button" variant="outline" size="sm" onClick={addLink}>הוסף קישור לתוכן</Button>{error&&<p role="alert" className="text-destructive">{error}</p>}
 {value&&<details className="border rounded p-3"><summary className="cursor-pointer">תצוגה מקדימה</summary><SafeHtml html={value}/></details>}</div>;
}

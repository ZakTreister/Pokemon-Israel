import {useEffect,useState,useId} from 'react';
import {badgeProgramService,type BadgeProgram} from '../badgeProgramService';
import ImageUpload from '../../../components/ui/ImageUpload';
import FormField from '../../../components/ui/FormField';
import Button from '../../../components/ui/Button';
import {Card,CardContent,CardHeader,CardTitle} from '../../../components/ui/Card';
import {requestError} from '../../../utils/requestError';

export default function BadgeProgramEditor(){
 const [record,setRecord]=useState<BadgeProgram|null>(null),[description,setDescription]=useState(''),[image,setImage]=useState(''),[imageUploadId,setImageUploadId]=useState<string|null|undefined>(),[uploading,setUploading]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 const id=useId();
 useEffect(()=>{let active=true;badgeProgramService.get().then(data=>{if(active){setRecord(data);setDescription(data.description||'');setImage(data.image||'');}}).catch(e=>{if(active)setError(requestError(e));});return()=>{active=false};},[]);
 const save=async()=>{
  if(!record||saving||uploading)return;
  setSaving(true);setError('');setSaved(false);
  try{const data=await badgeProgramService.save({description,imageUploadId});setRecord(data);setDescription(data.description);setImage(data.image);setImageUploadId(undefined);setSaved(true);}
  catch(e){setError(requestError(e));}finally{setSaving(false);}
 };
 return <Card className="mb-8"><CardHeader><CardTitle>הסבר על מערך התגים</CardTitle></CardHeader><CardContent className="space-y-3">
 <p className="text-sm text-muted-foreground">התיאור והתמונה יוצגו באזור ״תגים״ בעמוד All Stars.</p>
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 {!record&&!error&&<p role="status">טוען...</p>}
 {record&&<><FormField label="תיאור מערך התגים" htmlFor={id}><textarea id={id} rows={5} maxLength={5000} className="w-full p-2 border rounded-md bg-background" value={description} disabled={saving} onChange={e=>{setDescription(e.target.value);setSaved(false);}}/></FormField>
 <ImageUpload purpose="badge-program-image" entityId={record.id} label="תמונת מערך התגים" value={image} disabled={saving||uploading} onBusyChange={setUploading} onChange={value=>{setImage(value?.url||'');setImageUploadId(value?.uploadId??null);setSaved(false);}}/>
 <Button type="button" disabled={saving||uploading} onClick={()=>void save()}>{saving?'שומר...':'שמור הסבר תגים'}</Button>{saved&&<p role="status">ההסבר נשמר</p>}</>}
 </CardContent></Card>;
}

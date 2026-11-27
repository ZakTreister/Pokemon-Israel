const types=new Set(['image/jpeg','image/png','image/webp']);
const MAX_BYTES=5*1024*1024;
export async function optimizeInlineImage(file:File):Promise<File>{
 if(!types.has(file.type)||!file.size||file.size>30*1024*1024)throw new Error('יש לבחור תמונת JPEG, PNG או WebP עד 30MB לפני הדחיסה');
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width*bitmap.height>50_000_000)throw new Error('ממדי התמונה גדולים מדי');
  const canvas=document.createElement('canvas');
  let scale=Math.min(1,1920/Math.max(bitmap.width,bitmap.height));
  for(let attempt=0;attempt<5;attempt++){
   canvas.width=Math.max(1,Math.round(bitmap.width*scale));
   canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const context=canvas.getContext('2d');
   if(!context)throw new Error('לא ניתן לעבד את התמונה');
   context.drawImage(bitmap,0,0,canvas.width,canvas.height);
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',0.85-attempt*0.1));
   if(blob&&blob.size<=MAX_BYTES&&types.has(blob.type)){
    const extension=blob.type==='image/webp'?'webp':blob.type==='image/jpeg'?'jpg':'png';
    return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.'+extension,{type:blob.type});
   }
   scale*=0.75;
  }
  throw new Error('לא ניתן לדחוס את התמונה לגודל המותר');
 }finally{bitmap.close();}
}

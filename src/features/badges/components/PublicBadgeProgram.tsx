import {useEffect,useState} from 'react';
import {badgeProgramService,type BadgeProgram} from '../badgeProgramService';
import {Card} from '../../../components/ui/Card';
export default function PublicBadgeProgram(){
 const [program,setProgram]=useState<BadgeProgram|null>(null);
 useEffect(()=>{let active=true;badgeProgramService.get().then(data=>{if(active)setProgram(data);}).catch(()=>{});return()=>{active=false};},[]);
 if(!program?.description&&!program?.image)return null;
 return <section aria-label="תגים" className="space-y-3"><h2 className="text-2xl font-extrabold">תגים</h2><Card variant="public" className="p-5 space-y-4">
 {program.description&&<p className="whitespace-pre-wrap break-words">{program.description}</p>}
 {program.image&&<img src={program.image} alt="מערך התגים" loading="lazy" className="w-full max-h-[36rem] object-contain rounded-lg"/>}
 </Card></section>;
}

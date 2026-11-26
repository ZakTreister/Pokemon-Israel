import {useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useSiteSettings} from '../../features/siteSettings/SiteSettingsProvider';
import {pageActive} from '../../../shared/siteSettings';
import {staticContentLinkTarget} from '../../../shared/contentLinkTargets';
import {contentPagesService} from '../../services/contentPages';
import Button from '../ui/Button';
import {Card} from '../ui/Card';

export default function ContentPageLinks({target}:{target:string}){
 return <PageLinks key={target} target={target}/>;
}
function PageLinks({target}:{target:string}){
 const [links,setLinks]=useState<{id:string;label:string}[]>([]);
 useEffect(()=>{
  let active=true;
  contentPagesService.buttons(target).then(rows=>{if(active&&Array.isArray(rows))setLinks(rows);}).catch(()=>{});
  return()=>{active=false};
 },[target]);
 if(!links.length)return null;
 return <div className="container py-5"><Card variant="public" className="p-5 space-y-3"><nav aria-label="קישורים נוספים" className="space-y-3"><h2 className="text-xl font-extrabold">קישורים נוספים</h2><div className="flex flex-wrap gap-3">
 {links.map(link=><Button key={link.id} asChild variant="default" size="lg" className="max-w-full h-auto min-h-12 whitespace-normal text-center px-6 py-3"><Link to={'/content/'+link.id}>{link.label}</Link></Button>)}
 </div></nav></Card></div>;
}
// Fixed pages share the same footer placement. Dynamic content pages mount the
// same component only after their published record has been loaded successfully.
export function StaticContentPageLinks(){
 const {pathname}=useLocation();
 const target=staticContentLinkTarget(pathname);
 const {settings,status}=useSiteSettings();
 return target&&status==='ready'&&pageActive(settings,target)?<ContentPageLinks target={target}/>:null;
}

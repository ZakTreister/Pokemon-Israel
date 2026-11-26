import {createContext,useContext,useEffect,useState,useCallback,useRef,type ReactNode} from 'react';
import {useLocation} from 'react-router-dom';
import {defaultSiteSettings,type SiteSettings} from '../../../shared/siteSettings';
import {siteSettingsService} from '../../services/siteSettings';
type State={settings:SiteSettings;status:'loading'|'ready'|'error';apply:(value:SiteSettings)=>void;refresh:()=>void};
const Context=createContext<State>({settings:defaultSiteSettings(),status:'ready',apply:()=>{},refresh:()=>{}});
export function useSiteSettings(){return useContext(Context);}
export default function SiteSettingsProvider({children}:{children:ReactNode}){
 const {pathname}=useLocation();
 const [settings,setSettings]=useState(defaultSiteSettings);
 const [status,setStatus]=useState<State['status']>('loading');
 const revision=useRef(0);
 const [reload,setReload]=useState(0);
 const refresh=useCallback(()=>{revision.current++;setReload(n=>n+1);},[]);
 const apply=useCallback((value:SiteSettings)=>{revision.current++;setSettings(value);setStatus('ready');},[]);
 useEffect(()=>{let active=true;const started=revision.current;
  siteSettingsService.get().then(value=>{if(active&&revision.current===started){if(!Array.isArray(value?.pages)||!Array.isArray(value?.socials)||!Array.isArray(value.navigation?.menu)||!Array.isArray(value.navigation?.footer))throw new Error('Invalid site settings');setSettings(value);setStatus('ready');}}).catch(()=>{if(active&&revision.current===started)setStatus('error');});
  return()=>{active=false;};
 },[pathname,reload]);
 useEffect(()=>{
  if(typeof document==='undefined'||!document.head)return;
  const url=settings.logos?.kids;
  const existing=document.head.querySelector('link[rel="icon"]');
  if(!url){if(status==='ready')existing?.remove();return;}
  const icon=existing||document.createElement('link');icon.setAttribute('rel','icon');icon.setAttribute('href',url);
  if(!existing)document.head.appendChild(icon);
 },[settings.logos?.kids,status]);
 return <Context.Provider value={{settings,status,apply,refresh}}>{children}</Context.Provider>;
}

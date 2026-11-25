import type {LeagueLogoKey} from '../../../shared/siteSettings';
import {useSiteSettings} from './SiteSettingsProvider';
import type {ReactNode} from 'react';
export function LeagueLogo({league,className='',decorative=false,fallback=null}:{league:LeagueLogoKey;className?:string;decorative?:boolean;fallback?:ReactNode}){
 const {settings}=useSiteSettings();
 const url=settings.logos?.[league];
 return url?<img src={url} alt={decorative?'':league==='kids'?'ליגת הילדים':'ליגת הנבחרות'} draggable={false} className={className+' object-contain'}/>:<>{fallback}</>;
}

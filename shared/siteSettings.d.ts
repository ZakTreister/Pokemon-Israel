export type SocialKey='facebook'|'instagram'|'youtube'|'tiktok'|'whatsapp';
export interface PageSetting {path:string;active:boolean;menu:boolean;footer:boolean;order?:number}
export interface ContentNavigationSetting extends PageSetting {label:string;title:string}
export interface NavigationLink {to:string;label:string;construction:boolean}
export interface SocialSetting {key:SocialKey;enabled:boolean;url:string}
export type LeagueLogoKey='kids'|'allStars';
export type LogoUploads=Partial<Record<LeagueLogoKey,string|null>>;
export interface SiteSettings {pages:PageSetting[];socials:SocialSetting[];logos:Record<LeagueLogoKey,string>;contentPages?:ContentNavigationSetting[];navigation?:{menu:NavigationLink[];footer:NavigationLink[]}}
export const LEAGUE_LOGOS:readonly {key:LeagueLogoKey;label:string;purpose:'league-kids-logo'|'league-all-stars-logo';entityId:string}[];
export const SOCIAL_PLATFORMS:readonly {key:SocialKey;label:string;hosts:string[]}[];
export const HEADER_ORDER:readonly string[];
export const FOOTER_ORDER:readonly string[];
export const TRAILING_PAGES:readonly string[];
export function defaultSiteSettings():SiteSettings;
export function pageActive(settings:SiteSettings,path:string):boolean;
export function navigationPages(settings:SiteSettings,placement:'menu'|'footer'):{to:string;label:string;construction:boolean}[];
export function validSocialUrl(key:string,value:unknown):boolean;

export function buildNavigation(settings:SiteSettings):{menu:NavigationLink[];footer:NavigationLink[]};

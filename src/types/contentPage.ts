import type { EventMedia } from './event';
export interface ContentPageLink {id:string;title:string;subtitle?:string;status:'draft'|'published'}
export interface ContentPage extends ContentPageLink {
 bodyHtml:string;showInNavigation:boolean;navigationLabel:string;showInFieldNews:boolean;mediaItems:EventMedia[];updatedAt?:string;
 showAsButton?:boolean;buttonLabel?:string;buttonTargets?:string[];
}
export type ContentPageInput=Pick<ContentPage,'title'|'subtitle'|'bodyHtml'|'status'|'showInNavigation'|'navigationLabel'|'showInFieldNews'|'showAsButton'|'buttonLabel'|'buttonTargets'>;

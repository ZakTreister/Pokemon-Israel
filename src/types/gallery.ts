import type {EventMedia} from './event';
import type {Update} from './update';
export interface Gallery {id:string;title:string;subtitle:string;mediaItems:EventMedia[];}
export interface FieldNewsItem extends Update {kind:'update'|'event'|'content';href:string;eventIds:string[];}

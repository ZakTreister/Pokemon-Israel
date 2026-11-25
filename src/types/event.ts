import type { PublicTournamentSummary } from '../services/publicTournaments';
import type { Update } from './update';
import type { ContentPageLink } from './contentPage';
export type EventCategory='club'|'all_stars';
export interface EventMedia {id:string;kind:'image'|'video'|'youtube';url:string;youtubeId?:string;caption:string;showInGallery?:boolean;}
export interface EventFixture {id:string;firstTeam:string;secondTeam:string;date:string;location:string;tournamentId:string|null;}
export interface EventSummary {id:string;title:string;description:string;bodyHtml?:string;contentPageIds?:string[];showInFieldNews?:boolean;category:EventCategory;status:'draft'|'published';featured:boolean;openingRound?:boolean;startDate:string|null;endDate:string|null;coverUrl:string;mediaItems:EventMedia[];}
export interface EventDetails extends EventSummary {tournaments:PublicTournamentSummary[];updates:Update[];fixtures:EventFixture[];contentPages?:ContentPageLink[];}
export type EventInput=Pick<EventSummary,'title'|'description'|'bodyHtml'|'contentPageIds'|'showInFieldNews'|'category'|'status'|'featured'|'openingRound'|'startDate'|'endDate'>;

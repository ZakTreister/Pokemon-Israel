import type { PublicTournamentSummary } from '../services/publicTournaments';
import type { Update } from './update';
export type EventCategory='club'|'all_stars';
export interface EventMedia {id:string;kind:'image'|'video'|'youtube';url:string;youtubeId?:string;caption:string;}
export interface EventFixture {id:string;firstTeam:string;secondTeam:string;date:string;location:string;tournamentId:string|null;}
export interface EventSummary {id:string;title:string;description:string;category:EventCategory;status:'draft'|'published';featured:boolean;startDate:string|null;endDate:string|null;coverUrl:string;mediaItems:EventMedia[];}
export interface EventDetails extends EventSummary {tournaments:PublicTournamentSummary[];updates:Update[];fixtures:EventFixture[];}
export type EventInput=Pick<EventSummary,'title'|'description'|'category'|'status'|'featured'|'startDate'|'endDate'>;

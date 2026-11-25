import api from './api';
export interface LeagueRow {id:string;name:string;logo?:string;position:number;played:number;wins:number;leaguePoints:number;gameDifference:number;}
export interface TeamSummary {id:string;name:string;logo?:string;}
export interface Fixture {id:string;eventId:string;date:string;firstTeam:TeamSummary;secondTeam:TeamSummary;tournamentId:string|null;phase?:string|null;}
export interface Meeting {id:string;date:string;eventId:string|null;teams:TeamSummary[];gameWins:number[];matchWins:number[];}
export interface Overview {standings:LeagueRow[];fixtures:Fixture[];recentMeetings:Meeting[];}
export const allStarsService={
 overview:async()=>(await api.get<Overview>('/api/all-stars/overview')).data,
 live:async()=>(await api.get<Meeting[]>('/api/all-stars/live')).data,
};

// Derive freshness from saved ranking source records, never from request time.
export const HISTORICAL_RESULTS_THROUGH = Object.freeze({
 date:'2026-07',precision:'month',title:'אליפות ישראל',
});
export function latestSavedDate(values) {
 const timestamps=values.filter(value=>value!==null&&value!==undefined&&value!=='')
   .map(value=>new Date(value).getTime()).filter(Number.isFinite);
 return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;
}
const tournamentResults = tournament => tournament.engineVersion==='swiss-v1'
 ? tournament.finalStandings||[] : tournament.results||[];
export const hasRankingResults = tournament => tournamentResults(tournament).some(row=>!!row.player);
const savedAt = row => row.updatedAt || row.closedAt || row.createdAt;
export function nationalRankingFreshness(historical,tournaments) {
 const contributing=tournaments.filter(hasRankingResults);
 const live=contributing.filter(row=>!row.deletedAt);
 const latest=live.reduce((best,row)=>{
  const time=new Date(row.date).getTime();
  if(!Number.isFinite(time))return best;
  return !best||time>new Date(best.date).getTime()||
    (time===new Date(best.date).getTime()&&String(row._id).localeCompare(String(best._id))>0)?row:best;
 },null);
 let resultsThrough=historical.length?{...HISTORICAL_RESULTS_THROUGH}:null;
 if(latest&&(!resultsThrough||new Date(latest.date).toISOString().slice(0,7)>=resultsThrough.date)){
  resultsThrough={date:new Date(latest.date).toISOString(),precision:'day',title:latest.title||''};
 }
 return {
  lastUpdatedAt:latestSavedDate([
   ...historical.map(savedAt),
   ...contributing.map(row=>row.deletedAt||savedAt(row)),
  ]),
  resultsThrough,
 };
}
export function leagueRankingFreshness(meetings) {
 return latestSavedDate(meetings.map(row=>row.deletedAt||savedAt(row)));
}

import type {RankingCoverage} from '../../services/rankings';

const formatDay=(value:string)=>new Date(value).toLocaleDateString('he-IL',{timeZone:'Asia/Jerusalem'});
const formatCoverage=(coverage:RankingCoverage)=>coverage.precision==='month'
 ? new Date(coverage.date+'-01T12:00:00Z').toLocaleDateString('he-IL',{month:'long',year:'numeric',timeZone:'Asia/Jerusalem'})
 : formatDay(coverage.date);

export default function RankingFreshness({lastUpdatedAt,resultsThrough,showCoverage=false}:{lastUpdatedAt?:string|null;resultsThrough?:RankingCoverage|null;showCoverage?:boolean}){
 return <div className="mb-3 space-y-1 text-sm text-muted-foreground" aria-label="מועד עדכון הדירוג">
  <p><strong>הדירוג עודכן לאחרונה:</strong> {lastUpdatedAt?formatDay(lastUpdatedAt):'טרם עודכן'}</p>
  {showCoverage&&<p><strong>כולל תוצאות מטורנירים עד:</strong> {resultsThrough?<>{formatCoverage(resultsThrough)}{resultsThrough.title?' · '+resultsThrough.title:''}</>:'אין תוצאות מתועדות'}</p>}
 </div>;
}

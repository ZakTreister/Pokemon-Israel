import type { NationalRanking } from '../../services/rankings';

export default function RankingPodium({leaders}:{leaders:NationalRanking[]}) {
  const slots = [{index:1,height:'min-h-28',color:'bg-slate-200 text-slate-900'}, {index:0,height:'min-h-40',color:'bg-amber-300 text-amber-950'}, {index:2,height:'min-h-24',color:'bg-orange-200 text-orange-950'}];
  if (!leaders.length) return null;
  return <div className="grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label="שלושת מובילי הדירוג">
    {slots.map(({index,height,color}) => {
      const row=leaders[index];
      return row ? <article key={row.playerId} className={`rounded-t-xl p-2 sm:p-4 flex flex-col items-center justify-end text-center gap-1 ${height} ${color}`}>
        <strong className="text-2xl sm:text-3xl">#{row.position}</strong>
        <span className="font-bold text-sm sm:text-lg break-words max-w-full">{row.playerName}</span>
        <span className="text-xs sm:text-sm">{row.points} נקודות</span>
      </article> : <div key={index} aria-hidden="true"/>;
    })}
  </div>;
}

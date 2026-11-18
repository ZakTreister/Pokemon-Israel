import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import teamsService from '../../features/teams/teamsService';
import type { Team } from '../../types/team';
import { requestError } from '../../utils/requestError';
import Button from '../ui/Button';

export default function InterTeamLaunch({ label = 'מפגש נבחרות' }: { label?: string }) {
  const [open,setOpen]=useState(false);
  const [teams,setTeams]=useState<Team[]>([]);
  const [selected,setSelected]=useState<string[]>([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const navigate=useNavigate();
  useEffect(()=>{
    if (!open) return;
    let active=true;
    teamsService.getTeams().then(rows=>{if(active)setTeams(rows.filter(t=>t.isActive));})
      .catch(e=>{if(active)setError(requestError(e));});
    return()=>{active=false;};
  },[open]);
  const create=async()=>{
    if(selected.length!==2||busy)return;
    setBusy(true);setError('');
    try{
      const {data}=await api.post<{id:string}>('/api/inter-team',{teamIds:selected});
      setOpen(false);navigate(`/manage/inter-team/${data.id}`);
    }catch(e){setError(requestError(e));}finally{setBusy(false);}
  };
  return <>
    <Button onClick={()=>{setOpen(true);setSelected([]);setError('');}}>{label}</Button>
    {open&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation"
      onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setOpen(false);}}>
      <section role="dialog" aria-modal="true" aria-label="פתיחת מפגש נבחרות" className="bg-card rounded-xl border shadow-xl w-full max-w-xl p-5 space-y-4" dir="rtl">
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">מפגש נבחרות חדש</h2>
          <button type="button" onClick={()=>setOpen(false)} disabled={busy} aria-label="סגירה">✕</button>
        </header>
        <p>בחר בדיוק שתי נבחרות</p>
        <div className="grid grid-cols-2 gap-3">
          {teams.map(team=><button type="button" key={team.id}
            aria-pressed={selected.includes(team.id)}
            className={`rounded-xl border-2 p-4 text-center space-y-2 ${selected.includes(team.id)?'border-blue-500 bg-blue-500/10':'border-border'}`}
            onClick={()=>setSelected(current=>current.includes(team.id)?current.filter(id=>id!==team.id):current.length<2?[...current,team.id]:[current[1],team.id])}>
            <img src={team.logo||'/pokemon_kids_logo.png'} alt="" className="w-20 h-20 object-contain mx-auto"/>
            <span className="block font-bold">{team.name}</span>
          </button>)}
        </div>
        {error&&<p role="alert" className="text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={()=>setOpen(false)}>ביטול</Button>
          <Button disabled={selected.length!==2||busy} onClick={()=>void create()}>{busy?'פותח…':'התחל מפגש'}</Button>
        </div>
      </section>
    </div>}
  </>;
}

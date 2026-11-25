import {useState,useSyncExternalStore} from 'react';
import {favoriteTeam,selectFavoriteTeam,subscribeFavorite} from '../../../services/favoriteTeam';
import {requestError} from '../../../utils/requestError';
import type {Team} from '../../../types/team';
export function useFavoriteTeamId(){return useSyncExternalStore(subscribeFavorite,favoriteTeam,()=>null);}
export function useFavoriteSelection(){
 const selected=useFavoriteTeamId();
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [counts,setCounts]=useState<Record<string,number>>({});
 async function select(team:Team){
  if(busy)return;
  setBusy(true);setError('');setMessage('');
  try{const result=await selectFavoriteTeam(team.id);setCounts(old=>({...old,...result.counts}));setMessage('בחרתם לעודד את '+team.name+'! העדכונים שלה יופיעו עכשיו בדף הבית.');}
  catch(e){setError(requestError(e));}finally{setBusy(false);}
 }
 return {selected,busy,error,message,counts,select};
}

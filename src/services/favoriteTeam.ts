import {publicTeams} from './publicTeams';
const selectedKey='cardschool.favoriteTeam',countedKey='cardschool.favoriteCountedTeam',pendingKey='cardschool.favoritePending';
const eventName='cardschool:favoriteTeamChanged';
type Operation={operationId:string;fromTeam:string|null;toTeam:string|null;actionTeam:string};
type Result={favorite:string|null;counts:Record<string,number>};
export function favoriteTeam(){return typeof window==='undefined'?null:window.localStorage.getItem(selectedKey);}
export function subscribeFavorite(listener:()=>void){
 const storage=(e:StorageEvent)=>{if(e.key===selectedKey||e.key===null)listener();};
 window.addEventListener('storage',storage);window.addEventListener(eventName,listener);
 return ()=>{window.removeEventListener('storage',storage);window.removeEventListener(eventName,listener);};
}
async function send(operation:Operation):Promise<Result>{
 localStorage.setItem(pendingKey,JSON.stringify(operation));
 try{
  const result=await publicTeams.favorite(operation);
  if(operation.toTeam){localStorage.setItem(selectedKey,operation.toTeam);localStorage.setItem(countedKey,operation.toTeam);}else{localStorage.removeItem(selectedKey);localStorage.removeItem(countedKey);}
  localStorage.removeItem(pendingKey);
  window.dispatchEvent(new Event(eventName));
  return {favorite:operation.toTeam,counts:result.counts};
 }catch(error){
  const status=(error as {response?:{status?:number}})?.response?.status;
  if(status&&[400,404,409].includes(status))localStorage.removeItem(pendingKey);
  throw error;
 }
}
let queue:Promise<unknown>=Promise.resolve();
function change(teamId:string,toggle:boolean):Promise<Result>{
 const work=async()=>{
  const raw=localStorage.getItem(pendingKey);
  let counts:Record<string,number>={};
  if(raw){
   const pending=JSON.parse(raw) as Operation;
   const recovered=await send(pending);counts=recovered.counts;
   if(pending.actionTeam===teamId)return recovered;
  }
  const old=favoriteTeam(),counted=localStorage.getItem(countedKey);
  if(!toggle&&old===teamId&&counted===teamId)return {favorite:old,counts};
  const result=await send({operationId:crypto.randomUUID(),fromTeam:old===counted?counted:null,toTeam:toggle&&old===teamId?null:teamId,actionTeam:teamId});
  return {...result,counts:{...counts,...result.counts}};
 };
 const run=()=>typeof navigator!=='undefined'&&navigator.locks?navigator.locks.request(selectedKey,work):work();
 const result=queue.then(run,run);queue=result.catch(()=>{});return result;
}
export function selectFavoriteTeam(teamId:string){return change(teamId,false);}
export function toggleFavoriteTeam(teamId:string){return change(teamId,true);}

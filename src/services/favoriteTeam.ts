import {publicTeams} from './publicTeams';
const selectedKey='cardschool.favoriteTeam',countedKey='cardschool.favoriteCountedTeam',pendingKey='cardschool.favoritePending';
type Operation={operationId:string;fromTeam:string|null;toTeam:string|null;actionTeam:string};
export function favoriteTeam(){return localStorage.getItem(selectedKey);}
export async function toggleFavoriteTeam(teamId:string){
 const raw=localStorage.getItem(pendingKey);
 let operation:Operation;
 if(raw)operation=JSON.parse(raw) as Operation;
 else{
  const old=favoriteTeam(),counted=localStorage.getItem(countedKey);
  operation={operationId:crypto.randomUUID(),fromTeam:old===counted?counted:null,toTeam:old===teamId?null:teamId,actionTeam:teamId};
  localStorage.setItem(pendingKey,JSON.stringify(operation));
 }
 try{
  const result=await publicTeams.favorite(operation);
  if(operation.toTeam){localStorage.setItem(selectedKey,operation.toTeam);localStorage.setItem(countedKey,operation.toTeam);}else{localStorage.removeItem(selectedKey);localStorage.removeItem(countedKey);}
  localStorage.removeItem(pendingKey);
  return {favorite:operation.toTeam,counts:result.counts};
 }catch(error){
  const status=(error as {response?:{status?:number}})?.response?.status;
  if(status&&[400,404,409].includes(status))localStorage.removeItem(pendingKey);
  throw error;
 }
}

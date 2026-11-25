import api from './api';
import type {ContentPage,ContentPageInput} from '../types/contentPage';
export const contentPagesService={
 buttons:async(target:string)=>(await api.get<{id:string;label:string}[]>('/api/content-pages/buttons',{params:{target}})).data,
 navigation:async()=>(await api.get<{id:string;label:string}[]>('/api/content-pages/navigation')).data,
 manage:async()=>(await api.get<ContentPage[]>('/api/content-pages/management')).data,
 getManaged:async(id:string)=>(await api.get<ContentPage>('/api/content-pages/management/'+encodeURIComponent(id))).data,
 get:async(id:string)=>(await api.get<ContentPage>('/api/content-pages/'+id)).data,
 create:async(input:ContentPageInput)=>(await api.post<ContentPage>('/api/content-pages',input)).data,
 update:async(id:string,input:ContentPageInput)=>(await api.put<ContentPage>('/api/content-pages/'+id,input)).data,
 remove:async(id:string)=>api.delete('/api/content-pages/'+id),
};

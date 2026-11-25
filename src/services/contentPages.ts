import api from './api';
import type {ContentPage,ContentPageInput} from '../types/contentPage';
export const contentPagesService={
 navigation:async()=>(await api.get<{id:string;label:string}[]>('/api/content-pages/navigation')).data,
 manage:async()=>(await api.get<ContentPage[]>('/api/content-pages/management')).data,
 get:async(id:string)=>(await api.get<ContentPage>('/api/content-pages/'+id)).data,
 create:async(input:ContentPageInput)=>(await api.post<ContentPage>('/api/content-pages',input)).data,
 update:async(id:string,input:ContentPageInput)=>(await api.put<ContentPage>('/api/content-pages/'+id,input)).data,
 remove:async(id:string)=>api.delete('/api/content-pages/'+id),
};

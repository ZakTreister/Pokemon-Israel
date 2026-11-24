import api from './api';
import type { EventDetails,EventInput,EventSummary,EventCategory } from '../types/event';
import type { PageResult } from '../types/pagination';
export const eventsService={
 list:async(params?:{category?:EventCategory;page?:number;pageSize?:number})=>(await api.get<PageResult<EventSummary>>('/api/events',{params})).data,
 get:async(id:string)=>(await api.get<EventDetails>(`/api/events/${id}`)).data,
 manage:async()=>(await api.get<EventSummary[]>('/api/events/management')).data,
 getManaged:async(id:string)=>(await api.get<EventDetails>(`/api/events/management/${id}`)).data,
 create:async(data:EventInput)=>(await api.post<EventDetails>('/api/events',data)).data,
 update:async(id:string,data:Partial<EventInput>)=>(await api.put<EventDetails>(`/api/events/${id}`,data)).data,
 remove:async(id:string)=>(await api.delete(`/api/events/${id}`)).data,
 link:async(eventId:string,tid:string)=>(await api.put(`/api/events/${eventId}/tournaments/${tid}`)).data,
 unlink:async(eventId:string,tid:string)=>(await api.delete(`/api/events/${eventId}/tournaments/${tid}`)).data,
 fixtures:async(id:string,fixtures:object[])=>(await api.put(`/api/events/${id}/fixtures`,{fixtures})).data,
};

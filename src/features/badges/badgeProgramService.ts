import api from '../../services/api';
export interface BadgeProgram {id:string;description:string;image:string}
export const badgeProgramService={
 get:async()=>(await api.get<BadgeProgram>('/api/badges/program')).data,
 save:async(input:{description:string;imageUploadId?:string|null})=>(await api.put<BadgeProgram>('/api/badges/program',input)).data,
};

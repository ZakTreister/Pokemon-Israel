import api from "./api";
import type { Team, TeamWithRoster } from "../types/team";
export const publicTeams = {
  favorite:async(input:{operationId:string;fromTeam:string|null;toTeam:string|null;actionTeam:string})=>(await api.post<{counts:Record<string,number>}>("/api/teams/public/favorite",input)).data,
  list: async () => (await api.get<Team[]>("/api/teams/public")).data,
  get: async (id: string) =>
    (await api.get<TeamWithRoster>(`/api/teams/public/${id}`)).data,
};

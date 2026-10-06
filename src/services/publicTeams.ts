import api from "./api";
import type { Team, TeamWithRoster } from "../types/team";
export const publicTeams = {
  list: async () => (await api.get<Team[]>("/api/teams/public")).data,
  get: async (id: string) =>
    (await api.get<TeamWithRoster>(`/api/teams/public/${id}`)).data,
};

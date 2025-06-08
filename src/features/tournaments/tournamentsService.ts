import api from '../../services/api';
import { Tournament } from '../../types/tournament';

const getTournaments = async () => {
  const { data } = await api.get<Tournament[]>('/api/tournaments');
  return data;
};

const getTournamentById = async (id: string) => {
  const { data } = await api.get<Tournament>(`/api/tournaments/${id}`);
  return data;
};

const createTournament = async (tournamentData: Partial<Tournament>) => {
  const { data } = await api.post<Tournament>('/api/tournaments', tournamentData);
  return data;
};

const updateTournament = async (id: string, tournamentData: Partial<Tournament>) => {
  const { data } = await api.put<Tournament>(`/api/tournaments/${id}`, tournamentData);
  return data;
};

const deleteTournament = async (id: string) => {
  await api.delete(`/api/tournaments/${id}`);
};

const registerForTournament = async (id: string) => {
  const { data } = await api.post<Tournament>(`/api/tournaments/${id}/register`);
  return data;
};

const submitTournamentResults = async (id: string, results: any) => {
  const { data } = await api.post<Tournament>(`/api/tournaments/${id}/results`, { results });
  return data;
};

const getTournamentResults = async (id: string) => {
  const { data } = await api.get(`/api/tournaments/${id}/results`);
  return data;
};

const tournamentsService = {
  getTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  deleteTournament,
  registerForTournament,
  submitTournamentResults,
  getTournamentResults,
};

export default tournamentsService;
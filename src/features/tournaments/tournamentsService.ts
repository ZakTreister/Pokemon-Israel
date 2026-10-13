import api from '../../services/api';
import { Tournament } from '../../types/tournament';

const getTournaments = async (scope?: 'management') => {
  if (scope === 'management')
    return (await api.get<Tournament[]>('/api/tournaments/management/legacy'))
      .data;
  const records: Tournament[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { data } = await api.get<
      import('../../types/pagination').PageResult<Tournament>
    >('/api/tournaments', { params: { page, pageSize: 100 } });
    records.push(...data.items);
    totalPages = data.totalPages;
    page++;
  } while (page <= totalPages);
  return records;
};

const getTournamentById = async (id: string) => {
  const { data } = await api.get<Tournament>(
    `/api/tournaments/management/legacy/${id}`,
  );
  return data;
};

const createTournament = async (tournamentData: Partial<Tournament>) => {
  const { data } = await api.post<Tournament>(
    '/api/tournaments',
    tournamentData,
  );
  return data;
};

const updateTournament = async (
  id: string,
  tournamentData: Partial<Tournament>,
) => {
  const { data } = await api.put<Tournament>(
    `/api/tournaments/${id}`,
    tournamentData,
  );
  return data;
};

const deleteTournament = async (id: string) => {
  await api.delete(`/api/tournaments/${id}`);
};

const registerForTournament = async (id: string) => {
  const { data } = await api.post<Tournament>(
    `/api/tournaments/${id}/register`,
  );
  return data;
};

const unregisterFromTournament = async (id: string) => {
  const { data } = await api.delete<Tournament>(
    `/api/tournaments/${id}/register`,
  );
  return data;
};

const submitTournamentResults = async (id: string, results: unknown) => {
  const { data } = await api.post<Tournament>(
    `/api/tournaments/${id}/results`,
    { results },
  );
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
  unregisterFromTournament,
  submitTournamentResults,
  getTournamentResults,
};

export default tournamentsService;

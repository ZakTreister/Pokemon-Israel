import { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';
import type { PageResult } from '../../../types/pagination';
import type { PublicTournamentSummary } from '../../../services/publicTournaments';
import { requestError } from '../../../utils/requestError';
export interface TournamentEntry extends PublicTournamentSummary {
  canManage?: boolean;
  engineVersion?: string;
}
export function useTournamentList(management = false) {
  const [filters, setFilterState] = useState({
    status: '',
    type: '',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageResult<TournamentEntry> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .get<PageResult<TournamentEntry>>(
        management ? '/api/tournaments/management' : '/api/tournaments',
        { params: { ...filters, page } },
      )
      .then((response) => {
        if (active) {
          setData(response.data);
          setPage(response.data.page);
        }
      })
      .catch((e) => {
        if (active) setError(requestError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [management, filters, page, generation]);
  const setFilters = (next: typeof filters) => {
    setPage(1);
    setFilterState(next);
  };
  const reload = useCallback(async () => {
    setGeneration((value) => value + 1);
  }, []);
  return { filters, setFilters, page, setPage, data, error, loading, reload };
}

export interface Season {
  id: string;
  name: string;
  status: 'active' | 'closed';
  startedAt: string;
  closedAt: string | null;
  createdBy: {
    id: string;
    username: string;
    name: string;
  };
}

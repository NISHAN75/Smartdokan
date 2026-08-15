import { useQuery } from '@tanstack/react-query';
import { getDashboardRequest } from '../api/dashboardApi';

export const useDashboard = () =>
  useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboardRequest(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

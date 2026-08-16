import { useQuery } from '@tanstack/react-query';
import { getNotificationsRequest } from '../api/notificationApi';

const NOTIFICATIONS_KEY = 'notifications';

export const useNotifications = () =>
  useQuery({
    queryKey: [NOTIFICATIONS_KEY],
    queryFn: getNotificationsRequest,
    refetchInterval: 60000,
    staleTime: 30000,
  });

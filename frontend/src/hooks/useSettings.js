import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getSettingsRequest,
  updateProfileRequest,
  updatePasswordRequest,
  updateBusinessSettingsRequest,
} from '../api/settingsApi';

export const SETTINGS_KEY = ['settings'];

export const useSettings = () =>
  useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: getSettingsRequest,
  });

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfileRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
};

export const useUpdatePassword = () =>
  useMutation({ mutationFn: updatePasswordRequest });

export const useUpdateBusinessSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBusinessSettingsRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
};

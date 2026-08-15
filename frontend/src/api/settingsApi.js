import axiosInstance from './axiosInstance';

export const getSettingsRequest = async () => {
  const { data } = await axiosInstance.get('/settings');
  return data.data;
};

export const updateProfileRequest = async (payload) => {
  const { data } = await axiosInstance.patch('/settings/profile', payload);
  return data.data;
};

export const updatePasswordRequest = async (payload) => {
  const { data } = await axiosInstance.patch('/settings/password', payload);
  return data;
};

export const updateBusinessSettingsRequest = async (payload) => {
  const { data } = await axiosInstance.patch('/settings/business', payload);
  return data.data;
};

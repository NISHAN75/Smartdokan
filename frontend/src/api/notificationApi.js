import axiosInstance from './axiosInstance';

export const getNotificationsRequest = async () => {
  const { data } = await axiosInstance.get('/notifications');
  return data.data;
};

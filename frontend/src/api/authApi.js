import axiosInstance from './axiosInstance';

export const registerRequest = async ({ name, email, password }) => {
  const { data } = await axiosInstance.post('/auth/register', { name, email, password });
  return data.data;
};

export const loginRequest = async ({ email, password }) => {
  const { data } = await axiosInstance.post('/auth/login', { email, password });
  return data.data;
};

export const logoutRequest = async () => {
  const { data } = await axiosInstance.post('/auth/logout');
  return data;
};

export const getMeRequest = async () => {
  const { data } = await axiosInstance.get('/auth/me');
  return data.data;
};

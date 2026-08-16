import axiosInstance from './axiosInstance';

export const getUsersRequest = async (params) => {
  const { data } = await axiosInstance.get('/users', { params });
  return data;
};

export const getUserByIdRequest = async (id) => {
  const { data } = await axiosInstance.get(`/users/${id}`);
  return data.data;
};

export const createUserRequest = async (payload) => {
  const { data } = await axiosInstance.post('/users', payload);
  return data.data;
};

export const updateUserRequest = async ({ id, ...payload }) => {
  const { data } = await axiosInstance.patch(`/users/${id}`, payload);
  return data.data;
};

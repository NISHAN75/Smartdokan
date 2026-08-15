import axiosInstance from './axiosInstance';

export const getDashboardRequest = (params) =>
  axiosInstance
    .get('/dashboard', { params })
    .then((response) => response.data);

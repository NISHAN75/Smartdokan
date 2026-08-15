import axiosInstance from './axiosInstance';

export const getCustomersRequest = async (params) => {
  const { data } = await axiosInstance.get('/customers', { params });
  return data;
};

export const getCustomerByIdRequest = async (id) => {
  const { data } = await axiosInstance.get(`/customers/${id}`);
  return data.data;
};

export const createCustomerRequest = async ({ name, phone, email, address }) => {
  const { data } = await axiosInstance.post('/customers', { name, phone, email, address });
  return data.data;
};

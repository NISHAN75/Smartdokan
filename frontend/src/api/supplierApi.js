import axiosInstance from './axiosInstance';

export const getSuppliersRequest = async (params) => {
  const { data } = await axiosInstance.get('/suppliers', { params });
  return data;
};

export const getSupplierByIdRequest = async (id) => {
  const { data } = await axiosInstance.get(`/suppliers/${id}`);
  return data.data;
};

export const createSupplierRequest = async ({ name, phone, email, address, status }) => {
  const { data } = await axiosInstance.post('/suppliers', {
    name,
    phone,
    email,
    address,
    status,
  });
  return data.data;
};

import axiosInstance from './axiosInstance';

/**
 * Fetches paginated/filterable Sales History.
 * @param {{ page?: number, limit?: number, search?: string, paymentStatus?: string, paymentMethod?: string, from?: string, to?: string }} params
 */
export const getSalesRequest = async (params) => {
  const { data } = await axiosInstance.get('/sales', { params });
  return data;
};

export const getSaleByIdRequest = async (id) => {
  const { data } = await axiosInstance.get(`/sales/${id}`);
  return data.data;
};

/**
 * POS checkout. Only productId + quantity are sent per item — the
 * backend looks up name/sku/price itself and recalculates every total;
 * nothing price-related from the frontend is trusted.
 */
export const createSaleRequest = async ({
  customerId,
  items,
  discount,
  paidAmount,
  paymentMethod,
}) => {
  const { data } = await axiosInstance.post('/sales', {
    customerId,
    items,
    discount,
    paidAmount,
    paymentMethod,
  });
  return data.data;
};

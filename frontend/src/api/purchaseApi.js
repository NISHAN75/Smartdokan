import axiosInstance from './axiosInstance';

/**
 * Fetches paginated/filterable Purchase History.
 * @param {{ page?: number, limit?: number, search?: string, paymentStatus?: string, paymentMethod?: string, from?: string, to?: string }} params
 */
export const getPurchasesRequest = async (params) => {
  const { data } = await axiosInstance.get('/purchases', { params });
  return data;
};

export const getPurchaseByIdRequest = async (id) => {
  const { data } = await axiosInstance.get(`/purchases/${id}`);
  return data.data;
};

/**
 * Confirms a purchase. productId/quantity/purchasePrice are sent per
 * item — purchasePrice is a legitimate per-purchase input (suppliers can
 * charge differently order to order), but the backend still validates
 * it and recalculates every total; nothing else is trusted from the
 * frontend.
 */
export const createPurchaseRequest = async ({
  supplierId,
  items,
  discount,
  paidAmount,
  paymentMethod,
  note,
}) => {
  const { data } = await axiosInstance.post('/purchases', {
    supplierId,
    items,
    discount,
    paidAmount,
    paymentMethod,
    note,
  });
  return data.data;
};

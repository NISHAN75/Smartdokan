import axiosInstance from './axiosInstance';

/**
 * Fetches a paginated/filterable list of suppliers. Each row already
 * carries computed financial fields (currentDue, totalPurchases,
 * totalPaid, purchaseCount).
 * @param {{ page?: number, limit?: number, search?: string, status?: string, sort?: string }} params
 */
export const getSuppliersRequest = async (params) => {
  const { data } = await axiosInstance.get('/suppliers', { params });
  return data;
};

// Suppliers page summary cards — total/active/inactive suppliers, total
// purchase value, total supplier due.
export const getSupplierSummaryRequest = async () => {
  const { data } = await axiosInstance.get('/suppliers/summary');
  return data.data;
};

/**
 * Fetches one supplier plus its financial summary, shaped as
 * { supplier, summary } straight from the backend.
 */
export const getSupplierByIdRequest = async (id) => {
  const { data } = await axiosInstance.get(`/suppliers/${id}`);
  return data.data;
};

export const createSupplierRequest = async ({ name, phone, email, address, openingDue, status }) => {
  const { data } = await axiosInstance.post('/suppliers', {
    name,
    phone,
    email,
    address,
    openingDue,
    status,
  });
  return data.data;
};

export const updateSupplierRequest = async ({ id, name, phone, email, address, openingDue, status }) => {
  const { data } = await axiosInstance.put(`/suppliers/${id}`, {
    name,
    phone,
    email,
    address,
    openingDue,
    status,
  });
  return data.data;
};

// Toggles active/inactive (see supplierController.deleteSupplier) — the
// backend response tells us which way it went.
export const deleteSupplierRequest = async (id) => {
  const { data } = await axiosInstance.delete(`/suppliers/${id}`);
  return data;
};

export const getSupplierPurchasesRequest = async (id, params) => {
  const { data } = await axiosInstance.get(`/suppliers/${id}/purchases`, { params });
  return data;
};

export const getSupplierPaymentsRequest = async (id, params) => {
  const { data } = await axiosInstance.get(`/suppliers/${id}/payments`, { params });
  return data;
};

export const createSupplierPaymentRequest = async ({ supplierId, ...payload }) => {
  const { data } = await axiosInstance.post(`/suppliers/${supplierId}/payments`, payload);
  return data.data;
};

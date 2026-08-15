import axiosInstance from './axiosInstance';

/**
 * Fetches a paginated/filterable list of customers.
 * @param {{ page?: number, limit?: number, search?: string, status?: string, sort?: string }} params
 * Returns the full envelope (success, currentPage, totalPages, totalItems,
 * limit, data) since the page needs the pagination metadata, not just `data`.
 * Each row in `data` already carries a computed `currentDue`.
 */
export const getCustomersRequest = async (params) => {
  const { data } = await axiosInstance.get('/customers', { params });
  return data;
};

/**
 * Fetches one customer's full details, including balance breakdown
 * (openingDue, currentDue, salesCount, totalSales, totalPaid, dueAmount)
 * and recent sales history — used by the Customer Details view.
 */
export const getCustomerByIdRequest = async (id) => {
  const { data } = await axiosInstance.get(`/customers/${id}`);
  return data.data;
};

export const createCustomerRequest = async ({ name, phone, email, address, openingDue, status }) => {
  const { data } = await axiosInstance.post('/customers', {
    name,
    phone,
    email,
    address,
    openingDue,
    status,
  });
  return data.data;
};

export const updateCustomerRequest = async ({ id, name, phone, email, address, openingDue, status }) => {
  const { data } = await axiosInstance.put(`/customers/${id}`, {
    name,
    phone,
    email,
    address,
    openingDue,
    status,
  });
  return data.data;
};

// Deactivates the customer (soft delete) — see customerController for why
// customers are never hard-deleted.
export const deleteCustomerRequest = async (id) => {
  const { data } = await axiosInstance.delete(`/customers/${id}`);
  return data;
};

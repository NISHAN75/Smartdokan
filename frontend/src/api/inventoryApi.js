import axiosInstance from './axiosInstance';

/**
 * Fetches the paginated/filterable inventory stock overview.
 * @param {{ page?: number, limit?: number, search?: string, category?: string, stockStatus?: string, sort?: string }} params
 * Returns the full envelope (success, overview totals, pagination
 * metadata, data) since the page needs both the summary cards and the
 * pagination metadata, not just `data`.
 */
export const getInventoryRequest = async (params) => {
  const { data } = await axiosInstance.get('/inventory', { params });
  return data;
};
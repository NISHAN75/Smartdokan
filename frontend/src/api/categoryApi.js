import axiosInstance from './axiosInstance';

/**
 * Fetches a paginated/filterable list of categories.
 * @param {{ page?: number, limit?: number, search?: string, status?: string, sort?: string }} params
 * Returns the full envelope ({ success, count, total, page, pages, data })
 * since the page needs the pagination metadata, not just `data`.
 */
export const getCategoriesRequest = async (params) => {
  const { data } = await axiosInstance.get('/categories', { params });
  return data;
};

export const getCategoryByIdRequest = async (id) => {
  const { data } = await axiosInstance.get(`/categories/${id}`);
  return data.data;
};

export const createCategoryRequest = async ({ name, description, status }) => {
  const { data } = await axiosInstance.post('/categories', { name, description, status });
  return data.data;
};

export const updateCategoryRequest = async ({ id, name, description, status }) => {
  const { data } = await axiosInstance.put(`/categories/${id}`, { name, description, status });
  return data.data;
};

export const deleteCategoryRequest = async (id) => {
  const { data } = await axiosInstance.delete(`/categories/${id}`);
  return data;
};

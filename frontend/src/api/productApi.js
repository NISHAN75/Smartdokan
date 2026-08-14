import axiosInstance from './axiosInstance';

/**
 * Fetches a paginated/filterable list of products.
 * @param {{ page?: number, limit?: number, search?: string, category?: string, status?: string, sort?: string }} params
 * Returns the full envelope (success, currentPage, totalPages, totalItems,
 * limit, data) since the page needs the pagination metadata, not just `data`.
 */
export const getProductsRequest = async (params) => {
  const { data } = await axiosInstance.get('/products', { params });
  return data;
};

export const getProductByIdRequest = async (id) => {
  const { data } = await axiosInstance.get(`/products/${id}`);
  return data.data;
};

export const createProductRequest = async ({
  name,
  sku,
  barcode,
  categoryId,
  description,
  status,
  purchasePrice,
  sellingPrice,
  minimumStock,
  openingStock,
  unit,
}) => {
  const { data } = await axiosInstance.post('/products', {
    name,
    sku,
    barcode,
    categoryId,
    description,
    status,
    purchasePrice,
    sellingPrice,
    minimumStock,
    openingStock,
    unit,
  });
  return data.data;
};

export const updateProductRequest = async ({
  id,
  name,
  sku,
  barcode,
  categoryId,
  description,
  status,
  purchasePrice,
  sellingPrice,
  minimumStock,
  openingStock,
  unit,
}) => {
  const { data } = await axiosInstance.put(`/products/${id}`, {
    name,
    sku,
    barcode,
    categoryId,
    description,
    status,
    purchasePrice,
    sellingPrice,
    minimumStock,
    openingStock,
    unit,
  });
  return data.data;
};

export const deleteProductRequest = async (id) => {
  const { data } = await axiosInstance.delete(`/products/${id}`);
  return data;
};
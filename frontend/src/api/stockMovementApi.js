import axiosInstance from './axiosInstance';

export const getStockMovementsRequest =
  async (params) => {
    const { data } =
      await axiosInstance.get(
        '/stock-movements',
        { params }
      );

    return data;
  };

export const createStockMovementRequest =
  async ({
    productId,
    type,
    quantity,
    quantityChange,
    unitCost,
    reason,
    note,
  }) => {
    const { data } =
      await axiosInstance.post(
        '/stock-movements',
        {
          productId,
          type,
          quantity,
          quantityChange,
          unitCost,
          reason,
          note,
        }
      );

    return data;
  };
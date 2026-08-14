import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';

import {
  createStockMovementRequest,
  getStockMovementsRequest,
} from '../api/stockMovementApi';

const STOCK_MOVEMENTS_KEY =
  'stock-movements';

export const useStockMovements = (
  params
) =>
  useQuery({
    queryKey: [
      STOCK_MOVEMENTS_KEY,
      params,
    ],

    queryFn: () =>
      getStockMovementsRequest(params),

    placeholderData:
      keepPreviousData,
  });

export const useCreateStockMovement =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        createStockMovementRequest,

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            STOCK_MOVEMENTS_KEY,
          ],
        });

        queryClient.invalidateQueries({
          queryKey: ['inventory'],
        });
      },
    });
  };
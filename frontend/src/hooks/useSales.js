import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getSalesRequest, getSaleByIdRequest, createSaleRequest } from '../api/saleApi';

const SALES_KEY = 'sales';

export const useSales = (params) =>
  useQuery({
    queryKey: [SALES_KEY, params],
    queryFn: () => getSalesRequest(params),
    placeholderData: keepPreviousData,
  });

export const useSale = (id) =>
  useQuery({
    queryKey: [SALES_KEY, id],
    queryFn: () => getSaleByIdRequest(id),
    enabled: !!id,
  });

export const useCreateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSaleRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_KEY] });
      // Checkout deducts stock via StockMovement, so both of these
      // views go stale the moment a sale succeeds.
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
  });
};

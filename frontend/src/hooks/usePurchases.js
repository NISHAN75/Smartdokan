import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getPurchasesRequest, getPurchaseByIdRequest, createPurchaseRequest } from '../api/purchaseApi';

const PURCHASES_KEY = 'purchases';

export const usePurchases = (params) =>
  useQuery({
    queryKey: [PURCHASES_KEY, params],
    queryFn: () => getPurchasesRequest(params),
    placeholderData: keepPreviousData,
  });

export const usePurchase = (id) =>
  useQuery({
    queryKey: [PURCHASES_KEY, id],
    queryFn: () => getPurchaseByIdRequest(id),
    enabled: !!id,
  });

export const useCreatePurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPurchaseRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PURCHASES_KEY] });
      // Confirming a purchase adds stock via StockMovement, so both of
      // these views go stale the moment a purchase succeeds — same
      // reasoning as useCreateSale.
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      // Supplier due is derived live from Purchase.dueAmount (see
      // supplierController), so the Suppliers list/details/summary go
      // stale too.
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
};

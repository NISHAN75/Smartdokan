import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getSuppliersRequest, createSupplierRequest } from '../api/supplierApi';

const SUPPLIERS_KEY = 'suppliers';

export const useSuppliers = (params) =>
  useQuery({
    queryKey: [SUPPLIERS_KEY, params],
    queryFn: () => getSuppliersRequest(params),
    placeholderData: keepPreviousData,
  });

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupplierRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY] });
    },
  });
};

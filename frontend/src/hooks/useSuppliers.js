import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getSuppliersRequest,
  getSupplierSummaryRequest,
  getSupplierByIdRequest,
  createSupplierRequest,
  updateSupplierRequest,
  deleteSupplierRequest,
  getSupplierPurchasesRequest,
  getSupplierPaymentsRequest,
  createSupplierPaymentRequest,
} from '../api/supplierApi';

const SUPPLIERS_KEY = 'suppliers';

export const useSuppliers = (params) =>
  useQuery({
    queryKey: [SUPPLIERS_KEY, params],
    queryFn: () => getSuppliersRequest(params),
    placeholderData: keepPreviousData,
  });

export const useSupplierSummary = () =>
  useQuery({
    queryKey: [SUPPLIERS_KEY, 'summary'],
    queryFn: getSupplierSummaryRequest,
  });

export const useSupplier = (id) =>
  useQuery({
    queryKey: [SUPPLIERS_KEY, id],
    queryFn: () => getSupplierByIdRequest(id),
    enabled: !!id,
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

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSupplierRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY] });
    },
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSupplierRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY] });
    },
  });
};

export const useSupplierPurchases = (id, params) =>
  useQuery({
    queryKey: [SUPPLIERS_KEY, id, 'purchases', params],
    queryFn: () => getSupplierPurchasesRequest(id, params),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });

export const useSupplierPayments = (id, params) =>
  useQuery({
    queryKey: [SUPPLIERS_KEY, id, 'payments', params],
    queryFn: () => getSupplierPaymentsRequest(id, params),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });

export const useCreateSupplierPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupplierPaymentRequest,
    onSuccess: () => {
      // A new payment changes this supplier's due, so its detail view,
      // the Suppliers list (currentDue column), and the summary cards
      // all go stale.
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY] });
    },
  });
};

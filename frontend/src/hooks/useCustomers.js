import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getCustomersRequest,
  getCustomerByIdRequest,
  createCustomerRequest,
  updateCustomerRequest,
  deleteCustomerRequest,
} from '../api/customerApi';

const CUSTOMERS_KEY = 'customers';

export const useCustomers = (params) =>
  useQuery({
    queryKey: [CUSTOMERS_KEY, params],
    queryFn: () => getCustomersRequest(params),
    placeholderData: keepPreviousData,
  });

export const useCustomer = (id) =>
  useQuery({
    queryKey: [CUSTOMERS_KEY, id],
    queryFn: () => getCustomerByIdRequest(id),
    enabled: !!id,
  });

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomerRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCustomerRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCustomerRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
    },
  });
};

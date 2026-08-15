import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getCustomersRequest, createCustomerRequest } from '../api/customerApi';

const CUSTOMERS_KEY = 'customers';

export const useCustomers = (params) =>
  useQuery({
    queryKey: [CUSTOMERS_KEY, params],
    queryFn: () => getCustomersRequest(params),
    placeholderData: keepPreviousData,
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

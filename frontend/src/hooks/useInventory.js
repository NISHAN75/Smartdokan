import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getInventoryRequest } from '../api/inventoryApi';

const INVENTORY_KEY = 'inventory';

/**
 * Fetches the inventory overview for the given query params (page,
 * limit, search, category, stockStatus, sort). Keeps the previous
 * page's data on screen while the next page loads, same as useProducts.
 */
export const useInventory = (params) =>
  useQuery({
    queryKey: [INVENTORY_KEY, params],
    queryFn: () => getInventoryRequest(params),
    placeholderData: keepPreviousData,
  });
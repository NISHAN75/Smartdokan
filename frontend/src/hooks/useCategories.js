import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import {
  getCategoriesRequest,
  createCategoryRequest,
  updateCategoryRequest,
  deleteCategoryRequest,
} from '../api/categoryApi';

const CATEGORIES_KEY = 'categories';

/**
 * Fetches the category list for the given query params (page, limit,
 * search, status, sort). Keeps the previous page's data on screen while
 * the next page loads, instead of flashing back to a loading state.
 */
export const useCategories = (params) =>
  useQuery({
    queryKey: [CATEGORIES_KEY, params],
    queryFn: () => getCategoriesRequest(params),
    placeholderData: keepPreviousData,
  });

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCategoryRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCategoryRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCategoryRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
    },
  });
};

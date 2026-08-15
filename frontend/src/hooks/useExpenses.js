import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getExpensesRequest,
  getExpenseSummaryRequest,
  getExpenseByIdRequest,
  createExpenseRequest,
  updateExpenseRequest,
  deleteExpenseRequest,
  getExpenseCategoriesRequest,
  getExpenseCategoryByIdRequest,
  createExpenseCategoryRequest,
  updateExpenseCategoryRequest,
  deleteExpenseCategoryRequest,
} from '../api/expenseApi';

const EXPENSES_KEY = 'expenses';
const EXPENSE_CATEGORIES_KEY = 'expenseCategories';

// --- Expenses ---

export const useExpenses = (params) =>
  useQuery({
    queryKey: [EXPENSES_KEY, params],
    queryFn: () => getExpensesRequest(params),
    placeholderData: keepPreviousData,
  });

export const useExpenseSummary = () =>
  useQuery({
    queryKey: [EXPENSES_KEY, 'summary'],
    queryFn: getExpenseSummaryRequest,
  });

export const useExpense = (id) =>
  useQuery({
    queryKey: [EXPENSES_KEY, id],
    queryFn: () => getExpenseByIdRequest(id),
    enabled: !!id,
  });

// Invalidating the whole EXPENSES_KEY branch also covers the 'summary'
// query above, since React Query treats it as a prefix match — one
// invalidate keeps the list, pagination, and summary cards all in sync.
export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createExpenseRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXPENSES_KEY] });
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateExpenseRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXPENSES_KEY] });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteExpenseRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXPENSES_KEY] });
    },
  });
};

// --- Expense Categories ---

export const useExpenseCategories = (params) =>
  useQuery({
    queryKey: [EXPENSE_CATEGORIES_KEY, params],
    queryFn: () => getExpenseCategoriesRequest(params),
    placeholderData: keepPreviousData,
  });

export const useExpenseCategory = (id) =>
  useQuery({
    queryKey: [EXPENSE_CATEGORIES_KEY, id],
    queryFn: () => getExpenseCategoryByIdRequest(id),
    enabled: !!id,
  });

export const useCreateExpenseCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createExpenseCategoryRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXPENSE_CATEGORIES_KEY] });
    },
  });
};

export const useUpdateExpenseCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateExpenseCategoryRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXPENSE_CATEGORIES_KEY] });
    },
  });
};

// Also invalidates expenses: a category deactivation can change which
// categories are selectable for new/edited expenses, and (if the
// backend deactivated instead of deleted due to usage) the category
// list itself changes shape.
export const useDeleteExpenseCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteExpenseCategoryRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXPENSE_CATEGORIES_KEY] });
      queryClient.invalidateQueries({ queryKey: [EXPENSES_KEY] });
    },
  });
};

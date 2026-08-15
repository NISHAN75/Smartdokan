import axiosInstance from './axiosInstance';

/**
 * Fetches a paginated/filterable list of expenses. Returns the full
 * envelope (success, currentPage, totalPages, totalItems, limit, data)
 * since the page needs the pagination metadata, not just `data` — same
 * convention as getCustomersRequest/getPurchasesRequest.
 * @param {{ page?, limit?, search?, categoryId?, paymentMethod?, status?, from?, to?, sort? }} params
 */
export const getExpensesRequest = async (params) => {
  const { data } = await axiosInstance.get('/expenses', { params });
  return data;
};

// Expenses page summary cards — total amount/count, this month's
// amount/count, and per-category totals.
export const getExpenseSummaryRequest = async () => {
  const { data } = await axiosInstance.get('/expenses/summary');
  return data.data;
};

export const getExpenseByIdRequest = async (id) => {
  const { data } = await axiosInstance.get(`/expenses/${id}`);
  return data.data;
};

export const createExpenseRequest = async ({
  categoryId,
  amount,
  expenseDate,
  paymentMethod,
  reference,
  note,
}) => {
  const { data } = await axiosInstance.post('/expenses', {
    categoryId,
    amount,
    expenseDate,
    paymentMethod,
    reference,
    note,
  });
  return data.data;
};

export const updateExpenseRequest = async ({
  id,
  categoryId,
  amount,
  expenseDate,
  paymentMethod,
  reference,
  note,
  status,
}) => {
  const { data } = await axiosInstance.put(`/expenses/${id}`, {
    categoryId,
    amount,
    expenseDate,
    paymentMethod,
    reference,
    note,
    status,
  });
  return data.data;
};

// Deactivates the expense (soft delete) — see expenseController for why
// expenses are never hard-deleted.
export const deleteExpenseRequest = async (id) => {
  const { data } = await axiosInstance.delete(`/expenses/${id}`);
  return data;
};

// --- Expense Categories ---

export const getExpenseCategoriesRequest = async (params) => {
  const { data } = await axiosInstance.get('/expense-categories', { params });
  return data;
};

export const getExpenseCategoryByIdRequest = async (id) => {
  const { data } = await axiosInstance.get(`/expense-categories/${id}`);
  return data.data;
};

export const createExpenseCategoryRequest = async ({ name, description, status }) => {
  const { data } = await axiosInstance.post('/expense-categories', { name, description, status });
  return data.data;
};

export const updateExpenseCategoryRequest = async ({ id, name, description, status }) => {
  const { data } = await axiosInstance.put(`/expense-categories/${id}`, {
    name,
    description,
    status,
  });
  return data.data;
};

// Deactivates the category (or hard-deletes it if never used — see
// expenseCategoryController.deleteExpenseCategory).
export const deleteExpenseCategoryRequest = async (id) => {
  const { data } = await axiosInstance.delete(`/expense-categories/${id}`);
  return data;
};

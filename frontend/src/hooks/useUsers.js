import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getUsersRequest, getUserByIdRequest, createUserRequest, updateUserRequest } from '../api/userApi';

const USERS_KEY = 'users';

export const useUsers = (params) =>
  useQuery({
    queryKey: [USERS_KEY, params],
    queryFn: () => getUsersRequest(params),
    placeholderData: keepPreviousData,
  });

export const useUser = (id) =>
  useQuery({
    queryKey: [USERS_KEY, id],
    queryFn: () => getUserByIdRequest(id),
    enabled: !!id,
  });

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUserRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUserRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
      // A role/active change on the logged-in admin themself (e.g.
      // editing their own name) should also refresh the session user.
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
    },
  });
};

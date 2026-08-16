import { createContext, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMeRequest,
  loginRequest,
  logoutRequest,
  registerRequest,
} from '../api/authApi';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();

  // Fetch current session on load. A 401 simply means "not logged in",
  // which is a valid, non-error state for this app.
  const {
    data: user,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['authUser'],
    queryFn: getMeRequest,
    retry: false,
    staleTime: 5 * 60 * 1000,
    throwOnError: false,
  });

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      queryClient.setQueryData(['authUser'], data);
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (data) => {
      queryClient.setQueryData(['authUser'], null);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      // Always clear the local session, even if the server cookie is already expired.
      queryClient.setQueryData(['authUser'], null);
      queryClient.clear();
    },
  });

  const value = useMemo(
    () => ({
      user: user || null,
      isAuthenticated: Boolean(user),
      isLoading: isLoading || isFetching,
      hasRole: (...roles) => Boolean(user) && roles.includes(user.role),
      login: loginMutation.mutateAsync,
      loginStatus: loginMutation,
      register: registerMutation.mutateAsync,
      registerStatus: registerMutation,
      logout: logoutMutation.mutateAsync,
    }),
    [user, isLoading, isFetching, loginMutation, registerMutation, logoutMutation]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

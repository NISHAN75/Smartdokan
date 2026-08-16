import axiosInstance from './axiosInstance';

export const registerRequest = async ({ name, email, password }) => {
  const { data } = await axiosInstance.post('/auth/register', { name, email, password });
  return data;
};

export const loginRequest = async ({ email, password }) => {
  const { data } = await axiosInstance.post('/auth/login', { email, password });
  return data.data;
};

export const logoutRequest = async () => {
  const { data } = await axiosInstance.post('/auth/logout');
  return data;
};

export const getMeRequest = async () => {
  const { data } = await axiosInstance.get('/auth/me');
  return data.data;
};

export const verifyEmailRequest = async (token) => {
  const { data } = await axiosInstance.post('/auth/verify-email', { token });
  return data;
};

export const resendVerificationRequest = async (email) => {
  const { data } = await axiosInstance.post('/auth/resend-verification', { email });
  return data;
};

export const forgotPasswordRequest = async (email) => {
  const { data } = await axiosInstance.post('/auth/forgot-password', { email });
  return data;
};

export const resetPasswordRequest = async ({ token, password }) => {
  const { data } = await axiosInstance.post('/auth/reset-password', { token, password });
  return data;
};

import jwt from 'jsonwebtoken';

const isCrossSiteDeployment = () => (process.env.CLIENT_URL || '').startsWith('https://');

export const getAuthCookieOptions = () => {
  const crossSite = process.env.NODE_ENV === 'production' || isCrossSiteDeployment();
  return {
    httpOnly: true,
    secure: crossSite,
    sameSite: crossSite ? 'none' : 'lax',
    path: '/',
  };
};

const generateToken = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

  res.cookie('token', token, {
    ...getAuthCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
};

export const clearAuthCookie = (res) => {
  res.cookie('token', '', {
    ...getAuthCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
};

export default generateToken;
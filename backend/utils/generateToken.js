import jwt from 'jsonwebtoken';

/**
 * Signs a JWT for the given user id and sets it as an httpOnly cookie
 * on the response. Also returns the raw token in case the caller
 * (e.g. a mobile client or API consumer) needs it directly.
 */
const generateToken = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

  res.cookie('token', token, {
    httpOnly: true, // not accessible via client-side JS -> mitigates XSS
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return token;
};

export default generateToken;

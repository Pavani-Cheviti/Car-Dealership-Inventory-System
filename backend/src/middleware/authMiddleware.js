import jwt from 'jsonwebtoken';

const UNAUTHORIZED_MESSAGE = 'Unauthorized';
const INVALID_TOKEN_MESSAGE = 'Invalid token';

function sendUnauthorizedResponse(res, message = UNAUTHORIZED_MESSAGE) {
  return res.status(401).json({ message });
}

function getBearerTokenFromHeader(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function verifyToken(req, res, next) {
  const token = getBearerTokenFromHeader(req.headers.authorization);

  if (!token) {
    return sendUnauthorizedResponse(res, UNAUTHORIZED_MESSAGE);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return sendUnauthorizedResponse(res, INVALID_TOKEN_MESSAGE);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

export { verifyToken, requireAdmin };

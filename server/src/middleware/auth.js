import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/errors.js';

export async function verifyToken(req, res, next) {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) {
    return next(new AppError(401, 'Authentication required.'));
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET || 'change_me');
  } catch {
    return next(new AppError(401, 'Invalid or expired token.'));
  }

  try {
    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      return next(new AppError(401, 'Invalid or inactive account.'));
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      employeeRef: user.employeeRef?.toString() ?? null,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to access this resource.'));
    }
    return next();
  };
}

export function dataScope(req) {
  return {
    role: req.user.role,
    userId: req.user.id,
    employeeId: req.user.employeeRef,
  };
}

/**
 * Auth Middleware for Next.js API Routes
 */

import jwt from 'jsonwebtoken';
import User from '../models/User';

export async function authenticate(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return { error: { status: 401, message: 'No token provided' } };
  }
  
  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-__v');
    if (!user) {
      return { error: { status: 401, message: 'User not found' } };
    }
    if (!user.isApproved) {
      return { error: { status: 403, message: 'Account not approved' } };
    }
    return { user };
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return { error: { status: 401, message: msg } };
  }
}

export function requireAdmin(user) {
  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return { error: { status: 403, message: 'Admin access required' } };
  }
  return null;
}

export function requireSuperadmin(user) {
  if (user?.role !== 'superadmin') {
    return { error: { status: 403, message: 'Super Admin access required' } };
  }
  return null;
}

export function requireScanner(user) {
  if (user?.role !== 'admin' && user?.role !== 'superadmin' && user?.permissions?.canScan !== true) {
    return { error: { status: 403, message: 'Scanner access denied' } };
  }
  return null;
}

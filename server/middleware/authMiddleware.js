import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

// Role hierarchy for permission checks
const ROLE_LEVELS = { player: 1, judge: 2, admin: 3 };

// Generic role-based authorization middleware.
// Usage: authorize('admin') or authorize('judge', 'admin')
export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized, no user');
  }

  const userLevel = ROLE_LEVELS[req.user.role] || 0;
  const hasRole = allowedRoles.includes(req.user.role);

  if (!hasRole) {
    res.status(403);
    throw new Error(`Not authorized: requires ${allowedRoles.join(' or ')}`);
  }

  next();
};

// Backward-compatible admin-only middleware
export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as admin');
  }
};
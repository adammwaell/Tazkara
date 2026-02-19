/**
 * Auth API Routes - Next.js API Handler
 * Handles: /api/auth/login, /api/auth/register, /api/auth/google, /api/auth/me, etc.
 */

import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import { authenticate, requireAdmin, requireSuperadmin } from '../../../lib/auth';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const SUPER_ADMIN_EMAIL = 'dodogomma2015@gmail.com';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

async function checkEmailAccess(email) {
  const mode = (process.env.ACCESS_MODE || 'open').toLowerCase();
  if (mode === 'open') return { allowed: true };
  // For domain/whitelist modes, would need AllowedEmail model
  return { allowed: true };
}

function validatePasswordStrength(password) {
  const errors = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
  if (!/\d/.test(password)) errors.push('One number');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('One special character');
  return errors;
}

export default async function handler(req, res) {
  const { path } = req.query;
  const method = req.method;
  const endpoint = path?.[0];

  try {
    await dbConnect();

    // POST /api/auth/register
    if (method === 'POST' && endpoint === 'register') {
      const { name, email, password, confirmPassword } = req.body;

      if (!name || !email || !password || !confirmPassword) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }

      const pwdErrors = validatePasswordStrength(password);
      if (pwdErrors.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Password is too weak: ' + pwdErrors.join(', ')
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Passwords do not match' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const exists = await User.findOne({ email: normalizedEmail });
      if (exists) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }

      const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      const role = adminEmails.includes(normalizedEmail) ? 'admin' : 'user';

      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password,
        role,
        provider: 'local',
        isApproved: true,
      });

      const token = signToken(user._id);
      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: { id: user._id, name: user.name, email: user.email, picture: user.picture, role: user.role },
      });
    }

    // POST /api/auth/login
    if (method === 'POST' && endpoint === 'login') {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
      if (user && !user.password) {
        return res.status(403).json({ success: false, message: 'Use Google sign-in for this account' });
      }
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      if (!user.isApproved) {
        return res.status(403).json({ success: false, message: 'Account not approved' });
      }

      const isSuperAdmin = email.toLowerCase() === SUPER_ADMIN_EMAIL;
      if (isSuperAdmin && user.role !== 'superadmin') {
        user.role = 'superadmin';
        await user.save();
      }

      user.lastLogin = new Date();
      await user.save();

      const token = signToken(user._id);
      return res.json({
        success: true,
        token,
        user: { id: user._id, name: user.name, email: user.email, picture: user.picture, role: user.role, permissions: user.permissions },
      });
    }

    // POST /api/auth/google-access
    if (method === 'POST' && endpoint === 'google-access') {
      const { accessToken, userInfo } = req.body;
      
      try {
        const tokenInfo = await client.getTokenInfo(accessToken);
        const { email, name, sub: googleId, picture } = tokenInfo;

        const adminEmails = (process.env.ADMIN_EMAILS || '')
          .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
        const isAdminEmail = adminEmails.includes(email.toLowerCase());
        const isSuperAdmin = email.toLowerCase() === SUPER_ADMIN_EMAIL;

        let user = await User.findOne({ googleId });
        if (!user) user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
          const access = await checkEmailAccess(email);
          let role = 'user';
          if (isSuperAdmin) role = 'superadmin';
          else if (isAdminEmail) role = 'admin';

          user = await User.create({
            googleId,
            name: name || userInfo?.name || email.split('@')[0],
            email: email.toLowerCase(),
            picture: picture || userInfo?.picture || '',
            role,
            provider: 'google',
            isApproved: true,
          });
        } else {
          // Update existing user
          if (!user.googleId) {
            user.googleId = googleId;
            user.provider = 'google';
          }
          if (isSuperAdmin) {
            user.role = 'superadmin';
          } else if (isAdminEmail && user.role !== 'superadmin') {
            user.role = 'admin';
          }
          user.lastLogin = new Date();
          await user.save();
        }

        const token = signToken(user._id);
        return res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, picture: user.picture, role: user.role } });
      } catch (err) {
        console.error('[google-access]', err.message);
        return res.status(401).json({ success: false, message: 'Invalid Google token' });
      }
    }

    // GET /api/auth/me
    if (method === 'GET' && endpoint === 'me') {
      const auth = await authenticate(req);
      if (auth.error) {
        return res.status(auth.error.status).json({ success: false, message: auth.error.message });
      }
      return res.json({ success: true, user: auth.user });
    }

    // POST /api/auth/change-password
    if (method === 'POST' && endpoint === 'change-password') {
      const auth = await authenticate(req);
      if (auth.error) {
        return res.status(auth.error.status).json({ success: false, message: auth.error.message });
      }

      const { oldPassword, newPassword, confirmPassword } = req.body;
      if (!oldPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ success: false, message: 'All password fields are required' });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Passwords do not match' });
      }

      const user = await User.findById(auth.user._id).select('+password');
      if (!(await user.comparePassword(oldPassword))) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }

      const pwdErrors = validatePasswordStrength(newPassword);
      if (pwdErrors.length > 0) {
        return res.status(400).json({ success: false, message: 'Password is too weak: ' + pwdErrors.join(', ') });
      }

      user.password = newPassword;
      await user.save();

      return res.json({ success: true, message: 'Password updated successfully' });
    }

    // GET /api/auth/users (admin only)
    if (method === 'GET' && endpoint === 'users') {
      const auth = await authenticate(req);
      if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });
      
      const adminError = requireAdmin(auth.user);
      if (adminError) return res.status(adminError.status).json({ success: false, message: adminError.message });

      const users = await User.find({}).select('-__v');
      return res.json({ success: true, users });
    }

    // Default 404
    return res.status(404).json({ success: false, message: 'Endpoint not found' });

  } catch (err) {
    console.error('[auth API]', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

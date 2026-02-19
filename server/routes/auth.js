/**
 * Auth Routes — Google OAuth 2.0 only
 *
 * POST /api/auth/google         — verify Google ID token (credential flow, most secure)
 * POST /api/auth/google-access  — verify access token (implicit flow fallback)
 * GET  /api/auth/me             — get current user profile
 * GET  /api/auth/whitelist      — admin: list allowed emails
 * POST /api/auth/whitelist      — admin: add email to whitelist
 * DELETE /api/auth/whitelist/:id — admin: remove from whitelist
 */

const express           = require('express');
const jwt               = require('jsonwebtoken');
const { OAuth2Client }  = require('google-auth-library');
const User              = require('../models/User');
const AllowedEmail      = require('../models/AllowedEmail');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Shared helpers ────────────────────────────────────────────────────────────

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * Check whether an email is permitted to access the platform.
 * Controlled by ACCESS_MODE env var:
 *   open      → any verified Google account
 *   domain    → only @domain emails from ALLOWED_DOMAINS
 *   whitelist → only emails manually added by admin
 */
async function checkEmailAccess(email) {
  const mode = (process.env.ACCESS_MODE || 'open').toLowerCase();

  if (mode === 'open') return { allowed: true };

  if (mode === 'domain') {
    const domains = (process.env.ALLOWED_DOMAINS || '')
      .split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domains.includes(domain)) {
      return {
        allowed: false,
        reason: domains.length
          ? `Only accounts from ${domains.join(', ')} are permitted`
          : 'Domain access not configured — contact your administrator',
      };
    }
    return { allowed: true };
  }

  if (mode === 'whitelist') {
    const entry = await AllowedEmail.findOne({ email: email.toLowerCase() });
    if (!entry) {
      return {
        allowed: false,
        reason: 'Your email is not on the access list. Contact the administrator.',
      };
    }
    return { allowed: true, role: entry.role };
  }

  return { allowed: false, reason: 'Access restricted' };
}

/**
 * Upsert a verified Google user into MongoDB.
 * Safe for legacy users: never overwrites role if already admin,
 * unless the email is explicitly in ADMIN_EMAILS.
 */
async function upsertGoogleUser({ googleId, email, name, picture }) {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const isAdminEmail = adminEmails.includes(email.toLowerCase());

  let user = await User.findOne({ googleId });

  // Also try finding by email (covers legacy password users being migrated)
  if (!user) user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Brand new user
    const access = await checkEmailAccess(email);
    const role = isAdminEmail ? 'admin' : (access.role || 'user');
    user = await User.create({
      googleId,
      name,
      email: email.toLowerCase(),
      picture: picture || '',
      role,
      provider: 'google',
      isApproved: true,
      lastLogin: new Date(),
    });
  } else {
    // Existing user — update profile but preserve role unless forced admin
    if (!user.googleId) user.googleId = googleId; // migrate legacy user
    user.name      = name;
    user.picture   = picture || user.picture;
    user.lastLogin = new Date();
    if (!user.provider) user.provider = user.password ? 'local' : 'google';
    if (isAdminEmail && user.role !== 'admin') user.role = 'admin';
    await user.save();
  }

  return user;
}

/** Shared final step: access check → upsert → JWT */
async function finishGoogleAuth(res, { googleId, email, name, picture, email_verified }) {
  // 1. Require verified email
  if (!email_verified) {
    return res.status(403).json({ success: false, message: 'Google email is not verified' });
  }

  // 2. Basic format guard (Google should always pass this, but be explicit)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(403).json({ success: false, message: 'Invalid email format' });
  }

  // 3. Access control
  const access = await checkEmailAccess(email);
  if (!access.allowed) {
    return res.status(403).json({
      success: false,
      message: access.reason || 'Access denied',
      code: 'ACCESS_DENIED',
    });
  }

  // 4. Upsert user (safe for legacy records)
  const user = await upsertGoogleUser({ googleId, email, name, picture });

  if (!user.isApproved) {
    return res.status(403).json({ success: false, message: 'Account pending approval' });
  }

  // 5. Issue JWT
  const token = signToken(user._id);
  return res.json({
    success: true,
    token,
    user: { id: user._id, name: user.name, email: user.email, picture: user.picture, role: user.role },
  });
}

// ── POST /api/auth/signup — email/password registration ──────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ success: false, message: 'Invalid email format' });

    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const normalizedEmail = email.toLowerCase().trim();
    const access = await checkEmailAccess(normalizedEmail);
    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: access.reason || 'Access denied',
        code: 'ACCESS_DENIED',
      });
    }

    const exists = await User.findOne({ email: normalizedEmail }).select('+password');
    if (exists && exists.password)
      return res.status(409).json({ success: false, message: 'Email already registered' });

    // Check if this email should be admin
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const role = adminEmails.includes(normalizedEmail) ? 'admin' : (access.role || 'user');

    let user = exists;
    if (user) {
      // Link local credentials to existing Google account
      user.name = user.name || name.trim();
      user.password = password;
      user.provider = 'local';
      user.isApproved = true;
      user.lastLogin = new Date();
      if (role === 'admin' && user.role !== 'admin') user.role = 'admin';
      await user.save();
    } else {
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password,
        role,
        provider: 'local',
        isApproved: true,
      });
    }

    const token = signToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, picture: user.picture, role: user.role },
    });
  } catch (err) {
    console.error('[auth/signup]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/auth/login — email/password login ───────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required' });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ success: false, message: 'Invalid email format' });

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (user && !user.password)
      return res.status(403).json({ success: false, message: 'Use Google sign-in for this account' });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    if (!user.isApproved)
      return res.status(403).json({ success: false, message: 'Account not approved' });

    user.lastLogin = new Date();
    await user.save();

    const token = signToken(user._id);
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, picture: user.picture, role: user.role },
    });
  } catch (err) {
    console.error('[auth/login]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/auth/google — ID token flow (most secure) ──────────────────────
// Used when Google returns a `credential` (One Tap, GSI button).
// The ID token is verified cryptographically server-side — no extra network call.
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ success: false, message: 'idToken required' });

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub: googleId, email, name, picture, email_verified } = ticket.getPayload();
    return finishGoogleAuth(res, { googleId, email, name, picture, email_verified });
  } catch (err) {
    console.error('[auth/google] error:', err.message);
    return res.status(401).json({ success: false, message: 'Google ID token verification failed' });
  }
});

// ── POST /api/auth/google-access — access token flow (implicit fallback) ─────
// Used by @react-oauth/google useGoogleLogin which returns access_token, not idToken.
// We verify by calling Google's tokeninfo endpoint, then userinfo for profile data.
//
// Security note: tokeninfo for access tokens returns "azp" (authorised party) which
// equals the client ID — NOT "aud" which for access tokens is an API resource URL.
// We check azp here, not aud.
router.post('/google-access', async (req, res) => {
  try {
    const { accessToken, userInfo } = req.body;
    if (!accessToken || !userInfo) {
      return res.status(400).json({ success: false, message: 'accessToken and userInfo required' });
    }

    // Verify access token with Google (confirms it was issued by Google and is not expired)
    const tokenInfoUrl = `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`;
    const tokenInfoRes = await fetch(tokenInfoUrl);
    const tokenInfo    = await tokenInfoRes.json();

    if (tokenInfo.error) {
      return res.status(401).json({ success: false, message: 'Invalid or expired Google token' });
    }

    // For access tokens: check azp (authorized party) = our client ID
    // azp is set when the token was requested with an OAuth client
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (tokenInfo.azp !== clientId && tokenInfo.aud !== clientId) {
      console.error('[auth/google-access] azp mismatch:', { azp: tokenInfo.azp, aud: tokenInfo.aud, clientId });
      return res.status(401).json({ success: false, message: 'Token not issued for this application' });
    }

    // Use userInfo returned from frontend (already fetched from /userinfo endpoint)
    const { sub: googleId, email, name, picture, email_verified } = userInfo;
    if (!googleId || !email) {
      return res.status(400).json({ success: false, message: 'Incomplete user info from Google' });
    }

    return finishGoogleAuth(res, {
      googleId,
      email,
      name,
      picture,
      // tokeninfo email_verified is a string 'true'/'false'; userInfo is boolean
      email_verified: email_verified === true || tokenInfo.email_verified === 'true',
    });
  } catch (err) {
    console.error('[auth/google-access] error:', err.message);
    return res.status(401).json({ success: false, message: 'Authentication failed' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ── Whitelist management (admin only) ────────────────────────────────────────

router.get('/whitelist', protect, adminOnly, async (req, res) => {
  try {
    const list = await AllowedEmail.find().sort({ createdAt: -1 });
    res.json({ success: true, list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/whitelist', protect, adminOnly, async (req, res) => {
  try {
    const { email, note, role } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    const entry = await AllowedEmail.create({
      email: email.toLowerCase().trim(),
      note:  note || '',
      role:  role || 'user',
      addedBy: req.user._id,
    });
    res.status(201).json({ success: true, entry });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email already in whitelist' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/whitelist/:id', protect, adminOnly, async (req, res) => {
  try {
    await AllowedEmail.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Removed from whitelist' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── UPDATE USER PERMISSIONS (admin) ────────────────────────────────────────
router.patch('/users/:id/permissions', protect, adminOnly, async (req, res) => {
  try {
    const { canScan } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 'permissions.canScan': canScan },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'Permissions updated', user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET ALL USERS (admin) ────────────────────────────────────────────────
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

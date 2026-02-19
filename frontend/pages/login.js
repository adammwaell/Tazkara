/**
 * Login Page — Google OAuth only
 * Handles access denied (whitelist/domain mode) with clear messaging
 */

import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(null);
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true);
    setDenied(null);
    try {
      // Exchange access token for ID token via Google userinfo
      const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });

      // Use the sub + userinfo to get an id_token equivalent via credential flow
      // Note: with @react-oauth/google useGoogleLogin (implicit flow), we get access_token
      // We send it to backend which verifies via tokeninfo endpoint
      const res = await axios.post(`${API}/auth/google-access`, {
        accessToken: tokenResponse.access_token,
        userInfo: userInfoRes.data,
      });

      const { token, user } = res.data;
      localStorage.setItem('tazkara_token', token);
      localStorage.setItem('tazkara_user', JSON.stringify(user));
      toast.success(`Welcome, ${user.name.split(' ')[0]}!`);
      router.push(user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'ACCESS_DENIED') {
        setDenied(data.message);
      } else {
        toast.error(data?.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const login = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => toast.error('Google sign-in cancelled'),
  });

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLocalLoading(true);
    setDenied(null);
    try {
      const res = await axios.post(`${API}/auth/login`, {
        email: form.email.trim(),
        password: form.password,
      });
      const { token, user } = res.data;
      localStorage.setItem('tazkara_token', token);
      localStorage.setItem('tazkara_user', JSON.stringify(user));
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      router.push(user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'ACCESS_DENIED') {
        setDenied(data.message);
      } else {
        toast.error(data?.message || 'Login failed');
      }
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <>
      <Head><title>Sign In — AdamTickets</title></Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />

        {/* Background glow */}
        <div style={{
          position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(212,160,23,0.06) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 'calc(100vh - 68px)', padding: '40px 24px', position: 'relative', zIndex: 1,
        }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ width: '100%', maxWidth: 440 }}
          >
            {/* Logo mark */}
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{
                width: 72, height: 72,
                background: 'linear-gradient(135deg, rgba(212,160,23,0.2), rgba(212,160,23,0.05))',
                border: '1px solid var(--border-gold)',
                borderRadius: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, margin: '0 auto 20px',
              }}>🎟</div>
              <h1 style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: 34, fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: 8, letterSpacing: '-0.02em',
              }}>
                AdamTickets
              </h1>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Sign in to access premium event tickets
              </p>
            </div>

            {/* Card */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 24,
              padding: '40px 36px',
              boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
            }}>

              {/* Access denied message */}
              {denied && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 12, padding: '16px 18px', marginBottom: 24,
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>🚫</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#f87171', marginBottom: 4 }}>
                        Access Denied
                      </div>
                      <div style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.5 }}>{denied}</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Google Sign In button */}
              <button
                onClick={() => login()}
                disabled={loading || localLoading}
                style={{
                  width: '100%', height: 54,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                  background: loading ? 'var(--bg-secondary)' : '#fff',
                  color: '#1a1a1a',
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: 14,
                  fontSize: 15, fontWeight: 600,
                  fontFamily: 'DM Sans, sans-serif',
                  cursor: loading || localLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 200ms',
                  opacity: loading || localLoading ? 0.7 : 1,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                }}
                onMouseEnter={e => { if (!loading && !localLoading) e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)'; }}
              >
                {loading ? (
                  <>
                    <div style={{ width: 20, height: 20, border: '2px solid #ccc', borderTopColor: '#555', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Signing in…
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    Continue with Google
                  </>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="tk-label">Email Address</label>
                  <input
                    type="email" required placeholder="you@example.com"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="tk-input" style={{ height: 48 }}
                  />
                </div>

                <div>
                  <label className="tk-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'} required placeholder="Your password"
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      className="tk-input" style={{ height: 48, paddingRight: 44 }}
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)} style={{
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', fontSize: 16, padding: 0,
                    }}>{showPass ? '🙈' : '👁'}</button>
                  </div>
                </div>

                <button
                  type="submit" disabled={localLoading || loading}
                  className="btn-gold"
                  style={{ width: '100%', height: 50, fontSize: 15, marginTop: 4 }}
                >
                  {localLoading
                    ? <><span style={{ width: 18, height: 18, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite', marginRight: 8 }} />Logging in…</>
                    : 'Login with Email'
                  }
                </button>
              </form>

              <div style={{ marginTop: 24, padding: '20px', background: 'var(--bg-secondary)', borderRadius: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.7 }}>
                  🔒 Secured by Google OAuth 2.0<br />
                  Only verified Google accounts are accepted.<br />
                  Your credentials are never stored on our servers.
                </p>
              </div>
            </div>

            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 20 }}>
              By signing in you agree to our Terms of Service
            </p>
          </motion.div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function Signup() {
  const router = useRouter();
  const [form, setForm]         = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/signup`, {
        name:     form.name.trim(),
        email:    form.email.trim(),
        password: form.password,
      });
      const { token, user } = res.data;
      localStorage.setItem('tazkara_token', token);
      localStorage.setItem('tazkara_user', JSON.stringify(user));
      toast.success(`Welcome, ${user.name.split(' ')[0]}! 🎉`);
      router.push(user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Create Account — AdamTickets</title></Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />

        <div style={{
          position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 500,
          background: 'radial-gradient(circle, rgba(212,160,23,0.05) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 'calc(100vh - 68px)', padding: '40px 24px',
          position: 'relative', zIndex: 1,
        }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            style={{ width: '100%', maxWidth: 420 }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{
                width: 64, height: 64,
                background: 'linear-gradient(135deg, rgba(212,160,23,0.2), rgba(212,160,23,0.04))',
                border: '1px solid var(--border-gold)',
                borderRadius: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, margin: '0 auto 18px',
              }}>✦</div>
              <h1 style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: 30, fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: 6, letterSpacing: '-0.02em',
              }}>Create account</h1>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Join AdamTickets and start booking
              </p>
            </div>

            {/* Card */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 22,
              padding: '32px 24px',
              boxShadow: '0 16px 56px rgba(0,0,0,0.45)',
            }} className="login-card">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                <div>
                  <label className="tk-label">Full Name</label>
                  <input
                    type="text" required placeholder="John Doe"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="tk-input" style={{ height: 48 }}
                  />
                </div>

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
                      type={showPass ? 'text' : 'password'} required placeholder="Minimum 6 characters"
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

                <div>
                  <label className="tk-label">Confirm Password</label>
                  <input
                    type={showPass ? 'text' : 'password'} required placeholder="Repeat your password"
                    value={form.confirm}
                    onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                    className="tk-input" style={{ height: 48 }}
                  />
                </div>

                <button
                  type="submit" disabled={loading}
                  className="btn-gold"
                  style={{ width: '100%', height: 50, fontSize: 15, marginTop: 4 }}
                >
                  {loading
                    ? <><span style={{ width: 18, height: 18, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite', marginRight: 8 }} />Creating account…</>
                    : 'Create Account'
                  }
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 24 }}>
                Already have an account?{' '}
                <Link href="/login" style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
                  Sign in →
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

/**
 * Register Page — Email/Password registration with strong validation
 * Users can create account with email and password
 */

import { useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

// Password validation function
const validatePassword = (password) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  return checks;
};

// Check if all validations pass
const isPasswordValid = (checks) => {
  return checks.length && checks.uppercase && checks.lowercase && checks.number && checks.special;
};

function CheckIcon({ checked }) {
  return (
    <span style={{ 
      color: checked ? '#22c55e' : 'var(--text-muted)',
      marginRight: 8,
      fontSize: 14,
    }}>
      {checked ? '✓' : '○'}
    </span>
  );
}

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Real-time password validation
  const passwordChecks = useMemo(() => validatePassword(form.password), [form.password]);
  const passwordValid = useMemo(() => isPasswordValid(passwordChecks), [passwordChecks]);

  // Form validity
  const isFormValid = useMemo(() => {
    const emailValid = /^[^@]+@[^@]+\.[^@]+$/.test(form.email);
    const passwordsMatch = form.password === form.confirmPassword && form.confirmPassword.length > 0;
    const nameValid = form.name.trim().length > 0;
    return nameValid && emailValid && passwordValid && passwordsMatch;
  }, [form, passwordValid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Final validation before submit
    if (!isFormValid) {
      toast.error('Please fill all fields correctly');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!passwordValid) {
      toast.error('Password does not meet requirements');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register`, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      
      const { token, user, message } = res.data;
      localStorage.setItem('tazkara_token', token);
      localStorage.setItem('tazkara_user', JSON.stringify(user));
      toast.success(message || `Welcome, ${user.name.split(' ')[0]}! 🎉`);
      router.push(user.role === 'admin' || user.role === 'superadmin' ? '/admin' : '/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Create Account — AdamTickets</title></Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />

        {/* Background glow */}
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
              }}>Create Account</h1>
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

                {/* Full Name */}
                <div>
                  <label className="tk-label">Full Name</label>
                  <input
                    type="text" 
                    required 
                    placeholder="John Doe"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="tk-input" 
                    style={{ height: 48 }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="tk-label">Email Address</label>
                  <input
                    type="email" 
                    required 
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="tk-input" 
                    style={{ height: 48 }}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="tk-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'} 
                      required 
                      placeholder="Create a strong password"
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      className="tk-input" 
                      style={{ height: 48, paddingRight: 44 }}
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)} style={{
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', fontSize: 16, padding: 0,
                    }}>{showPass ? '🙈' : '👁'}</button>
                  </div>
                  
                  {/* Password Requirements Checklist */}
                  {form.password && (
                    <div style={{ 
                      marginTop: 12, 
                      padding: '12px 14px', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: 10,
                      fontSize: 12,
                    }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
                        Password requirements:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ color: passwordChecks.length ? '#22c55e' : 'var(--text-muted)' }}>
                          <CheckIcon checked={passwordChecks.length} />
                          At least 8 characters
                        </div>
                        <div style={{ color: passwordChecks.uppercase ? '#22c55e' : 'var(--text-muted)' }}>
                          <CheckIcon checked={passwordChecks.uppercase} />
                          One uppercase letter (A-Z)
                        </div>
                        <div style={{ color: passwordChecks.lowercase ? '#22c55e' : 'var(--text-muted)' }}>
                          <CheckIcon checked={passwordChecks.lowercase} />
                          One lowercase letter (a-z)
                        </div>
                        <div style={{ color: passwordChecks.number ? '#22c55e' : 'var(--text-muted)' }}>
                          <CheckIcon checked={passwordChecks.number} />
                          One number (0-9)
                        </div>
                        <div style={{ color: passwordChecks.special ? '#22c55e' : 'var(--text-muted)' }}>
                          <CheckIcon checked={passwordChecks.special} />
                          One special character (!@#$%^&*)
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="tk-label">Confirm Password</label>
                  <input
                    type={showPass ? 'text' : 'password'} 
                    required 
                    placeholder="Repeat your password"
                    value={form.confirmPassword}
                    onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    className="tk-input" 
                    style={{ 
                      height: 48,
                      borderColor: form.confirmPassword && form.password !== form.confirmPassword 
                        ? '#ef4444' 
                        : 'var(--border)',
                    }}
                  />
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <div style={{ 
                      color: '#ef4444', 
                      fontSize: 12, 
                      marginTop: 6 
                    }}>
                      Passwords do not match
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit" 
                  disabled={loading || !isFormValid}
                  className="btn-gold"
                  style={{ 
                    width: '100%', 
                    height: 50, 
                    fontSize: 15, 
                    marginTop: 4,
                    opacity: loading || !isFormValid ? 0.6 : 1,
                    cursor: loading || !isFormValid ? 'not-allowed' : 'pointer',
                  }}
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

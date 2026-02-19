import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { toast } from 'react-toastify';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Password validation function
const validatePassword = (password) => {
  const errors = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
  if (!/\d/.test(password)) errors.push('One number');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('One special character');
  return errors;
};

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);

  // Validate password and return error messages
  const getPasswordErrors = (newPassword) => {
    const pwdErrors = validatePassword(newPassword);
    return pwdErrors;
  };

  // Check if form is valid
  const isFormValid = () => {
    if (!passwords.oldPassword || !passwords.newPassword || !passwords.confirmPassword) {
      return false;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      return false;
    }
    const pwdErrors = getPasswordErrors(passwords.newPassword);
    if (pwdErrors.length > 0) {
      return false;
    }
    return true;
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tazkara_token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('tazkara_user') : null;
    
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(storedUser));
    setLoading(false);
  }, [router]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Frontend validation
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const pwdErrors = getPasswordErrors(passwords.newPassword);
    if (pwdErrors.length > 0) {
      toast.error('Password is too weak. Please use a stronger password.');
      return;
    }

    setChangingPassword(true);
    try {
      const token = localStorage.getItem('tazkara_token');
      await axios.post(`${API}/auth/change-password`, passwords, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Password updated successfully');
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleInputChange = (field, value) => {
    setPasswords(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tazkara_token');
    localStorage.removeItem('tazkara_user');
    router.push('/');
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--bg-primary)'
      }}>
        <div style={{ color: 'var(--text-primary)' }}>Loading...</div>
      </div>
    );
  }

  const roleColors = {
    superadmin: { bg: 'rgba(212,160,23,0.15)', color: 'var(--gold)', label: 'Super Admin' },
    admin: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Admin' },
    user: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'User' }
  };
  
  const roleStyle = roleColors[user?.role] || roleColors.user;
  const createdDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'N/A';

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--bg-primary)',
      padding: '40px 20px',
      fontFamily: 'DM Sans, sans-serif'
    }}>
      <div style={{ 
        maxWidth: 600, 
        margin: '0 auto' 
      }}>
        {/* Header */}
        <div style={{ 
          marginBottom: 32,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button 
              onClick={() => router.push('/')}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              ← Back
            </button>
            <h1 style={{ 
              fontSize: 28, 
              fontWeight: 700, 
              color: 'var(--text-primary)',
              fontFamily: 'Playfair Display, serif'
            }}>
              My Profile
            </h1>
          </div>
          <button 
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            Logout
          </button>
        </div>

        {/* Profile Info Card */}
        <div className="tk-card" style={{ padding: 32, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'var(--gold-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              color: 'var(--gold)',
              fontWeight: 700
            }}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h2 style={{ 
                fontSize: 22, 
                fontWeight: 700, 
                color: 'var(--text-primary)',
                marginBottom: 4
              }}>
                {user?.name || 'User'}
              </h2>
              <span style={{
                padding: '4px 12px',
                borderRadius: 20,
                background: roleStyle.bg,
                color: roleStyle.color,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.05em'
              }}>
                {roleStyle.label}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ 
              padding: '16px 20px', 
              background: 'var(--bg-secondary)', 
              borderRadius: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Email</span>
              <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}>
                {user?.email || 'N/A'}
              </span>
            </div>

            <div style={{ 
              padding: '16px 20px', 
              background: 'var(--bg-secondary)', 
              borderRadius: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Member Since</span>
              <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}>
                {createdDate}
              </span>
            </div>

            {user?.googleId && (
              <div style={{ 
                padding: '16px 20px', 
                background: 'var(--bg-secondary)', 
                borderRadius: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Login Method</span>
                <span style={{ color: 'var(--gold)', fontSize: 14, fontWeight: 500 }}>
                  Google Account
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Change Password Card */}
        <div className="tk-card" style={{ padding: 32 }}>
          <h3 style={{ 
            fontSize: 18, 
            fontWeight: 600, 
            color: 'var(--text-primary)',
            marginBottom: 20
          }}>
            Change Password
          </h3>

          {user?.googleId ? (
            <div style={{
              padding: 20,
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 10,
              color: '#3b82f6',
              fontSize: 14,
              textAlign: 'center'
            }}>
              Password cannot be changed for Google OAuth accounts
            </div>
          ) : (
            <form onSubmit={handlePasswordChange}>
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 8, 
                    color: 'var(--text-secondary)', 
                    fontSize: 14,
                    fontWeight: 500
                  }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwords.oldPassword}
                    onChange={(e) => setPasswords(p => ({ ...p, oldPassword: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    placeholder="Enter current password"
                    required
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 8, 
                    color: 'var(--text-secondary)', 
                    fontSize: 14,
                    fontWeight: 500
                  }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    placeholder="Enter new password"
                    required
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 8, 
                    color: 'var(--text-secondary)', 
                    fontSize: 14,
                    fontWeight: 500
                  }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={changingPassword || !isFormValid()}
                  className="btn-gold"
                  style={{ 
                    marginTop: 8,
                    width: '100%',
                    padding: '14px 28px',
                    fontSize: 15,
                    opacity: (changingPassword || !isFormValid()) ? 0.5 : 1,
                    cursor: (changingPassword || !isFormValid()) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {changingPassword ? 'Changing Password...' : 'Change Password'}
                </button>

                {/* Password Requirements */}
                {passwords.newPassword && (
                  <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Password requirements:</p>
                    <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 11, color: 'var(--text-muted)' }}>
                      <li style={{ color: passwords.newPassword.length >= 8 ? '#22c55e' : 'var(--text-muted)' }}>At least 8 characters</li>
                      <li style={{ color: /[A-Z]/.test(passwords.newPassword) ? '#22c55e' : 'var(--text-muted)' }}>One uppercase letter</li>
                      <li style={{ color: /[a-z]/.test(passwords.newPassword) ? '#22c55e' : 'var(--text-muted)' }}>One lowercase letter</li>
                      <li style={{ color: /\d/.test(passwords.newPassword) ? '#22c55e' : 'var(--text-muted)' }}>One number</li>
                      <li style={{ color: /[!@#$%^&*(),.?\":{}|<>]/.test(passwords.newPassword) ? '#22c55e' : 'var(--text-muted)' }}>One special character</li>
                    </ul>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

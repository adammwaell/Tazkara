/**
 * Premium Navbar — AdamTickets
 * Dark/light mode toggle, auth state, responsive mobile menu
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('tazkara_user');
    if (stored) setUser(JSON.parse(stored));
    const theme = localStorage.getItem('tk_theme') || 'dark';
    setIsDark(theme === 'dark');

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [router.pathname]);

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    localStorage.setItem('tk_theme', next);
    if (next === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tazkara_token');
    localStorage.removeItem('tazkara_user');
    setUser(null);
    setMenuOpen(false);
    router.push('/');
  };

  const navLinks = [
    { href: '/', label: 'Events' },
    ...(user ? [{ href: '/dashboard', label: 'My Tickets' }] : []),
    ...(user?.role === 'admin' ? [{ href: '/admin', label: 'Admin', isAdmin: true }] : []),
  ];

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: scrolled ? 'rgba(10,10,8,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'all 300ms ease',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36,
              background: 'var(--gold)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>🎟</div>
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', lineHeight: 1 }}>
                AdamTickets
              </div>
              <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
                Premium Events
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="hidden md:flex">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} style={{
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                color: link.isAdmin ? 'var(--gold)' : router.pathname === link.href ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: router.pathname === link.href ? 'var(--bg-card)' : 'transparent',
                transition: 'all 200ms',
              }}
              onMouseEnter={e => { if (router.pathname !== link.href) e.target.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { if (router.pathname !== link.href) e.target.style.color = link.isAdmin ? 'var(--gold)' : 'var(--text-secondary)'; }}
              >
                {link.label}
              </Link>
            ))}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                width: 36, height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 200ms',
                marginLeft: 4,
              }}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                <div style={{
                  padding: '6px 14px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                }}>
                  {user.name.split(' ')[0]}
                  {user.role === 'admin' && <span style={{ color: 'var(--gold)', marginLeft: 6, fontSize: 11 }}>ADMIN</span>}
                </div>
                <button onClick={handleLogout} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 13 }}>
                  Logout
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                
                <Link href="/login" className="btn-gold" style={{ padding: '9px 20px' }}>Sign In</Link>
              </div>
            )}
          </div>

          {/* Mobile: theme + hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="flex md:hidden">
            <button onClick={toggleTheme} style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}>
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
                color: 'var(--text-primary)', cursor: 'pointer', fontSize: 18,
              }}
            >
              {menuOpen ? '✕' : '≡'}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                borderTop: '1px solid var(--border)',
                paddingBottom: 16,
                overflow: 'hidden',
              }}
            >
              {navLinks.map(link => (
                <Link key={link.href} href={link.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'block', padding: '12px 4px',
                    color: link.isAdmin ? 'var(--gold)' : 'var(--text-secondary)',
                    textDecoration: 'none', fontSize: 15, fontWeight: 500,
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <button onClick={handleLogout} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '12px 4px', color: '#f87171', fontSize: 15,
                  background: 'none', border: 'none', cursor: 'pointer', marginTop: 4,
                }}>
                  Logout
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  
                  <Link href="/login" className="btn-gold" onClick={() => setMenuOpen(false)} style={{ flex: 1, justifyContent: 'center' }}>Sign In</Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

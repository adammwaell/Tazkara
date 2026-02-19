import '../styles/globals.css';
import { useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

// Global error handler to prevent crashes from injected third-party scripts
if (typeof window !== 'undefined') {
  // Prevent crashes from extension-injected scripts
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (msg.includes('ethereum') || 
        msg.includes('firefox') || 
        msg.includes('reader') ||
        msg.includes('webkit') ||
        msg.includes('_firefox_') ||
        msg.includes('chrome') ||
        msg.includes('safari')) {
      event.preventDefault();
    }
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason || '';
    if (typeof reason === 'string' && (
      reason.includes('ethereum') || 
      reason.includes('firefox') ||
      reason.includes('_firefox_')
    )) {
      event.preventDefault();
    }
  });

  // Initialize safe globals for extensions that expect them
  try {
    if (window.ethereum === undefined) Object.defineProperty(window, 'ethereum', { value: undefined, writable: true });
    if (window._firefox_ === undefined) Object.defineProperty(window, '_firefox_', { value: {}, writable: true });
    if (window.webkit === undefined) Object.defineProperty(window, 'webkit', { value: {}, writable: true });
  } catch (e) {}
}

export default function App({ Component, pageProps }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('tk_theme') || 'dark';
    if (saved === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Show a helpful message instead of a cryptic crash
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a08', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif',
      }}>
        <div style={{
          background: '#1a1a16', border: '1px solid rgba(212,160,23,0.3)',
          borderRadius: 16, padding: '40px 48px', maxWidth: 480, textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: '#d4a017', marginBottom: 12, fontFamily: 'serif' }}>
            Missing Google Client ID
          </h2>
          <p style={{ color: '#a8a89a', lineHeight: 1.7, marginBottom: 20 }}>
            Create a file called <code style={{ background: '#0a0a08', padding: '2px 8px', borderRadius: 4, color: '#f0efe8' }}>.env.local</code> inside
            your <strong style={{ color: '#f0efe8' }}>frontend/</strong> folder with:
          </p>
          <pre style={{
            background: '#0a0a08', border: '1px solid #2a2a1e',
            borderRadius: 8, padding: '14px 18px', textAlign: 'left',
            color: '#4ade80', fontSize: 13, lineHeight: 1.8, overflowX: 'auto',
          }}>
{`NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`}
          </pre>
          <p style={{ color: '#606058', fontSize: 13, marginTop: 16 }}>
            Then restart the frontend with <code style={{ color: '#f0efe8' }}>npm run dev</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: 'DM Sans, sans-serif',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
          success: { iconTheme: { primary: '#d4a017', secondary: '#0a0a08' } },
          error:   { iconTheme: { primary: '#f87171', secondary: '#0a0a08' } },
        }}
      />
    </GoogleOAuthProvider>
  );
}

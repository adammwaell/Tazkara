import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import axios from 'axios';
import Navbar from '../components/Navbar';
import TicketCard from '../components/TicketCard';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function Dashboard() {
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const storedUser = localStorage.getItem('tazkara_user');
    const token = localStorage.getItem('tazkara_token');
    if (!token || !storedUser) { router.push('/login'); return; }
    setUser(JSON.parse(storedUser));
    axios.get(`${API}/tickets/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setTickets(res.data.tickets || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);
  const stats = {
    total: tickets.length,
    active: tickets.filter(t => t.status === 'active').length,
    used: tickets.filter(t => t.status === 'used').length,
  };

  return (
    <>
      <Head><title>My Tickets — AdamTickets</title></Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />

        <div style={{ maxWidth: 860, margin: '0 auto', padding: '56px 24px 96px' }}>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 48 }}>
            <div className="gold-line" style={{ marginBottom: 16 }} />
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              My Tickets
            </h1>
            {user && <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Welcome back, {user.name}</p>}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="stats-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 40 }}
          >
            {[
              { label: 'Total Tickets', value: stats.total, color: 'var(--text-primary)' },
              { label: 'Active', value: stats.active, color: '#4ade80' },
              { label: 'Used', value: stats.used, color: 'var(--text-muted)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '20px 24px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 32, fontWeight: 800, color, fontFamily: 'DM Sans, sans-serif', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              </div>
            ))}
          </motion.div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
            {['all', 'active', 'used', 'cancelled'].map(tab => (
              <button key={tab} onClick={() => setFilter(tab)} style={{
                padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', transition: 'all 200ms', border: 'none', textTransform: 'capitalize',
                background: filter === tab ? 'var(--gold)' : 'var(--bg-card)',
                color: filter === tab ? '#0a0a08' : 'var(--text-secondary)',
                border: `1px solid ${filter === tab ? 'transparent' : 'var(--border)'}`,
              }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Tickets */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ textAlign: 'center', padding: '80px 0' }}
            >
              <div style={{ fontSize: 56, opacity: 0.3, marginBottom: 16 }}>🎫</div>
              <p style={{ fontSize: 18, color: 'var(--text-secondary)', marginBottom: 8 }}>
                {filter === 'all' ? 'No tickets yet' : `No ${filter} tickets`}
              </p>
              {filter === 'all' && (
                <button onClick={() => router.push('/')} className="btn-gold" style={{ marginTop: 20 }}>
                  Browse Events
                </button>
              )}
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filtered.map(ticket => <TicketCard key={ticket._id} ticket={ticket} />)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

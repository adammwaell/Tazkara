/**
 * Homepage — Premium event listing
 */

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import EventCard from '../components/EventCard';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    axios.get(`${API}/events`)
      .then(res => setEvents(res.data.events || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' ? true : filter === 'available' ? !e.isSoldOut : e.isSoldOut;
    return matchSearch && matchFilter;
  });

  return (
    <>
      <Head>
        <title>AdamTickets — Premium Event Tickets</title>
        <meta name="description" content="Book tickets for the world's finest events" />
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section style={{ position: 'relative', overflow: 'hidden', padding: '60px 24px 60px' }}>
          {/* Background texture */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0,
            background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(212,160,23,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Decorative lines */}
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: 1, height: '100%',
            background: 'linear-gradient(to bottom, var(--gold), transparent)',
            opacity: 0.08, zIndex: 0,
          }} />

          <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'var(--gold-dim)', border: '1px solid var(--border-gold)',
                borderRadius: 20, padding: '6px 18px', marginBottom: 32,
              }}>
                <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  ✦ Live Events Now Available
                </span>
              </div>

              <h1 style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: 'clamp(42px, 7vw, 80px)',
                fontWeight: 800,
                color: 'var(--text-primary)',
                lineHeight: 1.1,
                marginBottom: 24,
                letterSpacing: '-0.02em',
              }}>
                Extraordinary<br />
                <span style={{ color: 'var(--gold)' }}>Experiences</span> Await
              </h1>

              <p style={{
                fontSize: 18, color: 'var(--text-secondary)',
                maxWidth: 520, margin: '0 auto 48px',
                lineHeight: 1.7,
              }}>
                Premium tickets for concerts, sports, and cultural events — curated for those who demand the best.
              </p>
            </motion.div>

            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}
            >
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }}
                  width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search events, artists, venues…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="tk-input"
                  style={{ paddingLeft: 48, fontSize: 15, height: 54, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Filter tabs + Events ──────────────────────────────────── */}
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 96px' }}>
          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'all', label: 'All Events' },
                { key: 'available', label: 'Available' },
                { key: 'soldout', label: 'Sold Out' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', transition: 'all 200ms', border: 'none',
                    background: filter === f.key ? 'var(--gold)' : 'var(--bg-card)',
                    color: filter === f.key ? '#0a0a08' : 'var(--text-secondary)',
                    border: `1px solid ${filter === f.key ? 'transparent' : 'var(--border)'}`,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {filtered.length} event{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Grid */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div className="skeleton" style={{ height: 220 }} />
                  <div style={{ padding: 22, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="skeleton" style={{ height: 20, width: '75%' }} />
                    <div className="skeleton" style={{ height: 14, width: '50%' }} />
                    <div className="skeleton" style={{ height: 14, width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}
            >
              <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.4 }}>🎭</div>
              <p style={{ fontSize: 18, marginBottom: 8, color: 'var(--text-secondary)' }}>No events found</p>
              {search && <p style={{ fontSize: 14 }}>Try a different search term</p>}
            </motion.div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {filtered.map((event, i) => (
                <EventCard key={event._id} event={event} index={i} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

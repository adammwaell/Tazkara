/**
 * Premium Event Detail Page — no seat counts shown to users
 */

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const SEAT_TYPES = [
  { key: 'vip', label: 'VIP', priceKey: 'vipPrice', seatsKey: 'vipSeats', color: 'var(--gold)', bg: 'rgba(212,160,23,0.08)', border: 'rgba(212,160,23,0.25)', desc: 'Premium front-row experience' },
  { key: 'fanPit', label: 'Fan Pit', priceKey: 'fanPitPrice', seatsKey: 'fanPitSeats', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)', desc: 'Up close with the action' },
  { key: 'regular', label: 'General Admission', priceKey: 'regularPrice', seatsKey: 'regularSeats', color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)', desc: 'Great seats, great value' },
];

export default function EventDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedType, setSelectedType] = useState('regular');
  const [quantity, setQuantity] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [purchasedTickets, setPurchasedTickets] = useState([]);

  useEffect(() => {
    if (!id) return;
    axios.get(`${API}/events/${id}`)
      .then(res => setEvent(res.data.event))
      .catch(() => toast.error('Event not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const getWaveInfoForType = (typeKey) => {
    if (!event?.waves || event.waves.length === 0) return null;
    for (const wave of event.waves) {
      if (!wave.isActive) continue;
      const cat = (wave.categories || []).find(c => c.type === typeKey && c.remainingSeats > 0);
      if (cat) return { wave, cat };
    }
    return null;
  };

  const selectedSeat = SEAT_TYPES.find(t => t.key === selectedType);
  const selectedWaveInfo = selectedSeat ? getWaveInfoForType(selectedSeat.key) : null;
  const price = selectedWaveInfo?.cat?.price ?? event?.[selectedSeat?.priceKey] ?? 0;
  const availableSeats = selectedWaveInfo?.cat?.remainingSeats ?? event?.[selectedSeat?.seatsKey] ?? 0;
  const totalCost = price * quantity;

  const handlePurchase = async () => {
    const token = localStorage.getItem('tazkara_token');
    if (!token) { toast.error('Please sign in to purchase'); router.push('/login'); return; }
    if (availableSeats < quantity) { toast.error('Not enough seats available'); return; }
    setPurchasing(true);
    try {
      const res = await axios.post(`${API}/orders`,
        { eventId: id, seatType: selectedType, quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPurchasedTickets(res.data.tickets || []);
      setShowModal(true);
      toast.success('Purchase confirmed!');
      const refreshed = await axios.get(`${API}/events/${id}`);
      setEvent(refreshed.data.event);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Purchase failed');
    } finally { setPurchasing(false); }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div style={{ width: 40, height: 40, border: '2px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '120px 24px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.3 }}>🎭</div>
          <p style={{ fontSize: 20 }}>Event not found</p>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.date);

  return (
    <>
      <Head><title>{event.name} — AdamTickets</title></Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />

        {/* Hero image */}
        <div style={{ position: 'relative', height: 420, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
          {event.image ? (
            <img
              src={event.image}
              alt={event.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: `${event.imagePositionX ?? 50}% ${event.imagePositionY ?? 50}%`,
                transform: `translate(${event.imageOffsetX ?? 0}px, ${event.imageOffsetY ?? 0}px) scale(${event.imageScale ?? 1})`,
                transformOrigin: `${event.imagePositionX ?? 50}% ${event.imagePositionY ?? 50}%`,
                filter: 'brightness(0.65)',
              }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a14, #2a2a1e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 96, opacity: 0.3 }}>🎵</div>
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-primary) 0%, rgba(10,10,8,0.4) 60%, transparent 100%)' }} />

          {event.isSoldOut && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,8,0.5)' }}>
              <div style={{ padding: '12px 36px', border: '2px solid #f87171', borderRadius: 4, color: '#f87171', fontSize: 22, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Sold Out
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ maxWidth: 1200, margin: '-80px auto 0', padding: '0 24px 96px', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 40, alignItems: 'start' }}>

            {/* ── Left: Event info ──────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
              <div className="gold-line" style={{ marginBottom: 20 }} />
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.15, marginBottom: 24 }}>
                {event.name}
              </h1>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                {[
                  { icon: '📅', text: eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                  { icon: '🕐', text: eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
                  { icon: '📍', text: event.venue },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: 'var(--text-secondary)' }}>
                    <span style={{ opacity: 0.6, width: 20 }}>{icon}</span> {text}
                  </div>
                ))}
              </div>

              {event.description && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, marginBottom: 32 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '0.03em' }}>About This Event</h2>
                  <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{event.description}</p>
                </div>
              )}

              {/* Ticket types preview (no seat counts) */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, letterSpacing: '0.03em' }}>Ticket Categories</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {SEAT_TYPES.map(type => {
                    const waveInfo = getWaveInfoForType(type.key);
                    const waveName = waveInfo?.wave?.name;
                    const label = waveName ? `${type.label} — ${waveName}` : type.label;
                    const remaining = waveInfo?.cat?.remainingSeats ?? event[type.seatsKey];
                    const priceValue = waveInfo?.cat?.price ?? event[type.priceKey];
                    const isSoldOut = remaining === 0;
                    return (
                      <div key={type.key} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 18px', borderRadius: 12,
                        background: type.bg, border: `1px solid ${type.border}`,
                        opacity: isSoldOut ? 0.5 : 1,
                      }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: type.color, marginBottom: 2 }}>{label}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{type.desc}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: type.color }}>EGP {priceValue}</div>
                          {isSoldOut && <div style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>SOLD OUT</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* ── Right: Purchase panel ─────────────────────────── */}
            <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
              style={{ position: 'sticky', top: 88 }}
            >
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 20, padding: 28, boxShadow: '0 8px 48px rgba(0,0,0,0.4)',
              }}>
                {event.isSoldOut ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>😔</div>
                    <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-secondary)' }}>Sold Out</p>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>All tickets have been claimed</p>
                  </div>
                ) : (
                  <>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>Select Tickets</h2>

                    {/* Seat type */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                      {SEAT_TYPES.map(type => {
                        const waveInfo = getWaveInfoForType(type.key);
                        const waveName = waveInfo?.wave?.name;
                        const label = waveName ? `${type.label} — ${waveName}` : type.label;
                        const remaining = waveInfo?.cat?.remainingSeats ?? event[type.seatsKey];
                        const priceValue = waveInfo?.cat?.price ?? event[type.priceKey];
                        const isSoldOut = remaining === 0;
                        const isSelected = selectedType === type.key;
                        return (
                          <button key={type.key} onClick={() => !isSoldOut && setSelectedType(type.key)} disabled={isSoldOut}
                            style={{
                              padding: '14px 16px', borderRadius: 12, textAlign: 'left',
                              background: isSelected ? type.bg : 'var(--bg-secondary)',
                              border: `1px solid ${isSelected ? type.border : 'var(--border)'}`,
                              cursor: isSoldOut ? 'not-allowed' : 'pointer',
                              opacity: isSoldOut ? 0.4 : 1,
                              transition: 'all 200ms',
                              width: '100%',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: isSelected ? type.color : 'var(--text-primary)' }}>{label}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{type.desc}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 18, fontWeight: 800, color: type.color }}>EGP {priceValue}</div>
                                {isSoldOut && <div style={{ fontSize: 10, color: '#f87171', fontWeight: 700 }}>SOLD OUT</div>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Quantity */}
                    <div style={{ marginBottom: 24 }}>
                      <label className="tk-label">Quantity</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{
                          width: 40, height: 40, borderRadius: 10, fontSize: 20, fontWeight: 700,
                          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                          color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 150ms',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>−</button>
                        <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', minWidth: 32, textAlign: 'center' }}>{quantity}</span>
                        <button onClick={() => setQuantity(Math.min(10, Math.min(availableSeats, quantity + 1)))} style={{
                          width: 40, height: 40, borderRadius: 10, fontSize: 20, fontWeight: 700,
                          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                          color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 150ms',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>+</button>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>max 10</span>
                      </div>
                    </div>

                    {/* Total */}
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                        <span>{quantity} × EGP {price}</span>
                        <span>Total</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
                        <span></span>
                        <span style={{ color: 'var(--gold)' }}>EGP {totalCost.toFixed(2)}</span>
                      </div>
                    </div>

                    <button onClick={handlePurchase} disabled={purchasing} className="btn-gold" style={{ width: '100%', height: 52, fontSize: 15 }}>
                      {purchasing ? 'Processing…' : `Confirm Purchase — EGP ${totalCost.toFixed(2)}`}
                    </button>
                    <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
                      🔒 Sandbox mode — no real payment
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Success Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(12px)', zIndex: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}
            onClick={() => setShowModal(false)}
          >
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 24, padding: '48px 40px', maxWidth: 440, width: '100%', textAlign: 'center',
                boxShadow: '0 24px 96px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ width: 72, height: 72, background: 'rgba(212,160,23,0.15)', border: '1px solid var(--border-gold)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 24px' }}>
                🎉
              </div>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                You're going!
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
                {purchasedTickets.length} ticket{purchasedTickets.length > 1 ? 's' : ''} confirmed for <strong style={{ color: 'var(--text-primary)' }}>{event.name}</strong>
              </p>

              {purchasedTickets[0]?.qrCode && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  <div style={{ background: '#fff', padding: 10, borderRadius: 14, boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
                    <img src={purchasedTickets[0].qrCode} alt="QR" style={{ width: 148, height: 148, display: 'block' }} />
                  </div>
                </div>
              )}

              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 28 }}>
                Confirmation email sent (check server console for Ethereal preview URL)
              </p>

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => { setShowModal(false); router.push('/dashboard'); }} className="btn-gold" style={{ flex: 1, height: 48 }}>
                  View My Tickets
                </button>
                <button onClick={() => setShowModal(false)} className="btn-ghost" style={{ flex: 1, height: 48 }}>
                  Stay Here
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

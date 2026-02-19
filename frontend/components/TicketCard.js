/**
 * Premium TicketCard with QR toggle
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_CONFIG = {
  vip: { label: 'VIP', color: '#d4a017', bg: 'rgba(212,160,23,0.08)', border: 'rgba(212,160,23,0.25)' },
  fanPit: { label: 'Fan Pit', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
  regular: { label: 'General Admission', color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)' },
};

const STATUS_CONFIG = {
  active: { label: 'Active', color: '#4ade80' },
  used: { label: 'Used', color: 'var(--text-muted)' },
  cancelled: { label: 'Cancelled', color: '#f87171' },
};

export default function TicketCard({ ticket }) {
  const [showQR, setShowQR] = useState(false);
  const { eventId, seatType, ticketCode, qrCode, status, waveName, pricePerTicket } = ticket;
  const type = TYPE_CONFIG[seatType] || TYPE_CONFIG.regular;
  const statusConf = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const eventDate = eventId?.date ? new Date(eventId.date) : null;
  const ticketLabel = waveName ? `${type.label} — ${waveName}` : type.label;

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{
        background: 'var(--bg-card)',
        border: `1px solid var(--border)`,
        borderRadius: 16,
        overflow: 'hidden',
        transition: 'all 300ms ease',
      }}>
        {/* Top accent line */}
        <div style={{ height: 3, background: type.color, opacity: 0.8 }} />

        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>

            {/* Left: ticket info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Badges row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  background: type.bg, color: type.color,
                  border: `1px solid ${type.border}`,
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20,
                }}>
                  {ticketLabel}
                </span>
                <span style={{ fontSize: 12, color: statusConf.color, fontWeight: 600 }}>
                  ● {statusConf.label}
                </span>
                {typeof pricePerTicket === 'number' && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                    EGP {pricePerTicket}
                  </span>
                )}
              </div>

              <h3 style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: 17, fontWeight: 700,
                color: 'var(--text-primary)', marginBottom: 6,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {eventId?.name || 'Event'}
              </h3>

              {eventDate && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 3 }}>
                  📅 {eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
              {eventId?.venue && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  📍 {eventId.venue}
                </p>
              )}

              <p style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12, color: 'var(--text-muted)',
                marginTop: 10, letterSpacing: '0.05em',
              }}>
                {ticketCode}
              </p>
            </div>

            {/* Right: dashed separator + QR button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
              <div style={{ width: 1, height: 80, borderLeft: '2px dashed var(--border)' }} />
              <button
                onClick={() => setShowQR(!showQR)}
                disabled={status !== 'active'}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '10px 14px', borderRadius: 10,
                  background: showQR ? 'var(--gold-dim)' : 'var(--bg-secondary)',
                  border: `1px solid ${showQR ? 'var(--border-gold)' : 'var(--border)'}`,
                  cursor: status === 'active' ? 'pointer' : 'not-allowed',
                  opacity: status !== 'active' ? 0.4 : 1,
                  transition: 'all 200ms',
                  minWidth: 64,
                }}
              >
                <span style={{ fontSize: 24 }}>📱</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: showQR ? 'var(--gold)' : 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  {showQR ? 'HIDE' : 'QR'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* QR expand */}
        <AnimatePresence>
          {showQR && qrCode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden', borderTop: '1px dashed var(--border)' }}
            >
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ background: '#fff', padding: 12, borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                  <img src={qrCode} alt="QR Code" style={{ width: 160, height: 160, display: 'block' }} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                  Present this QR code at the entrance
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

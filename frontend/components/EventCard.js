/**
 * Premium EventCard — No seat counts shown to users
 */

import Link from 'next/link';
import { motion } from 'framer-motion';

const TYPE_LABELS = { vip: 'VIP', fanPit: 'Fan Pit', regular: 'General' };

export default function EventCard({ event, index = 0 }) {
  const { _id, name, date, venue, image, isSoldOut,
          imagePositionX, imagePositionY, imageScale, imageOffsetX, imageOffsetY,
          regularPrice, vipPrice, fanPitPrice } = event;

  const eventDate = new Date(date);
  const isPast = eventDate < new Date();
  const minPrice = Math.min(regularPrice || 999, fanPitPrice || 999, vipPrice || 999);

  const monthShort = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = eventDate.getDate();
  const weekday = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
  const timeStr = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link href={`/event/${_id}`} style={{ textDecoration: 'none', display: 'block' }}>
        <article
          className="tk-card"
          style={{ cursor: 'pointer', position: 'relative' }}
        >
          {/* Image */}
          <div style={{ position: 'relative', height: 220, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
            {image ? (
              <img
                src={image}
                alt={name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: `${imagePositionX ?? 50}% ${imagePositionY ?? 50}%`,
                  transform: `translate(${imageOffsetX ?? 0}px, ${imageOffsetY ?? 0}px) scale(${imageScale ?? 1})`,
                  transformOrigin: `${imagePositionX ?? 50}% ${imagePositionY ?? 50}%`,
                  transition: 'transform 500ms ease',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = `scale(${Math.min((imageScale ?? 1) + 0.04, 1.5)})`}
                onMouseLeave={e => e.currentTarget.style.transform = `scale(${imageScale ?? 1})`}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(135deg, #1a1a14 0%, #2a2a1e 50%, #1a1a14 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 64, opacity: 0.4,
              }}>🎵</div>
            )}

            {/* Gradient overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(10,10,8,0.9) 0%, transparent 60%)',
            }} />

            {/* Date badge */}
            <div style={{
              position: 'absolute', top: 14, left: 14,
              background: 'rgba(10,10,8,0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '8px 12px',
              textAlign: 'center',
              minWidth: 52,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--gold)', lineHeight: 1 }}>{monthShort}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, marginTop: 2 }}>{day}</div>
            </div>

            {/* Sold Out overlay */}
            {isSoldOut && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(10,10,8,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="badge-red" style={{ fontSize: 13, padding: '6px 18px', letterSpacing: '0.12em' }}>
                  SOLD OUT
                </span>
              </div>
            )}

            {isPast && !isSoldOut && (
              <div style={{ position: 'absolute', top: 14, right: 14 }}>
                <span className="badge-gray">Past</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: '20px 22px 22px' }}>
            <h3 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: 19,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 8,
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>{name}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span style={{ opacity: 0.6 }}>📍</span> {venue}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-muted)' }}>
                <span style={{ opacity: 0.6 }}>🕐</span> {weekday}, {timeStr}
              </div>
            </div>

            {/* Divider */}
            <div className="tk-divider" style={{ marginBottom: 16 }} />

            {/* Price + CTA */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
                  From
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', fontFamily: 'DM Sans, sans-serif' }}>
                  ${minPrice}
                </div>
              </div>
              {!isSoldOut && (
                <div style={{
                  background: 'var(--gold-dim)',
                  border: '1px solid var(--border-gold)',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--gold)',
                  transition: 'all 200ms',
                }}>
                  Book Now →
                </div>
              )}
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}

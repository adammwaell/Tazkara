/**
 * Admin Dashboard v2 — Wave-Based Ticketing + Whitelist Management
 */

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const CAT_TYPES = [
  { key: 'vip',     label: 'VIP',          color: '#d4a017', bg: 'rgba(212,160,23,0.08)',  border: 'rgba(212,160,23,0.25)' },
  { key: 'fanPit',  label: 'Fan Pit',       color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)' },
  { key: 'regular', label: 'General',       color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.2)' },
];

const TABS = [
  { key: 'overview', label: '📊 Overview' },
  { key: 'orders',   label: '📋 Orders' },
  { key: 'events',   label: '🎭 Events' },
  { key: 'create',   label: '➕ Create Event' },
  { key: 'access',   label: '🔑 Access Control' },
  { key: 'users',    label: '👥 Users' },
];

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'var(--gold)' }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 26px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color, fontFamily: 'DM Sans, sans-serif', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function SortBtn({ field, current, dir, onSort }) {
  const active = current === field;
  return (
    <span onClick={() => onSort(field)} style={{ cursor: 'pointer', userSelect: 'none', marginLeft: 4, opacity: active ? 1 : 0.3, color: active ? 'var(--gold)' : 'inherit' }}>
      {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );
}

// ── Wave Editor Modal ────────────────────────────────────────────────────────
function WaveEditorModal({ event, onClose, onSaved, token }) {
  const [localEvent, setLocalEvent] = useState(event);
  const [saving, setSaving] = useState(false);

  // Add new wave form
  const [newWave, setNewWave] = useState({ name: '', description: '', categories: [] });
  const [newCat, setNewCat] = useState({ type: 'vip', label: '', price: '', seats: '' });
  const [addCatToWave, setAddCatToWave] = useState(null); // waveId
  const [addCatForm, setAddCatForm] = useState({ type: 'vip', label: '', price: '', seats: '' });
  const [editingCat, setEditingCat] = useState(null); // { waveId, catId, price, seats, label }

  const headers = { Authorization: `Bearer ${token}` };
  const refreshEvent = async () => {
    const r = await axios.get(`${API}/events/${event._id}`);
    setLocalEvent(r.data.event);
    onSaved(r.data.event);
  };

  const addCatToNewWave = () => {
    if (!newCat.seats || !newCat.price) return;
    setNewWave(prev => ({
      ...prev,
      categories: [...prev.categories, { ...newCat }],
    }));
    setNewCat({ type: 'vip', label: '', price: '', seats: '' });
  };

  const submitNewWave = async () => {
    if (!newWave.name || newWave.categories.length === 0) {
      toast.error('Wave needs a name and at least one category');
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API}/events/${event._id}/waves`, newWave, { headers });
      toast.success('Wave added!');
      setNewWave({ name: '', description: '', categories: [] });
      await refreshEvent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const toggleWave = async (waveId, isActive) => {
    try {
      await axios.patch(`${API}/events/${event._id}/waves/${waveId}`, { isActive: !isActive }, { headers });
      await refreshEvent();
    } catch { toast.error('Failed to toggle wave'); }
  };

  const submitAddCat = async () => {
    if (!addCatForm.seats || !addCatForm.price) return;
    setSaving(true);
    try {
      await axios.post(`${API}/events/${event._id}/waves/${addCatToWave}/categories`, addCatForm, { headers });
      toast.success('Category added');
      setAddCatToWave(null);
      setAddCatForm({ type: 'vip', label: '', price: '', seats: '' });
      await refreshEvent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const submitEditCat = async () => {
    setSaving(true);
    try {
      const { waveId, catId, price, seats, label } = editingCat;
      await axios.patch(`${API}/events/${event._id}/waves/${waveId}/categories/${catId}`, { price: Number(price), seats: Number(seats), label }, { headers });
      toast.success('Updated');
      setEditingCat(null);
      await refreshEvent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const catConfig = (type) => CAT_TYPES.find(c => c.key === type) || CAT_TYPES[2];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      overflowY: 'auto', padding: '40px 24px',
    }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          maxWidth: 760, margin: '0 auto',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 24, overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '28px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              Manage Waves — {localEvent.name}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Status: <span style={{ color: localEvent.isSoldOut ? '#f87171' : '#4ade80', fontWeight: 600 }}>{localEvent.isSoldOut ? 'Sold Out' : 'Available'}</span>
              {localEvent.isSoldOut && <span style={{ color: 'var(--gold)', marginLeft: 8, fontSize: 11 }}>← Add tickets to unlock</span>}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Existing Waves */}
          {localEvent.waves.map((wave, wi) => (
            <div key={wave._id} style={{
              border: `1px solid ${wave.isActive ? 'var(--border-gold)' : 'var(--border)'}`,
              borderRadius: 16, overflow: 'hidden',
              opacity: wave.isActive ? 1 : 0.6,
            }}>
              {/* Wave header */}
              <div style={{
                padding: '14px 20px', background: wave.isActive ? 'rgba(212,160,23,0.06)' : 'var(--bg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid var(--border)',
              }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: wave.isActive ? 'var(--gold)' : 'var(--text-muted)' }}>{wave.name}</span>
                  {wave.description && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{wave.description}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setAddCatToWave(addCatToWave === wave._id ? null : wave._id)}
                    style={{ padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'var(--gold-dim)', border: '1px solid var(--border-gold)', color: 'var(--gold)' }}
                  >+ Category</button>
                  <button
                    onClick={() => toggleWave(wave._id, wave.isActive)}
                    style={{ padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  >{wave.isActive ? 'Pause' : 'Activate'}</button>
                </div>
              </div>

              {/* Add category to this wave */}
              {addCatToWave === wave._id && (
                <div style={{ padding: '14px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div>
                    <label className="tk-label">Type</label>
                    <select value={addCatForm.type} onChange={e => setAddCatForm(p => ({ ...p, type: e.target.value }))} className="tk-input" style={{ width: 100 }}>
                      {CAT_TYPES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="tk-label">Label</label>
                    <input value={addCatForm.label} onChange={e => setAddCatForm(p => ({ ...p, label: e.target.value }))} className="tk-input" style={{ width: 130 }} placeholder="e.g. Early Bird" />
                  </div>
                  <div>
                    <label className="tk-label">Seats</label>
                    <input type="number" value={addCatForm.seats} onChange={e => setAddCatForm(p => ({ ...p, seats: e.target.value }))} className="tk-input" style={{ width: 80 }} placeholder="50" />
                  </div>
                  <div>
                    <label className="tk-label">Price ($)</label>
                    <input type="number" value={addCatForm.price} onChange={e => setAddCatForm(p => ({ ...p, price: e.target.value }))} className="tk-input" style={{ width: 80 }} placeholder="99" />
                  </div>
                  <button onClick={submitAddCat} disabled={saving} className="btn-gold" style={{ padding: '10px 16px', fontSize: 13 }}>Add</button>
                </div>
              )}

              {/* Categories */}
              <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {wave.categories.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>No categories yet — add one above</p>
                )}
                {wave.categories.map(cat => {
                  const cfg = catConfig(cat.type);
                  const isEditing = editingCat?.catId === cat._id;
                  return (
                    <div key={cat._id} style={{
                      background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10,
                      padding: '12px 16px',
                    }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                          <div>
                            <label className="tk-label">Label</label>
                            <input value={editingCat.label} onChange={e => setEditingCat(p => ({ ...p, label: e.target.value }))} className="tk-input" style={{ width: 140 }} />
                          </div>
                          <div>
                            <label className="tk-label">Total Seats</label>
                            <input type="number" value={editingCat.seats} onChange={e => setEditingCat(p => ({ ...p, seats: e.target.value }))} className="tk-input" style={{ width: 90 }} />
                          </div>
                          <div>
                            <label className="tk-label">Price ($)</label>
                            <input type="number" value={editingCat.price} onChange={e => setEditingCat(p => ({ ...p, price: e.target.value }))} className="tk-input" style={{ width: 90 }} />
                          </div>
                          <button onClick={submitEditCat} disabled={saving} className="btn-gold" style={{ padding: '10px 16px', fontSize: 13 }}>Save</button>
                          <button onClick={() => setEditingCat(null)} className="btn-ghost" style={{ padding: '10px 16px', fontSize: 13 }}>Cancel</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                            {cat.label && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>({cat.label})</span>}
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                              {cat.remainingSeats} remaining / {cat.totalSeats} total · {cat.soldSeats} sold · ${cat.price}
                            </div>
                          </div>
                          <button
                            onClick={() => setEditingCat({ waveId: wave._id, catId: cat._id, price: cat.price, seats: cat.totalSeats, label: cat.label || '' })}
                            style={{ padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                          >Edit</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Add new wave */}
          <div style={{ border: '1px dashed var(--border)', borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
              ➕ Add New Wave
            </h3>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label className="tk-label">Wave Name</label>
                <input value={newWave.name} onChange={e => setNewWave(p => ({ ...p, name: e.target.value }))} className="tk-input" placeholder={`Wave ${localEvent.waves.length + 1}`} />
              </div>
              <div style={{ flex: 2, minWidth: 200 }}>
                <label className="tk-label">Description (optional)</label>
                <input value={newWave.description} onChange={e => setNewWave(p => ({ ...p, description: e.target.value }))} className="tk-input" placeholder="e.g. Second release" />
              </div>
            </div>

            {/* Add categories to new wave */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Add Categories</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                  <label className="tk-label">Type</label>
                  <select value={newCat.type} onChange={e => setNewCat(p => ({ ...p, type: e.target.value }))} className="tk-input" style={{ width: 100 }}>
                    {CAT_TYPES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="tk-label">Label</label>
                  <input value={newCat.label} onChange={e => setNewCat(p => ({ ...p, label: e.target.value }))} className="tk-input" style={{ width: 130 }} placeholder="Early Bird" />
                </div>
                <div>
                  <label className="tk-label">Seats</label>
                  <input type="number" value={newCat.seats} onChange={e => setNewCat(p => ({ ...p, seats: e.target.value }))} className="tk-input" style={{ width: 80 }} placeholder="50" />
                </div>
                <div>
                  <label className="tk-label">Price ($)</label>
                  <input type="number" value={newCat.price} onChange={e => setNewCat(p => ({ ...p, price: e.target.value }))} className="tk-input" style={{ width: 80 }} placeholder="99" />
                </div>
                <button onClick={addCatToNewWave} className="btn-outline-gold" style={{ padding: '10px 16px', fontSize: 13 }}>+ Add</button>
              </div>

              {newWave.categories.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {newWave.categories.map((c, i) => {
                    const cfg = catConfig(c.type);
                    return (
                      <span key={i} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 8, padding: '4px 10px', fontSize: 12, color: cfg.color }}>
                        {cfg.label} {c.label && `(${c.label})`} × {c.seats} @ ${c.price}
                        <button onClick={() => setNewWave(p => ({ ...p, categories: p.categories.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 6, opacity: 0.6 }}>✕</button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <button onClick={submitNewWave} disabled={saving || !newWave.name} className="btn-gold" style={{ padding: '11px 24px', fontSize: 14 }}>
              {saving ? 'Adding…' : 'Add Wave'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Admin Component ─────────────────────────────────────────────────────
export default function Admin() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);

  // Orders table state
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchOrder, setSearchOrder] = useState('');

  // Create event form
  const [createForm, setCreateForm] = useState({
    name: '',
    date: '',
    venue: '',
    description: '',
    image: '',
    imagePositionX: 50,
    imagePositionY: 50,
    imageScale: 1,
    imageOffsetX: 0,
    imageOffsetY: 0,
  });
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragBase, setDragBase] = useState({ x: 0, y: 0 });
  const [createCategories, setCreateCategories] = useState([]);
  const [catForm, setCatForm] = useState({ type: 'vip', label: '', price: '', seats: '' });

  // Whitelist form
  const [wlForm, setWlForm] = useState({ email: '', role: 'user', note: '' });
  
  // Users state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('tazkara_token') : null;
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const u = localStorage.getItem('tazkara_user');
    if (!u) { router.push('/login'); return; }
    if (JSON.parse(u).role !== 'admin') { router.push('/'); return; }
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [evR, ordR] = await Promise.all([
        axios.get(`${API}/events`),
        axios.get(`${API}/orders/all`, { headers }),
      ]);
      setEvents(evR.data.events || []);
      setOrders(ordR.data.orders || []);
    } catch (e) { console.error(e); }
  };

  const fetchWhitelist = async () => {
    try {
      const r = await axios.get(`${API}/auth/whitelist`, { headers });
      setWhitelist(r.data.list || []);
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const r = await axios.get(`${API}/auth/users`, { headers });
      setUsers(r.data.users || []);
    } catch (e) { 
      console.error(e); 
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleScannerAccess = async (userId, currentValue) => {
    try {
      const newValue = !currentValue;
      await axios.patch(`${API}/auth/users/${userId}/permissions`, 
        { canScan: newValue }, 
        { headers }
      );
      setUsers(users.map(u => u._id === userId ? { ...u, permissions: { canScan: newValue } } : u));
      toast.success(newValue ? 'Scanner access enabled' : 'Scanner access disabled');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update permissions');
    }
  };

  useEffect(() => { if (tab === 'access') fetchWhitelist(); }, [tab]);
  useEffect(() => { if (tab === 'users') fetchUsers(); }, [tab]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (createCategories.length === 0) { toast.error('Add at least one ticket category'); return; }
    setLoading(true);
    try {
      if (editingEventId) {
        await axios.patch(`${API}/events/${editingEventId}/info`, { ...createForm }, { headers });
        toast.success('Event updated!');
        setEditingEventId(null);
      } else {
        await axios.post(`${API}/events`, { ...createForm, categories: createCategories }, { headers });
        toast.success('Event created!');
        setCreateCategories([]);
      }
      setCreateForm({
        name: '',
        date: '',
        venue: '',
        description: '',
        image: '',
        imagePositionX: 50,
        imagePositionY: 50,
        imageScale: 1,
        imageOffsetX: 0,
        imageOffsetY: 0,
      });
      fetchAll();
      setTab('events');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  const handleEdit = (ev) => {
    setEditingEventId(ev._id);
    setCreateForm({
      name: ev.name || '',
      date: ev.date ? new Date(ev.date).toISOString().slice(0, 16) : '',
      venue: ev.venue || '',
      description: ev.description || '',
      image: ev.image || '',
      imagePositionX: ev.imagePositionX ?? 50,
      imagePositionY: ev.imagePositionY ?? 50,
      imageScale: ev.imageScale ?? 1,
      imageOffsetX: ev.imageOffsetX ?? 0,
      imageOffsetY: ev.imageOffsetY ?? 0,
    });
    setTab('create');
  };

  const addCategory = () => {
    if (!catForm.seats || !catForm.price) return;
    setCreateCategories(p => [...p, { ...catForm }]);
    setCatForm({ type: 'vip', label: '', price: '', seats: '' });
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this event?')) return;
    try {
      await axios.delete(`${API}/events/${id}`, { headers });
      toast.success('Deactivated');
      fetchAll();
    } catch { toast.error('Failed'); }
  };

  const addToWhitelist = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/auth/whitelist`, wlForm, { headers });
      toast.success('Added to whitelist');
      setWlForm({ email: '', role: 'user', note: '' });
      fetchWhitelist();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const removeFromWhitelist = async (id) => {
    await axios.delete(`${API}/auth/whitelist/${id}`, { headers });
    fetchWhitelist();
    toast.success('Removed');
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // Analytics
  const completed = orders.filter(o => o.paymentStatus === 'completed');
  const totalRevenue = completed.reduce((s, o) => s + o.totalPrice, 0);
  const totalTickets = completed.reduce((s, o) => s + o.quantity, 0);

  const revenueByEvent = events.map(ev => {
    const evOrders = completed.filter(o => (o.eventId?._id || o.eventId) === ev._id);
    const rev  = evOrders.reduce((s, o) => s + o.totalPrice, 0);
    const sold = evOrders.reduce((s, o) => s + o.quantity, 0);
    const byType = { vip: 0, fanPit: 0, regular: 0 };
    evOrders.forEach(o => { if (byType[o.seatType] !== undefined) byType[o.seatType] += o.quantity; });
    return { ...ev, revenue: rev, soldTickets: sold, byType };
  });

  const filteredOrders = orders
    .filter(o => filterStatus === 'all' || o.paymentStatus === filterStatus)
    .filter(o => {
      if (!searchOrder) return true;
      const s = searchOrder.toLowerCase();
      return o.userId?.name?.toLowerCase().includes(s) || o.userId?.email?.toLowerCase().includes(s) || o.eventId?.name?.toLowerCase().includes(s) || o._id?.includes(s);
    })
    .sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (['totalPrice','quantity'].includes(sortField)) { av = Number(av); bv = Number(bv); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const statusBadge = (s) => ({ completed: <span className="badge-green">Completed</span>, pending: <span className="badge-gold">Pending</span>, failed: <span className="badge-red">Failed</span> }[s] || <span className="badge-gray">{s}</span>);
  const seatBadge = (t) => ({ vip: <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 12 }}>VIP</span>, fanPit: <span style={{ color: '#60a5fa', fontWeight: 700, fontSize: 12 }}>Fan Pit</span>, regular: <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 12 }}>General</span> }[t] || t);
  const catCfg = (t) => CAT_TYPES.find(c => c.key === t) || CAT_TYPES[2];

  return (
    <>
      <Head><title>Admin — AdamTickets</title></Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />

        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '48px 24px 96px' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 36 }}>
            <div className="gold-line" style={{ marginBottom: 14 }} />
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 34, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Admin Dashboard</h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Wave-based ticket management · Google OAuth access control</p>
          </motion.div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 36 }}>
            <StatCard label="Total Revenue"  value={`$${totalRevenue.toLocaleString()}`} sub="Completed orders" />
            <StatCard label="Total Orders"   value={orders.length} sub={`${completed.length} completed`} color="var(--text-primary)" />
            <StatCard label="Tickets Sold"   value={totalTickets} color="#4ade80" />
            <StatCard label="Active Events"  value={events.filter(e => !e.isSoldOut && e.isActive).length} sub={`${events.filter(e => e.isSoldOut).length} sold out`} color="#60a5fa" />
            <StatCard label="Total Waves"    value={events.reduce((s, e) => s + (e.waves?.length || 0), 0)} color="var(--text-secondary)" />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 32, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '11px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                background: 'transparent', border: 'none', marginBottom: -1,
                borderBottom: tab === t.key ? '2px solid var(--gold)' : '2px solid transparent',
                color: tab === t.key ? 'var(--gold)' : 'var(--text-muted)', transition: 'all 200ms',
              }}>{t.label}</button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ── OVERVIEW ─────────────────────────────────────────── */}
            {tab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {revenueByEvent.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No events yet</p>
                  ) : revenueByEvent.map(ev => (
                    <div key={ev._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{ev.name}</h3>
                          {ev.isSoldOut && <span className="badge-red">Sold Out</span>}
                          {!ev.isActive && <span className="badge-gray">Inactive</span>}
                          <span className="badge-gray">{ev.waves?.length || 0} wave{ev.waves?.length !== 1 ? 's' : ''}</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{ev.venue} · {new Date(ev.date).toLocaleDateString()}</p>
                        <div style={{ display: 'flex', gap: 18, fontSize: 13 }}>
                          <span style={{ color: 'var(--text-muted)' }}>VIP: <strong style={{ color: 'var(--gold)' }}>{ev.byType.vip}</strong></span>
                          <span style={{ color: 'var(--text-muted)' }}>Fan Pit: <strong style={{ color: '#60a5fa' }}>{ev.byType.fanPit}</strong></span>
                          <span style={{ color: 'var(--text-muted)' }}>General: <strong style={{ color: '#4ade80' }}>{ev.byType.regular}</strong></span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold)' }}>${ev.revenue.toLocaleString()}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{ev.soldTickets} tickets sold</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── ORDERS ───────────────────────────────────────────── */}
            {tab === 'orders' && (
              <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: '1 1 220px' }}>
                    <input type="text" placeholder="Search name, email, event…" value={searchOrder} onChange={e => setSearchOrder(e.target.value)} className="tk-input" style={{ paddingLeft: 36, height: 40 }} />
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }}>🔍</span>
                  </div>
                  {['all','completed','pending','failed'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, textTransform: 'capitalize', borderRadius: 8, border: `1px solid ${filterStatus===s?'var(--gold)':'var(--border)'}`, background: filterStatus===s?'var(--gold-dim)':'var(--bg-card)', color: filterStatus===s?'var(--gold)':'var(--text-muted)', cursor: 'pointer' }}>{s}</button>
                  ))}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{filteredOrders.length} orders</span>
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                          {[['_id','Order ID'],['buyer','Buyer'],['event','Event'],['seatType','Type'],['waveName','Wave'],['quantity','Qty'],['totalPrice','Total'],['paymentStatus','Status'],['createdAt','Date']].map(([f,l]) => (
                            <th key={l} style={{ padding: '13px 15px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => handleSort(f)}>
                              {l} <SortBtn field={f} current={sortField} dir={sortDir} onSort={handleSort} />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.length === 0 ? (
                          <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>No orders found</td></tr>
                        ) : filteredOrders.map((o, i) => (
                          <tr key={o._id} style={{ borderBottom: i < filteredOrders.length-1 ? '1px solid var(--border)' : 'none' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '13px 15px' }}><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>{o._id?.slice(-8).toUpperCase()}</span></td>
                            <td style={{ padding: '13px 15px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {o.userId?.picture && <img src={o.userId.picture} style={{ width: 24, height: 24, borderRadius: '50%' }} />}
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{o.userId?.name || '—'}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.userId?.email || '—'}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '13px 15px', maxWidth: 160 }}>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: 13 }}>{o.eventId?.name || '—'}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.eventId?.date ? new Date(o.eventId.date).toLocaleDateString() : ''}</div>
                            </td>
                            <td style={{ padding: '13px 15px' }}>{seatBadge(o.seatType)}</td>
                            <td style={{ padding: '13px 15px', fontSize: 12, color: 'var(--text-muted)' }}>{o.waveName || <span style={{ opacity: 0.4 }}>—</span>}</td>
                            <td style={{ padding: '13px 15px', fontWeight: 700, color: 'var(--text-primary)' }}>×{o.quantity}</td>
                            <td style={{ padding: '13px 15px', fontWeight: 700, color: 'var(--gold)' }}>${o.totalPrice?.toLocaleString()}</td>
                            <td style={{ padding: '13px 15px' }}>{statusBadge(o.paymentStatus)}</td>
                            <td style={{ padding: '13px 15px', color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                              {new Date(o.createdAt).toLocaleDateString()}<br/>
                              {new Date(o.createdAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── EVENTS ───────────────────────────────────────────── */}
            {tab === 'events' && (
              <motion.div key="events" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {events.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No events yet</p>
                  ) : events.map(ev => (
                    <div key={ev._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--bg-secondary)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                        {ev.image ? (
                          <img
                            src={ev.image}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              objectPosition: `${ev.imagePositionX ?? 50}% ${ev.imagePositionY ?? 50}%`,
                              transform: `scale(${ev.imageScale ?? 1})`,
                              transformOrigin: `${ev.imagePositionX ?? 50}% ${ev.imagePositionY ?? 50}%`,
                            }}
                          />
                        ) : '🎵'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{ev.name}</h3>
                          {ev.isSoldOut && <span className="badge-red">Sold Out</span>}
                          <span className="badge-gray">{ev.waves?.length || 0} waves</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>{ev.venue} · {new Date(ev.date).toLocaleDateString()}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {ev.soldCount} sold · VIP: {ev.vipSeats} · Fan Pit: {ev.fanPitSeats} · General: {ev.regularSeats}
                          {ev.isSoldOut && <span style={{ color: 'var(--gold)', marginLeft: 8 }}>← Add wave to reopen</span>}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button onClick={() => handleEdit(ev)} className="btn-outline-gold" style={{ padding: '7px 14px', fontSize: 12 }}>
                          Edit
                        </button>
                        <button onClick={() => setEditingEvent(ev)} className="btn-outline-gold" style={{ padding: '7px 14px', fontSize: 12 }}>
                          Manage Waves
                        </button>
                        <button onClick={() => handleDeactivate(ev._id)} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', color: '#f87171', cursor: 'pointer' }}>
                          Deactivate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── CREATE EVENT ──────────────────────────────────────── */}
            {tab === 'create' && (
              <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '36px 40px', maxWidth: 820 }}>
                  <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 28 }}>
                    {editingEventId ? 'Edit Event' : 'New Event'}
                  </h2>
                  <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                      {[['name','Event Name *','text','e.g. Summer Festival'],['date','Date & Time *','datetime-local',''],['venue','Venue *','text','e.g. Madison Square Garden'],['image','Image URL','url','https://…']].map(([k,l,t,p]) => (
                        <div key={k}>
                          <label className="tk-label">{l}</label>
                          <input type={t} required={l.includes('*')} value={createForm[k]} onChange={e => setCreateForm(p2 => ({ ...p2, [k]: e.target.value }))} className="tk-input" placeholder={p} />
                        </div>
                      ))}
                    </div>
                    {createForm.image && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, alignItems: 'start' }}>
                        <div>
                          <label className="tk-label" style={{ marginBottom: 10 }}>Live Image Preview</label>
                          <div style={{ position: 'relative', height: 220, borderRadius: 16, overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                            <img
                              src={createForm.image}
                              alt="Preview"
                              draggable={false}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setIsDraggingPreview(true);
                                setDragStart({ x: e.clientX, y: e.clientY });
                                setDragBase({ x: createForm.imageOffsetX, y: createForm.imageOffsetY });
                              }}
                              onMouseMove={(e) => {
                                if (!isDraggingPreview || !dragStart) return;
                                const dx = e.clientX - dragStart.x;
                                const dy = e.clientY - dragStart.y;
                                const nextX = Math.max(-50, Math.min(50, dragBase.x + dx / 6));
                                const nextY = Math.max(-50, Math.min(50, dragBase.y + dy / 6));
                                setCreateForm(p => ({ ...p, imageOffsetX: nextX, imageOffsetY: nextY }));
                              }}
                              onMouseUp={() => setIsDraggingPreview(false)}
                              onMouseLeave={() => setIsDraggingPreview(false)}
                              onWheel={(e) => {
                                e.preventDefault();
                                const delta = e.deltaY > 0 ? -0.03 : 0.03;
                                const next = Math.max(0.5, Math.min(2, Number((createForm.imageScale + delta).toFixed(2))));
                                setCreateForm(p => ({ ...p, imageScale: next }));
                              }}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                objectPosition: `${createForm.imagePositionX}% ${createForm.imagePositionY}%`,
                                transform: `translate(${createForm.imageOffsetX}px, ${createForm.imageOffsetY}px) scale(${createForm.imageScale})`,
                                transformOrigin: `${createForm.imagePositionX}% ${createForm.imagePositionY}%`,
                                transition: isDraggingPreview ? 'none' : 'transform 120ms ease',
                                cursor: isDraggingPreview ? 'grabbing' : 'grab',
                                userSelect: 'none',
                              }}
                            />
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,8,0.9) 0%, transparent 60%)' }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Drag image to reposition. Scroll to zoom.
                          </div>
                          <div>
                            <label className="tk-label">Scale (Zoom)</label>
                            <input
                              type="range"
                              min="0.5"
                              max="2"
                              step="0.01"
                              value={createForm.imageScale}
                              onChange={e => setCreateForm(p => ({ ...p, imageScale: Number(e.target.value) }))}
                              style={{ width: '100%' }}
                            />
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{Math.round(createForm.imageScale * 100)}%</div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="tk-label">Description</label>
                      <textarea value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} className="tk-input" style={{ minHeight: 72, resize: 'vertical' }} placeholder="What makes this event special?" />
                    </div>

                    {/* Wave 1 categories */}
                    <div>
                      <label className="tk-label" style={{ marginBottom: 12 }}>Wave 1 — Ticket Categories</label>
                      <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                          <div>
                            <label className="tk-label">Type</label>
                            <select value={catForm.type} onChange={e => setCatForm(p => ({ ...p, type: e.target.value }))} className="tk-input" style={{ width: 100 }}>
                              {CAT_TYPES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="tk-label">Label</label>
                            <input value={catForm.label} onChange={e => setCatForm(p => ({ ...p, label: e.target.value }))} className="tk-input" style={{ width: 130 }} placeholder="Early Bird" />
                          </div>
                          <div>
                            <label className="tk-label">Seats</label>
                            <input type="number" value={catForm.seats} onChange={e => setCatForm(p => ({ ...p, seats: e.target.value }))} className="tk-input" style={{ width: 80 }} placeholder="100" />
                          </div>
                          <div>
                            <label className="tk-label">Price ($)</label>
                            <input type="number" value={catForm.price} onChange={e => setCatForm(p => ({ ...p, price: e.target.value }))} className="tk-input" style={{ width: 80 }} placeholder="50" />
                          </div>
                          <button type="button" onClick={addCategory} className="btn-outline-gold" style={{ padding: '10px 16px', fontSize: 13 }}>+ Add</button>
                        </div>
                        {createCategories.length > 0 && (
                          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {createCategories.map((c, i) => {
                              const cfg = catCfg(c.type);
                              return (
                                <span key={i} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 8, padding: '5px 12px', fontSize: 12, color: cfg.color }}>
                                  {cfg.label} {c.label && `(${c.label})`} × {c.seats} @ ${c.price}
                                  <button type="button" onClick={() => setCreateCategories(p => p.filter((_,j)=>j!==i))} style={{ background:'none',border:'none',color:'inherit',cursor:'pointer',marginLeft:6,opacity:0.6 }}>✕</button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <button type="submit" disabled={loading} className="btn-gold" style={{ alignSelf: 'flex-start', padding: '13px 36px', fontSize: 14 }}>
                        {loading ? (editingEventId ? 'Updating…' : 'Creating…') : (editingEventId ? 'Update Event' : 'Create Event')}
                      </button>
                      {editingEventId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEventId(null);
                            setCreateForm({
                              name: '',
                              date: '',
                              venue: '',
                              description: '',
                              image: '',
                              imagePositionX: 50,
                              imagePositionY: 50,
                              imageScale: 1,
                              imageOffsetX: 0,
                              imageOffsetY: 0,
                            });
                            setTab('events');
                          }}
                          className="btn-ghost"
                          style={{ height: 46 }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* ── ACCESS CONTROL ────────────────────────────────────── */}
            {tab === 'access' && (
              <motion.div key="access" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                  {/* Info */}
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Access Control Settings</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { mode: 'open', label: 'Open', desc: 'Any verified Google account can log in' },
                        { mode: 'domain', label: 'Domain', desc: 'Only specific email domains allowed (set ALLOWED_DOMAINS in .env)' },
                        { mode: 'whitelist', label: 'Whitelist', desc: 'Only manually approved emails (manage below)' },
                      ].map(m => (
                        <div key={m.mode} style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
                            {m.label}
                            <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--gold-dim)', color: 'var(--gold)', border: '1px solid var(--border-gold)', padding: '1px 8px', borderRadius: 10 }}>
                              Set ACCESS_MODE={m.mode} in .env
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.desc}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 16, padding: 14, background: 'rgba(212,160,23,0.06)', border: '1px solid var(--border-gold)', borderRadius: 10 }}>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--gold)' }}>Admin emails:</strong> Set <code style={{ background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: 4 }}>ADMIN_EMAILS</code> in your server .env to a comma-separated list. Those Google accounts get automatic admin role on first login.
                      </p>
                    </div>
                  </div>

                  {/* Whitelist management */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Add to Whitelist</h2>
                      <form onSubmit={addToWhitelist} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <label className="tk-label">Email *</label>
                          <input type="email" required value={wlForm.email} onChange={e => setWlForm(p => ({ ...p, email: e.target.value }))} className="tk-input" placeholder="user@example.com" />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <label className="tk-label">Role</label>
                            <select value={wlForm.role} onChange={e => setWlForm(p => ({ ...p, role: e.target.value }))} className="tk-input">
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          <div style={{ flex: 2 }}>
                            <label className="tk-label">Note</label>
                            <input value={wlForm.note} onChange={e => setWlForm(p => ({ ...p, note: e.target.value }))} className="tk-input" placeholder="VIP guest, staff…" />
                          </div>
                        </div>
                        <button type="submit" className="btn-gold" style={{ alignSelf: 'flex-start', padding: '10px 24px', fontSize: 13 }}>Add Email</button>
                      </form>
                    </div>

                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, maxHeight: 320, overflowY: 'auto' }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                        Whitelist ({whitelist.length})
                      </h3>
                      {whitelist.length === 0 ? (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No emails in whitelist</p>
                      ) : whitelist.map(entry => (
                        <div key={entry._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                          <div>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{entry.email}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 2 }}>
                              <span>{entry.role}</span>
                              {entry.note && <span>· {entry.note}</span>}
                            </div>
                          </div>
                          <button onClick={() => removeFromWhitelist(entry._id)} style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── USERS MANAGEMENT ─────────────────────────────────────────── */}
            {tab === 'users' && (
              <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Manage Users</h2>
                    <button onClick={fetchUsers} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }}>Refresh</button>
                  </div>
                  
                  {loadingUsers ? (
                    <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading users...</p>
                  ) : users.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No users found</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Name</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Role</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Scanner Access</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map(user => (
                            <tr key={user._id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-primary)' }}>{user.name}</td>
                              <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{user.email}</td>
                              <td style={{ padding: '14px 16px', fontSize: 13 }}>
                                <span style={{ 
                                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  background: user.role === 'admin' ? 'var(--gold-dim)' : 'var(--bg-secondary)',
                                  color: user.role === 'admin' ? 'var(--gold)' : 'var(--text-secondary)'
                                }}>
                                  {user.role}
                                </span>
                              </td>
                              <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                <button
                                  onClick={() => toggleScannerAccess(user._id, user.permissions?.canScan)}
                                  disabled={user.role === 'admin'}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: user.role === 'admin' ? 'not-allowed' : 'pointer',
                                    background: user.permissions?.canScan ? 'rgba(34,197,94,0.15)' : 'var(--bg-secondary)',
                                    color: user.permissions?.canScan ? '#22c55e' : 'var(--text-muted)',
                                    border: `1px solid ${user.permissions?.canScan ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                                    opacity: user.role === 'admin' ? 0.5 : 1
                                  }}
                                >
                                  {user.permissions?.canScan ? '✓ Enabled' : '○ Disabled'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Wave Editor Modal */}
      <AnimatePresence>
        {editingEvent && (
          <WaveEditorModal
            event={editingEvent}
            token={token}
            onClose={() => setEditingEvent(null)}
            onSaved={updated => {
              setEvents(prev => prev.map(e => e._id === updated._id ? updated : e));
              setEditingEvent(updated);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

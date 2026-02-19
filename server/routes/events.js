/**
 * Event Routes — Full wave-based management
 *
 * GET    /api/events                        — list all active events
 * GET    /api/events/:id                    — get single event (waves included)
 * POST   /api/events                        — create event + Wave 1 (admin)
 * PATCH  /api/events/:id/info               — edit name/date/venue/desc/image (admin)
 * POST   /api/events/:id/waves              — add a new wave (admin)
 * PATCH  /api/events/:id/waves/:waveId      — edit wave name/desc/active (admin)
 * POST   /api/events/:id/waves/:waveId/categories   — add category to wave (admin)
 * PATCH  /api/events/:id/waves/:waveId/categories/:catId — edit category seats/price (admin)
 * DELETE /api/events/:id                    — deactivate event (admin)
 */

const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// ── GET /api/events ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const events = await Event.find({ isActive: true }).sort({ date: 1 }).populate('createdBy', 'name picture');
    res.json({ success: true, count: events.length, events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/events/all ─────────────────────────────────────────────────────────
// Admin endpoint: returns ALL events (including inactive)
router.get('/all', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const events = await Event.find().sort({ date: -1 }).populate('createdBy', 'name picture');
    res.json({ success: true, count: events.length, events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/events/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('createdBy', 'name picture');
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/events — create event with initial Wave 1 ─────────────────────
// Accepts two formats for backward compatibility:
//   New format: { categories: [{ type, label, price, seats }] }
//   Legacy fmt: { vipSeats, vipPrice, fanPitSeats, fanPitPrice, regularSeats, regularPrice }
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, date, venue, description, image, imagePositionX, imagePositionY, imageScale, imageOffsetX, imageOffsetY, categories,
            vipSeats, vipPrice, fanPitSeats, fanPitPrice, regularSeats, regularPrice } = req.body;

    // Normalise to categories array regardless of which format was sent
    let wave1Categories;

    if (categories && categories.length > 0) {
      // New wave-based format
      wave1Categories = categories.map(c => ({
        type:           c.type,
        label:          c.label || '',
        price:          Number(c.price)  || 0,
        totalSeats:     Number(c.seats)  || 0,
        remainingSeats: Number(c.seats)  || 0,
        soldSeats:      0,
      }));
    } else {
      // Legacy flat format — build Wave 1 categories from individual fields
      wave1Categories = [];
      if (Number(vipSeats) > 0)     wave1Categories.push({ type: 'vip',     label: '', price: Number(vipPrice)     || 0, totalSeats: Number(vipSeats),     remainingSeats: Number(vipSeats),     soldSeats: 0 });
      if (Number(fanPitSeats) > 0)  wave1Categories.push({ type: 'fanPit',  label: '', price: Number(fanPitPrice)  || 0, totalSeats: Number(fanPitSeats),  remainingSeats: Number(fanPitSeats),  soldSeats: 0 });
      if (Number(regularSeats) > 0) wave1Categories.push({ type: 'regular', label: '', price: Number(regularPrice) || 0, totalSeats: Number(regularSeats), remainingSeats: Number(regularSeats), soldSeats: 0 });
    }

    const event = new Event({
      name, date, venue,
      description: description || '',
      image:       image       || '',
      imagePositionX: typeof imagePositionX === 'number' ? imagePositionX : 50,
      imagePositionY: typeof imagePositionY === 'number' ? imagePositionY : 50,
      imageScale:     typeof imageScale === 'number' ? imageScale : 1,
      imageOffsetX:   typeof imageOffsetX === 'number' ? imageOffsetX : 0,
      imageOffsetY:   typeof imageOffsetY === 'number' ? imageOffsetY : 0,
      waves: [{
        name:        'Wave 1',
        description: 'Initial release',
        isActive:    true,
        categories:  wave1Categories,
      }],
      createdBy: req.user._id,
    });

    event.recomputeSeats();
    event.totalSeats = wave1Categories.reduce((s, c) => s + c.totalSeats, 0);
    await event.save();

    res.status(201).json({ success: true, message: 'Event created', event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/events/:id/info — edit basic event info ──────────────────────
router.patch('/:id/info', protect, adminOnly, async (req, res) => {
  try {
    const { name, date, venue, description, image, imagePositionX, imagePositionY, imageScale, imageOffsetX, imageOffsetY } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    if (name)        event.name        = name;
    if (date)        event.date        = date;
    if (venue)       event.venue       = venue;
    if (description !== undefined) event.description = description;
    if (image !== undefined)       event.image       = image;
    if (imagePositionX !== undefined) event.imagePositionX = imagePositionX;
    if (imagePositionY !== undefined) event.imagePositionY = imagePositionY;
    if (imageScale !== undefined)     event.imageScale     = imageScale;
    if (imageOffsetX !== undefined)   event.imageOffsetX   = imageOffsetX;
    if (imageOffsetY !== undefined)   event.imageOffsetY   = imageOffsetY;

    await event.save();
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/events/:id/waves — add a new wave ──────────────────────────────
router.post('/:id/waves', protect, adminOnly, async (req, res) => {
  try {
    const { name, description, categories } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const waveCategories = (categories || []).map(c => ({
      type:           c.type,
      label:          c.label || '',
      price:          Number(c.price) || 0,
      totalSeats:     Number(c.seats) || 0,
      remainingSeats: Number(c.seats) || 0,
      soldSeats:      0,
    }));

    const waveNumber = event.waves.length + 1;
    event.waves.push({
      name:        name || `Wave ${waveNumber}`,
      description: description || '',
      isActive:    true,
      categories:  waveCategories,
    });

    const newSeats = waveCategories.reduce((s, c) => s + c.totalSeats, 0);
    event.totalSeats += newSeats;

    event.recomputeSeats(); // auto-clears isSoldOut if new seats added
    await event.save();

    res.status(201).json({ success: true, message: 'Wave added', event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/events/:id/waves/:waveId — edit wave meta ────────────────────
router.patch('/:id/waves/:waveId', protect, adminOnly, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const wave = event.waves.id(req.params.waveId);
    if (!wave) return res.status(404).json({ success: false, message: 'Wave not found' });

    const { name, description, isActive } = req.body;
    if (name !== undefined)        wave.name        = name;
    if (description !== undefined) wave.description = description;
    if (isActive !== undefined)    wave.isActive    = isActive;

    event.recomputeSeats();
    await event.save();
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/events/:id/waves/:waveId/categories — add category to wave ─────
router.post('/:id/waves/:waveId/categories', protect, adminOnly, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const wave = event.waves.id(req.params.waveId);
    if (!wave) return res.status(404).json({ success: false, message: 'Wave not found' });

    const { type, label, price, seats } = req.body;
    const newSeats = Number(seats) || 0;

    wave.categories.push({
      type,
      label:          label || '',
      price:          Number(price) || 0,
      totalSeats:     newSeats,
      remainingSeats: newSeats,
      soldSeats:      0,
    });

    event.totalSeats += newSeats;
    event.recomputeSeats();
    await event.save();
    res.status(201).json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/events/:id/waves/:waveId/categories/:catId — edit category ───
// Admins can increase seats or change future price. Already-sold tickets unaffected.
router.patch('/:id/waves/:waveId/categories/:catId', protect, adminOnly, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const wave = event.waves.id(req.params.waveId);
    if (!wave) return res.status(404).json({ success: false, message: 'Wave not found' });

    const cat = wave.categories.id(req.params.catId);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });

    const { price, seats, label } = req.body;

    if (label !== undefined) cat.label = label;

    // Price change: only affects future purchases, sold tickets are locked
    if (price !== undefined) cat.price = Number(price);

    // Seat increase (or set): add the delta to remaining
    if (seats !== undefined) {
      const newTotal = Number(seats);
      const delta = newTotal - cat.totalSeats;
      if (delta < 0) {
        // Cannot reduce below already sold
        if (newTotal < cat.soldSeats) {
          return res.status(400).json({ success: false, message: 'Cannot reduce below already sold seats' });
        }
        cat.remainingSeats = Math.max(0, cat.remainingSeats + delta);
      } else {
        cat.remainingSeats += delta;
      }
      event.totalSeats  += delta;
      cat.totalSeats     = newTotal;
    }

    event.recomputeSeats(); // auto-clears isSoldOut if seats added
    await event.save();
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/events/:id — deactivate ──────────────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, message: 'Event deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

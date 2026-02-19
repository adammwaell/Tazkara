/**
 * Order Routes — Wave-aware atomic purchasing
 *
 * POST /api/orders       — purchase tickets (wave-aware atomic decrement)
 * GET  /api/orders       — user's own orders
 * GET  /api/orders/all   — admin: all orders
 */

const express   = require('express');
const mongoose  = require('mongoose');
const QRCode    = require('qrcode');
const nodemailer = require('nodemailer');
const Event     = require('../models/Event');
const Order     = require('../models/Order');
const Ticket    = require('../models/Ticket');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

const APP_URL = process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:3000';

// ── Email helper ─────────────────────────────────────────────────────────────
async function sendTicketEmail(user, event, tickets) {
  try {
    const account = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email', port: 587, secure: false,
      auth: { user: account.user, pass: account.pass },
    });

    const list = tickets.map((t, i) =>
      `<p>Ticket ${i+1}: <strong>${t.ticketCode}</strong> — ${t.seatType}</p>`
    ).join('');

    const info = await transporter.sendMail({
      from: '"AdamTickets 🎟" <no-reply@adamtickets.com>',
      to: user.email,
      subject: `Your tickets for ${event.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#0a0a08;color:#f0efe8;padding:40px;border-radius:12px">
          <h2 style="color:#d4a017">🎉 Booking Confirmed</h2>
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>Your tickets for <strong>${event.name}</strong> at <strong>${event.venue}</strong> are confirmed.</p>
          ${list}
          <p style="margin-top:24px;color:#a8a89a;font-size:13px">Present your QR code at the venue entrance.</p>
        </div>
      `,
      attachments: tickets.map((t, i) => ({
        filename: `ticket-${i+1}.png`,
        content: t.qrCode.split('base64,')[1],
        encoding: 'base64',
        contentType: 'image/png',
      })),
    });

    console.log('📧 Email preview:', nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error('Email error (non-fatal):', err.message);
  }
}

// ── POST /api/orders ─────────────────────────────────────────────────────────
// Wave-aware atomic purchase: finds first active wave with enough seats
router.post('/', protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { eventId, seatType, quantity } = req.body;
    if (!eventId || !seatType || !quantity) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'eventId, seatType, quantity required' });
    }

    const qty = Number(quantity);
    if (qty < 1 || qty > 10) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Quantity must be 1–10' });
    }

    const validTypes = ['vip', 'fanPit', 'regular'];
    if (!validTypes.includes(seatType)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Invalid seat type' });
    }

    // Load event with session lock
    const event = await Event.findOne({ _id: eventId, isActive: true }).session(session);
    if (!event) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // ── WAVE PATH vs LEGACY PATH ─────────────────────────────────────────────
    // Events created with the wave system use wave-based inventory.
    // Events created before wave support use the legacy flat seat fields.
    // Both paths end with the same Order + Ticket creation below.

    let targetWave = null, targetCat = null, pricePerTicket = 0, updated = null;

    const hasWaves = event.waves && event.waves.length > 0;

    if (hasWaves) {
      // ── Wave-aware path ───────────────────────────────────────────────────
      // Find first active wave with enough remaining seats of requested type
      for (const wave of event.waves) {
        if (!wave.isActive) continue;
        for (const cat of wave.categories) {
          if (cat.type === seatType && cat.remainingSeats >= qty) {
            targetWave     = wave;
            targetCat      = cat;
            pricePerTicket = cat.price;
            break;
          }
        }
        if (targetCat) break;
      }

      if (!targetCat) {
        await session.abortTransaction();
        return res.status(409).json({ success: false, message: `Not enough ${seatType} seats available` });
      }

      // Atomic decrement inside the wave subdocument
      const seatFieldPath = `waves.$[w].categories.$[c].remainingSeats`;
      const soldFieldPath = `waves.$[w].categories.$[c].soldSeats`;

      updated = await Event.findOneAndUpdate(
        {
          _id:      eventId,
          isActive: true,
          'waves._id':                        targetWave._id,
          'waves.categories._id':             targetCat._id,
          'waves.categories.remainingSeats':  { $gte: qty },
        },
        {
          $inc: {
            [seatFieldPath]: -qty,
            [soldFieldPath]:  qty,
            soldCount:        qty,
          },
        },
        {
          arrayFilters: [{ 'w._id': targetWave._id }, { 'c._id': targetCat._id }],
          new: true,
          session,
        }
      );

      if (!updated) {
        await session.abortTransaction();
        return res.status(409).json({ success: false, message: 'Seats were taken — please try again' });
      }

      // Recompute aggregated seat totals and isSoldOut flag
      updated.recomputeSeats();
      await updated.save({ session });

    } else {
      // ── Legacy path (pre-wave events) ─────────────────────────────────────
      // Uses the flat vipSeats / fanPitSeats / regularSeats + vipPrice etc.
      const seatFieldMap  = { vip: 'vipSeats', fanPit: 'fanPitSeats', regular: 'regularSeats' };
      const priceFieldMap = { vip: 'vipPrice', fanPit: 'fanPitPrice', regular: 'regularPrice' };
      const seatField     = seatFieldMap[seatType];

      // Atomic decrement on flat field — same concurrency-safe pattern
      updated = await Event.findOneAndUpdate(
        { _id: eventId, isActive: true, isSoldOut: false, [seatField]: { $gte: qty } },
        { $inc: { [seatField]: -qty, soldCount: qty } },
        { new: true, session }
      );

      if (!updated) {
        await session.abortTransaction();
        return res.status(409).json({ success: false, message: `Not enough ${seatType} seats available` });
      }

      // Auto-mark sold out if all flat seat types hit zero
      if (updated.vipSeats === 0 && updated.fanPitSeats === 0 && updated.regularSeats === 0) {
        await Event.findByIdAndUpdate(eventId, { isSoldOut: true }, { session });
      }

      pricePerTicket = event[priceFieldMap[seatType]];
      // targetWave stays null — will be saved as null in Order (backward compat)
    }

    const totalPrice = pricePerTicket * qty;

    // Create order — wave fields recorded for audit trail, locked at purchase time.
    // waveId/waveName are null for legacy (pre-wave) events — backward compatible.
    const [order] = await Order.create([{
      userId:         req.user._id,
      eventId,
      seatType,
      quantity:       qty,
      pricePerTicket, // price locked at purchase time — never changes post-purchase
      totalPrice,
      paymentStatus:  'completed',
      waveId:         targetWave?._id  ?? null,
      waveName:       targetWave?.name ?? null,
    }], { session });

    // Generate QR tickets
    const ticketDocs = [];
    for (let i = 0; i < qty; i++) {
      const ticketCode = `AT-${Date.now()}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;
      const validateUrl = `${APP_URL}/validate/${ticketCode}`;
      const qrCode = await QRCode.toDataURL(validateUrl);
      ticketDocs.push({ userId: req.user._id, eventId, orderId: order._id, seatType, qrCode, ticketCode, status: 'unused' });
    }

    const tickets = await Ticket.insertMany(ticketDocs, { session });
    await session.commitTransaction();

    // Non-blocking email
    sendTicketEmail(req.user, event, tickets);

    res.status(201).json({
      success: true,
      message: 'Purchase successful! Check your email for tickets.',
      order,
      tickets: tickets.map(t => ({ id: t._id, ticketCode: t.ticketCode, seatType: t.seatType, qrCode: t.qrCode, status: t.status })),
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('Order error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
});

// ── GET /api/orders — user's own ─────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate('eventId', 'name date venue image').sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/orders/all — admin ───────────────────────────────────────────────
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'name email picture')
      .populate('eventId', 'name date venue')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

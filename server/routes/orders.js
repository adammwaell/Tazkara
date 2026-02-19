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
async function sendTicketEmail(user, event, tickets, order) {
  try {
    console.log('[email] Starting email send to:', user.email);
    
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('[email] Missing SMTP config in .env');
      return;
    }

    // Use Gmail SMTP from environment
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Prepare QR attachments as CID embedded images
    const attachments = tickets.map((t, i) => {
      // Extract base64 data from QR code (remove data:image/png;base64, prefix)
      const base64Data = t.qrCode.replace(/^data:image\/\w+;base64,/, '');
      return {
        filename: `ticket-${i + 1}-qr.png`,
        content: Buffer.from(base64Data, 'base64'),
        cid: `ticketqr-${i}`,
        encoding: 'base64'
      };
    });

    // Build QR images using CID references
    const qrImages = tickets.map((t, i) => 
      `<div style="background:#fafafa;border:1px solid #e5e5e5;border-radius:8px;padding:24px;margin:20px 0;text-align:center;">
        <p style="margin:0 0 16px 0;color:#333;font-size:14px;font-weight:600;">Ticket #${i + 1}</p>
        <img src="cid:ticketqr-${i}" width="220" height="220" style="display:block;margin:0 auto;background:#ffffff;padding:12px;border-radius:10px;" alt="QR Code" />
        <p style="margin:12px 0 0 0;font-size:10px;color:#888;font-family:monospace;">${t._id}</p>
      </div>`
    ).join('');

    const ticketList = tickets.map((t, i) =>
      `<tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px;">${i + 1}</td>
        <td style="padding:8px;">${user.name}</td>
        <td style="padding:8px;">${t.seatType}</td>
        <td style="padding:8px;">${order?.waveName || 'General'}</td>
      </tr>`
    ).join('');

    const info = await transporter.sendMail({
      from: `"Tazkara" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: user.email,
      subject: `Your Tickets for ${event.name}`,
      attachments: attachments,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#1a1a2e 0%,#2d2d4a 100%);padding:40px 30px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:700;">Tazkara</h1>
                      <p style="margin:10px 0 0 0;color:rgba(255,255,255,0.8);font-size:16px;">Your Tickets Are Ready!</p>
                    </td>
                  </tr>
                  
                  <!-- Thank You -->
                  <tr>
                    <td style="padding:30px 30px 10px 30px;text-align:center;">
                      <p style="margin:0;font-size:18px;color:#333;">Hi <strong>${user.name}</strong>!</p>
                      <p style="margin:10px 0 0 0;color:#666;font-size:15px;">Thank you for your purchase. Your tickets are confirmed!</p>
                    </td>
                  </tr>
                  
                  <!-- Event Details -->
                  <tr>
                    <td style="padding:20px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:12px;border:1px solid #e9ecef;">
                        <tr>
                          <td style="padding:20px;">
                            <p style="margin:0 0 8px 0;color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px;">EVENT</p>
                            <p style="margin:0 0 15px 0;color:#1a1a2e;font-size:20px;font-weight:700;">${event.name}</p>
                            
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="padding:8px 0;border-top:1px solid #e9ecef;">
                                  <p style="margin:0;color:#666;font-size:14px;"><strong>Date:</strong> ${new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:8px 0;border-top:1px solid #e9ecef;">
                                  <p style="margin:0;color:#666;font-size:14px;"><strong>Venue:</strong> ${event.venue}</p>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:8px 0;border-top:1px solid #e9ecef;">
                                  <p style="margin:0;color:#666;font-size:14px;"><strong>Seat:</strong> ${tickets[0]?.seatType || 'N/A'}</p>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:8px 0;border-top:1px solid #e9ecef;">
                                  <p style="margin:0;color:#666;font-size:14px;"><strong>Wave:</strong> ${order?.waveName || 'General'}</p>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:8px 0;border-top:1px solid #e9ecef;">
                                  <p style="margin:0;color:#666;font-size:14px;"><strong>Quantity:</strong> ${tickets.length} ticket(s)</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- QR Codes -->
                  <tr>
                    <td style="padding:10px 30px 20px 30px;">
                      <p style="margin:0 0 15px 0;color:#1a1a2e;font-size:16px;font-weight:600;text-align:center;">Your QR Codes</p>
                      ${qrImages}
                    </td>
                  </tr>
                  
                  <!-- Instructions -->
                  <tr>
                    <td style="padding:20px 30px;background:#fff3cd;border-top:1px solid #ffeeba;">
                      <p style="margin:0;color:#856404;font-size:14px;text-align:center;">
                        <strong>Important:</strong> Please present your QR code at the venue entrance
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Order ID -->
                  <tr>
                    <td style="padding:20px 30px;text-align:center;">
                      <p style="margin:0;color:#999;font-size:12px;">Order ID: <span style="font-family:monospace;">${order?._id || 'N/A'}</span></p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background:#1a1a2e;padding:30px;text-align:center;">
                      <p style="margin:0 0 10px 0;color:rgba(255,255,255,0.6);font-size:13px;">Thank you for choosing Tazkara!</p>
                      <p style="margin:0;color:rgba(255,255,255,0.4);font-size:11px;">© 2026 Tazkara. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log('📧 Email sent:', info.messageId);
  } catch (err) {
    console.error('[email] FATAL ERROR:', err.message);
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
      const qrCode = await QRCode.toDataURL(validateUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        margin: 2,
        width: 300,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      ticketDocs.push({ userId: req.user._id, eventId, orderId: order._id, seatType, qrCode, ticketCode, status: 'unused' });
    }

    const tickets = await Ticket.insertMany(ticketDocs, { session });
    await session.commitTransaction();

    // Non-blocking email
    sendTicketEmail(req.user, event, tickets, order);

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

/**
 * Orders API Routes - Next.js API Handler
 * POST /api/orders - create order (purchase)
 * GET /api/orders - user's orders
 * GET /api/orders/all - admin all orders
 */

import mongoose from 'mongoose';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import dbConnect from '../../../lib/db';
import Event from '../../../models/Event';
import Order from '../../../models/Order';
import Ticket from '../../../models/Ticket';
import { authenticate, requireAdmin } from '../../../lib/auth';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function sendTicketEmail(user, event, tickets, order) {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('[email] Missing SMTP config');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });

    const attachments = tickets.map((t, i) => {
      const base64Data = t.qrCode.replace(/^data:image\/\w+;base64,/, '');
      return {
        filename: `ticket-${i + 1}-qr.png`,
        content: Buffer.from(base64Data, 'base64'),
        cid: `ticketqr-${i}`,
        encoding: 'base64'
      };
    });

    const qrImages = tickets.map((t, i) => 
      `<div style="background:#fafafa;border:1px solid #e5e5e5;border-radius:8px;padding:24px;margin:20px 0;text-align:center;">
        <p style="margin:0 0 16px 0;color:#333;font-size:14px;font-weight:600;">Ticket #${i + 1}</p>
        <img src="cid:ticketqr-${i}" width="220" height="220" style="display:block;margin:0 auto;background:#ffffff;padding:12px;border-radius:10px;" alt="QR Code" />
        <p style="margin:12px 0 0 0;font-size:10px;color:#888;font-family:monospace;">${t._id}</p>
      </div>`
    ).join('');

    const info = await transporter.sendMail({
      from: `"Tazkara" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: user.email,
      subject: `Your Tickets for ${event.name}`,
      attachments: attachments,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#d4a017;">🎟 Your Tickets</h2>
          <p>Hello ${user.name},</p>
          <p>Your tickets for <strong>${event.name}</strong> have been confirmed!</p>
          <div style="background:#fff;border:1px solid #ddd;border-radius:12px;padding:20px;margin:20px 0;">
            <p><strong>📅 Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
            <p><strong>📍 Venue:</strong> ${event.venue}</p>
            <p><strong>🎫 Quantity:</strong> ${tickets.length}</p>
            <p><strong>💰 Total:</strong> $${order.totalAmount}</p>
          </div>
          ${qrImages}
          <p style="color:#666;font-size:12px;">Show these QR codes at the venue entry.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:30px 0;" />
          <p style="color:#999;font-size:11px;">AdamTickets - Premium Event Ticketing</p>
        </div>
      `,
    });

    console.log('📧 Email sent:', info.messageId);
  } catch (err) {
    console.error('[email error]', err.message);
  }
}

export default async function handler(req, res) {
  const { method } = req;
  const { all } = req.query;

  try {
    await dbConnect();

    // GET /api/orders or /api/orders?all=true
    if (method === 'GET') {
      const auth = await authenticate(req);
      if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });

      // Admin all orders
      if (all === 'true') {
        const adminError = requireAdmin(auth.user);
        if (adminError) return res.status(adminError.status).json({ success: false, message: adminError.message });

        const orders = await Order.find().populate('user', 'name email').populate('event', 'name date venue').sort({ createdAt: -1 });
        return res.json({ success: true, orders });
      }

      // User's orders
      const orders = await Order.find({ user: auth.user._id }).populate('event', 'name date venue').sort({ createdAt: -1 });
      return res.json({ success: true, orders });
    }

    // POST /api/orders - create order
    if (method === 'POST') {
      const auth = await authenticate(req);
      if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });

      const { eventId, seatType, quantity } = req.body;
      if (!eventId || !seatType || !quantity) {
        return res.status(400).json({ success: false, message: 'eventId, seatType, quantity required' });
      }

      const qty = Number(quantity);
      if (qty < 1 || qty > 10) {
        return res.status(400).json({ success: false, message: 'Quantity must be 1-10' });
      }

      const validTypes = ['vip', 'fanPit', 'regular'];
      if (!validTypes.includes(seatType)) {
        return res.status(400).json({ success: false, message: 'Invalid seat type' });
      }

      const event = await Event.findOne({ _id: eventId, isActive: true });
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      // Find available seats
      let targetWave = null, targetCat = null, pricePerTicket = 0;
      const hasWaves = event.waves && event.waves.length > 0;

      if (hasWaves) {
        for (const wave of event.waves) {
          if (!wave.isActive) continue;
          for (const cat of wave.categories) {
            if (cat.type === seatType && cat.remainingSeats >= qty) {
              targetWave = wave;
              targetCat = cat;
              pricePerTicket = cat.price;
              break;
            }
          }
          if (targetCat) break;
        }
      }

      if (!targetCat) {
        return res.status(409).json({ success: false, message: `Not enough ${seatType} seats available` });
      }

      // Update seats
      targetCat.remainingSeats -= qty;
      targetCat.soldSeats = (targetCat.soldSeats || 0) + qty;
      event.soldCount = (event.soldCount || 0) + qty;
      await event.save();

      // Create tickets with QR codes
      const tickets = [];
      for (let i = 0; i < qty; i++) {
        const ticketId = new mongoose.Types.ObjectId();
        const validateUrl = `${APP_URL}/validate/${ticketId}`;
        const qrCode = await QRCode.toDataURL(validateUrl);

        const ticket = await Ticket.create({
          _id: ticketId,
          event: event._id,
          user: auth.user._id,
          seatType,
          price: pricePerTicket,
          qrCode,
          status: 'valid',
        });
        tickets.push(ticket);
      }

      // Create order
      const totalAmount = pricePerTicket * qty;
      const order = await Order.create({
        user: auth.user._id,
        event: event._id,
        tickets: tickets.map(t => t._id),
        totalAmount,
        waveName: targetWave?.name || 'General',
        status: 'completed',
      });

      // Send email
      sendTicketEmail(auth.user, event, tickets, order);

      return res.status(201).json({
        success: true,
        order,
        tickets,
        message: 'Purchase successful! Check your email for tickets.',
      });
    }

    return res.status(404).json({ success: false, message: 'Method not allowed' });

  } catch (err) {
    console.error('[orders API]', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

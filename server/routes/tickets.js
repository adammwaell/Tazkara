/**
 * Ticket Routes
 * GET /api/tickets/my       - Get current user's tickets
 * POST /api/tickets/validate - Validate a ticket (staff/admin, returns details)
 * GET /api/tickets/:code      - Validate ticket by code (admin)
 */

const express = require('express');
const Ticket = require('../models/Ticket');
const { protect, adminOnly, scannerAccess } = require('../middleware/authMiddleware');

const router = express.Router();

// ── GET /api/tickets/my ──────────────────────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user._id })
      .populate('eventId', 'name date venue image')
      .populate('orderId', 'waveName pricePerTicket')
      .sort({ createdAt: -1 });

    const withWave = tickets.map(t => ({
      ...t.toObject(),
      waveName: t.orderId?.waveName ?? null,
      pricePerTicket: t.orderId?.pricePerTicket ?? null,
    }));

    res.json({ success: true, tickets: withWave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/tickets/validate (admin or scanner permission) ──────────────────
router.post('/validate', protect, scannerAccess, async (req, res) => {
  try {
    const { ticketCode } = req.body;
    
    if (!ticketCode) {
      return res.status(400).json({ success: false, message: 'Ticket code is required' });
    }

    // Atomic findOneAndUpdate - accepts both 'unused' and 'active' status for backward compatibility
    const ticket = await Ticket.findOneAndUpdate(
      { ticketCode, status: { $in: ['unused', 'active'] } },
      { 
        status: 'used',
        usedAt: new Date(),
        scannedBy: req.user._id
      },
      { new: true }
    ).populate('userId', 'name').populate('eventId', 'name date venue').populate('orderId', 'waveName');

    if (!ticket) {
      // Check if ticket exists but is not valid
      const existingTicket = await Ticket.findOne({ ticketCode })
        .populate('userId', 'name')
        .populate('eventId', 'name date venue')
        .populate('orderId', 'waveName');
      
      if (existingTicket) {
        return res.status(400).json({ 
          success: false, 
          alreadyUsed: true,
          message: 'This ticket has already been scanned.',
          ticket: existingTicket 
        });
      }
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Return ticket details (without sensitive data)
    res.json({ 
      success: true, 
      validated: true,
      message: 'Ticket validated successfully',
      ticket: {
        ticketCode: ticket.ticketCode,
        seatType: ticket.seatType,
        status: ticket.status,
        usedAt: ticket.usedAt,
        eventId: ticket.eventId,
        orderId: ticket.orderId,
        holderName: ticket.userId?.name
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/tickets/:code (validate - admin) ─────────────────────────────────
router.get('/:code', protect, adminOnly, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketCode: req.params.code })
      .populate('userId', 'name email')
      .populate('eventId', 'name date venue');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/tickets/:code/use (mark as used - admin) ──────────────────────
router.patch('/:code/use', protect, adminOnly, async (req, res) => {
  try {
    const ticket = await Ticket.findOneAndUpdate(
      { ticketCode: req.params.code, status: { $in: ['unused', 'active'] } },
      { 
        status: 'used',
        usedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'name').populate('eventId', 'name date venue');

    if (!ticket) {
      return res.status(400).json({ success: false, message: 'Ticket not found or already used' });
    }

    res.json({ success: true, message: 'Ticket validated successfully', ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

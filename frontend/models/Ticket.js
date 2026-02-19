/**
 * Ticket Model
 * Represents a single seat reservation with QR code
 */

import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    seatType: {
      type: String,
      enum: ['vip', 'fanPit', 'regular'],
      required: true,
    },
    qrCode: {
      type: String, // base64 data URL
      required: true,
    },
    status: {
      type: String,
      enum: ['unused', 'used', 'cancelled'],
      default: 'unused',
    },
    // Unique ticket reference code shown to attendees
    ticketCode: {
      type: String,
      unique: true,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);
export default Ticket;

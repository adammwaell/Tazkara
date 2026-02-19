/**
 * Order Model
 *
 * Represents a single purchase transaction for one or more tickets of the same type.
 *
 * BACKWARD COMPATIBLE: waveId and waveName are optional so existing orders
 * created before wave support are unaffected.
 */

import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
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
    seatType: {
      type: String,
      enum: ['vip', 'fanPit', 'regular'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Must order at least 1 ticket'],
      max: [10, 'Cannot order more than 10 tickets at once'],
    },
    pricePerTicket: { type: Number, required: true },
    totalPrice:     { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    // Sandbox payment reference
    paymentRef: {
      type: String,
      default: () =>
        `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    },

    // ── Wave tracking (optional — null for pre-wave orders) ────────────────
    // Immutable after creation: records which wave the seats came from.
    // Existing orders without these fields continue to work normally.
    waveId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    waveName: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export default Order;

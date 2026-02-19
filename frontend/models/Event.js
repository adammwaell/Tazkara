/**
 * Event Model — Wave-Based Ticketing
 *
 * Each event supports multiple ticket waves (Wave 1, Wave 2, etc.)
 * Each wave has independent quantities and prices per seat category.
 * isSoldOut is DYNAMIC — auto-cleared when admin adds new seats.
 * Events are NEVER permanently locked due to sold-out status.
 */

import mongoose from 'mongoose';

// ── Wave Category sub-schema ────────────────────────────────────────────────
const waveCategorySchema = new mongoose.Schema({
  type:           { type: String, enum: ['vip', 'fanPit', 'regular'], required: true },
  label:          { type: String, default: '' },        // e.g. "VIP Early Bird"
  price:          { type: Number, required: true, min: 0 },
  totalSeats:     { type: Number, required: true, min: 0 },
  remainingSeats: { type: Number, required: true, min: 0 },
  soldSeats:      { type: Number, default: 0 },
}, { _id: true });

// ── Wave sub-schema ─────────────────────────────────────────────────────────
const waveSchema = new mongoose.Schema({
  name:        { type: String, required: true },  // e.g. "Wave 1", "Early Bird"
  description: { type: String, default: '' },
  releaseDate: { type: Date },
  isActive:    { type: Boolean, default: true },
  categories:  [waveCategorySchema],
}, { _id: true, timestamps: true });

// ── Main Event schema ───────────────────────────────────────────────────────
const eventSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    date:        { type: Date,   required: true },
    venue:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image:       { type: String, default: '' },
    imagePositionX: { type: Number, default: 50, min: 0, max: 100 },
    imagePositionY: { type: Number, default: 50, min: 0, max: 100 },
    imageScale:     { type: Number, default: 1, min: 1, max: 1.5 },
    imageOffsetX:   { type: Number, default: 0, min: -50, max: 50 },
    imageOffsetY:   { type: Number, default: 0, min: -50, max: 50 },

    // Wave-based inventory (source of truth)
    waves: [waveSchema],

    // Aggregated counts kept in sync after every mutation
    vipSeats:     { type: Number, default: 0, min: 0 },
    fanPitSeats:  { type: Number, default: 0, min: 0 },
    regularSeats: { type: Number, default: 0, min: 0 },
    totalSeats:   { type: Number, default: 0 },
    soldCount:    { type: Number, default: 0 },

    // Price snapshot from latest active wave (for display)
    vipPrice:     { type: Number, default: 0 },
    fanPitPrice:  { type: Number, default: 0 },
    regularPrice: { type: Number, default: 0 },

    // Status — DYNAMIC, never permanently locked
    isSoldOut: { type: Boolean, default: false },
    isActive:  { type: Boolean, default: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

/**
 * Recompute aggregated seat counts from all active waves.
 * Auto-clears isSoldOut if any seats become available again.
 * Auto-sets isSoldOut if all remaining seats reach zero.
 */
eventSchema.methods.recomputeSeats = function () {
  let vip = 0, fanPit = 0, regular = 0;
  let latestVipPrice = 0, latestFanPitPrice = 0, latestRegularPrice = 0;

  for (const wave of this.waves) {
    if (!wave.isActive) continue;
    for (const cat of wave.categories) {
      if (cat.type === 'vip')     { vip     += cat.remainingSeats; if (cat.price > 0) latestVipPrice     = cat.price; }
      if (cat.type === 'fanPit')  { fanPit  += cat.remainingSeats; if (cat.price > 0) latestFanPitPrice  = cat.price; }
      if (cat.type === 'regular') { regular += cat.remainingSeats; if (cat.price > 0) latestRegularPrice = cat.price; }
    }
  }

  this.vipSeats     = vip;
  this.fanPitSeats  = fanPit;
  this.regularSeats = regular;

  if (latestVipPrice)     this.vipPrice     = latestVipPrice;
  if (latestFanPitPrice)  this.fanPitPrice  = latestFanPitPrice;
  if (latestRegularPrice) this.regularPrice = latestRegularPrice;

  // Dynamic sold-out: clear if seats available, set if all gone
  this.isSoldOut = (vip + fanPit + regular) === 0;

  return this;
};

const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
export default Event;

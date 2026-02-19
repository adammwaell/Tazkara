/**
 * AllowedEmail Model
 * Admin-managed whitelist of emails permitted to access the platform.
 * Used when ACCESS_MODE=whitelist in .env
 */

const mongoose = require('mongoose');

const allowedEmailSchema = new mongoose.Schema(
  {
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    note:     { type: String, default: '' },   // admin note e.g. "VIP guest"
    addedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role:     { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AllowedEmail', allowedEmailSchema);

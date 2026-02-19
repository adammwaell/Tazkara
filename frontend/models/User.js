/**
 * User Model
 * Supports both email/password login and Google OAuth.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  provider: { type: String, enum: ['google', 'local'], default: 'google' },
  password: { type: String, select: false },
  picture: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
  isApproved: { type: Boolean, default: true },
  lastLogin: { type: Date },
  permissions: {
    canScan: { type: Boolean, default: false }
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare plain password with hashed
userSchema.methods.comparePassword = async function (plain) {
  if (!this.password) return false;
  return bcrypt.compare(plain, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;

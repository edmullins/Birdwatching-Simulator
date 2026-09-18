// src/models/user.js 
// ---------------------------------------------------------------------
// Mongoose User schema with bcrypt helpers, toSafeJSON() for 
// client-safe output, and stats fields.
// ---------------------------------------------------------------------
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    stats: {
      maxLevelReached: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalRuns: {
        type: Number,
        default: 0,
        min: 0,
      },
      bestScore: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalBirdsFound: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  { timestamps: true }
);

// Instance method - verify a plaintext password against the stored hash.
// Keeps bcrypt.compare calls out of the controller.
userSchema.methods.verifyPassword = function verifyPassword(plaintext) {
  return bcrypt.compare(plaintext, this.passwordHash);
};

// Static helper - hash a plaintext password before creating/updating a user.
// Controller calls this explicitly (rather than a pre-save hook) so it's
// obvious at the call site when hashing happens, and so re-saving a user
// for unrelated fields (e.g. coins) never risks re-hashing an already-hashed value.
userSchema.statics.hashPassword = function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
};

// Strips sensitive/internal fields before sending a user object to the client.
// Using this everywhere a user doc reaches a response body - register, login,
// /me, leaderboard entries, etc.
userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    username: this.username,
    isAdmin: this.isAdmin,
    stats: { 
      maxLevelReached: this.stats.maxLevelReached,
      totalRuns: this.stats.totalRuns,
      bestScore: this.stats.bestScore,
      totalBirdsFound: this.stats.totalBirdsFound,
     },
  };
};

const User = mongoose.model('User', userSchema);

export default User;
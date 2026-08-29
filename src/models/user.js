import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

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
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    passwordHash: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    coins: {
      type: Number,
      default: 0,
      min: 0,
    },
    unlockedBinoculars: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Binocular',
      },
    ],
    stats: {
      maxLevelReached: {
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
    email: this.email,
    coins: this.coins,
    unlockedBinoculars: this.unlockedBinoculars,
    stats: { maxLevelReached: this.stats.maxLevelReached },
  };
};

const User = mongoose.model('User', userSchema);

export default User;
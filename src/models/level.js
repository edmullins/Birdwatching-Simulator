import mongoose from 'mongoose';

const levelSchema = new mongoose.Schema({
  levelNumber: { type: Number, required: true, unique: true },
  minBirdsRequired: { type: Number, default: 1 },
  birdDistanceRange: {
    min: { type: Number, default: 0.5 },
    max: { type: Number, default: 2.0 }
  },
  birdDensity: { type: Number, default: 1 },
  fleeEnabled: { type: Boolean, default: false },
  backgroundId: { type: mongoose.Schema.Types.ObjectId, ref: 'Background' }
}, { timestamps: true });

const Level = mongoose.model('Level', levelSchema);
export default Level;
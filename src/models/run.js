import mongoose from 'mongoose';

const levelTimestampSchema = new mongoose.Schema({
  level: { type: Number, required: true },
  enteredAt: { type: Date, required: true },
  exitedAt: { type: Date }
}, { _id: false });

const runSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  levelReached: { type: Number, required: true },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date },
  levelTimestamps: { type: [levelTimestampSchema], default: [] },
  birdsFound: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bird' }],
  status: { type: String, enum: ['in_progress','completed','valid','flagged'], default: 'in_progress' }
}, { timestamps: true });

const Run = mongoose.model('Run', runSchema);
export default Run;
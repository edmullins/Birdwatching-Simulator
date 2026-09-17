// scripts/sync-indexes.js
import 'dotenv/config';
import mongoose from 'mongoose';
import Run from '../src/models/run.js'; // adjust path to your model

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  await Run.syncIndexes(); // creates missing indexes, drops ones no longer in the schema
  console.log('Indexes synced.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
import 'dotenv/config';
console.log('MONGODB_URI:', process.env.MONGODB_URI); // remove after debugging

import app from './src/app.js';
import { connectDB } from './src/config/db.js';

const PORT = process.env.PORT || 3000;

async function start() {
  await connectDB();
  app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
}

start();
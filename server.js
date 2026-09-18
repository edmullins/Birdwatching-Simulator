// server.js
// ---------------------------------------------------------------------
// Loads env, connects to MongoDB (connectDB()), imports the Express
// app, and starts the HTTP server on process.env.PORT || 3000, logging
// the local URL. Ensures DB connects before listening.
// ---------------------------------------------------------------------
import 'dotenv/config';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';

const PORT = process.env.PORT || 3000;

async function start() {
  await connectDB();
  app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
}

start();
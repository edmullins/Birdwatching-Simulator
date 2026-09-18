// src/config/session.js 
// ---------------------------------------------------------------------
// Builds express-session middleware backed by connect-mongo with
// secure cookie and 7‑day lifetime.
// ---------------------------------------------------------------------
import session from 'express-session';
import MongoStore from 'connect-mongo';

export function buildSessionMiddleware() {
  return session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // requires HTTPS in prod
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  });
}
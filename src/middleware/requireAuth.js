// Rejects any request without a valid session. Attaches nothing extra -
// route handlers read req.session.userId directly, since that's the one
// piece of state the session middleware guarantees is trustworthy.
export function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}
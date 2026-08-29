import User from '../models/user.js';

const USERNAME_MIN = 3;
const USERNAME_MAX = 20;
const PASSWORD_MIN = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shared validation for register - login only needs presence checks,
// since a malformed-but-nonempty username/password on login just means
// "no such user," which login already handles via the generic 401.
function validateRegisterInput({ username, email, password }) {
  const errors = [];

  if (typeof username !== 'string' || username.trim().length < USERNAME_MIN || username.trim().length > USERNAME_MAX) {
    errors.push(`username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`);
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    errors.push('email must be a valid email address');
  }
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) {
    errors.push(`password must be at least ${PASSWORD_MIN} characters`);
  }

  return errors;
}

export async function register(req, res) {
  const { username, email, password } = req.body ?? {};

  const errors = validateRegisterInput({ username, email, password });
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Invalid input', details: errors });
  }

  try {
    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
    });

    // Regenerate the session on privilege change (anonymous -> authenticated)
    // to avoid session fixation, then store the new user's id.
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regenerate failed on register:', err);
        return res.status(500).json({ error: 'Failed to start session' });
      }
      req.session.userId = user._id.toString();
      res.status(201).json({ user: user.toSafeJSON() });
    });
  } catch (err) {
    // Mongo duplicate-key error - username or email already taken.
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern ?? {})[0] ?? 'username or email';
      return res.status(409).json({ error: `${field} already in use` });
    }
    console.error('Register failed:', err);
    res.status(500).json({ error: 'Failed to register' });
  }
}

export async function login(req, res) {
  const { username, password } = req.body ?? {};

  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  try {
    const user = await User.findOne({ username: username.trim() });

    // Same generic message whether the user doesn't exist or the password is wrong.
    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regenerate failed on login:', err);
        return res.status(500).json({ error: 'Failed to start session' });
      }
      req.session.userId = user._id.toString();
      res.status(200).json({ user: user.toSafeJSON() });
    });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
}

export function logout(req, res) {
  if (!req.session) {
    return res.status(204).end();
  }
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout failed:', err);
      return res.status(500).json({ error: 'Failed to log out' });
    }
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
}

export async function me(req, res) {
  try {
    const user = await User.findById(req.session.userId);

    // Edge case: session references a user that no longer exists
    // (e.g. deleted account). Treat it the same as no session at all.
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.status(200).json({ user: user.toSafeJSON() });
  } catch (err) {
    console.error('Fetching current user failed:', err);
    res.status(500).json({ error: 'Failed to fetch current user' });
  }
}
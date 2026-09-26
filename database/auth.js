const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('./db');
// npm install nodemailer, and configure a transporter for your email provider
// (Gmail app password, SendGrid, Mailgun, etc. all work fine for a hackathon)
const nodemailer = require('nodemailer');

const router = express.Router();
const SALT_ROUNDS = 12;
const ALLOWED_ROLES = ['student', 'faculty', 'staff'];

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// Middleware: protect routes that require a logged-in user
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// Middleware: restrict a route to a specific role (e.g. requireRole('faculty'))
function requireRole(role) {
  return async (req, res, next) => {
    const result = await pool.query('SELECT role, is_verified FROM users WHERE id = $1', [
      req.session.userId,
    ]);
    const user = result.rows[0];
    if (!user || !user.is_verified || user.role !== role) {
      return res.status(403).json({ error: `Requires verified ${role} status` });
    }
    next();
  };
}

// POST /auth/register
router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email, and password are required' });
  }
  if (!email.toLowerCase().endsWith('@temple.edu')) {
    return res.status(400).json({ error: 'Please use your @temple.edu email' });
  }
  const chosenRole = ALLOWED_ROLES.includes(role) ? role : 'student';

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, verification_token, verification_expires)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, email, role`,
      [username, email, passwordHash, chosenRole, token, expires]
    );

    const user = result.rows[0];

    const verifyUrl = `${process.env.APP_URL}/auth/verify?token=${token}`;
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Verify your account',
      text: `Click to verify: ${verifyUrl}`,
    });

    res.status(201).json({ user, message: 'Check your Temple email to verify your account.' });
  } catch (err) {
    if (err.code === '23505') { // unique_violation (username or email taken)
      return res.status(409).json({ error: 'Username or email already in use' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /auth/verify?token=...
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  const result = await pool.query(
    `UPDATE users
     SET is_verified = TRUE, verification_token = NULL
     WHERE verification_token = $1 AND verification_expires > NOW()
     RETURNING id, username`,
    [token]
  );
  if (result.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid or expired verification link' });
  }
  res.json({ ok: true, message: 'Email verified! You can now log in.' });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  try {
    const result = await pool.query(
      `SELECT id, username, email, password_hash FROM users WHERE username = $1`,
      [username]
    );
    const user = result.rows[0];

    // Compare against a dummy hash if user not found, to avoid leaking timing info
    const hashToCheck = user ? user.password_hash : '$2b$12$invalidsaltinvalidsaltinvalidsal';
    const passwordMatches = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordMatches) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.userId = user.id;
    res.json({ user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// GET /auth/me — check who's currently logged in
router.get('/me', requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT id, username, email FROM users WHERE id = $1`,
    [req.session.userId]
  );
  res.json({ user: result.rows[0] });
});

module.exports = { router, requireAuth, requireRole };



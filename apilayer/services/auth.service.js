const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const AppError = require('../utils/AppError');

const SALT_ROUNDS = 10;

// Postgres's unique-constraint violation error code. When we try to
// INSERT a username/email that already exists, Postgres itself rejects
// it (because of the UNIQUE constraints in schema.sql) and throws an
// error with this code — we catch it and turn it into a clean 409
// instead of a raw database error leaking to the client.
const UNIQUE_VIOLATION = '23505';

function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// schema.sql uses snake_case columns (password_hash, created_at) since
// that's Postgres/SQL convention. The API returns camelCase (createdAt)
// since that's JS/JSON convention. This is where that translation happens,
// and it doubles as where we make sure password_hash never leaves the server.
function toPublicUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    createdAt: row.created_at,
  };
}

async function signup({ username, email, password }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const result = await query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username, email, passwordHash]
    );
    const user = result.rows[0];
    const token = signToken(user);
    return { user: toPublicUser(user), token };
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      throw new AppError('Username or email already in use', 409);
    }
    throw err; // anything else is a real/unexpected error — let errorHandler log it
  }
}

async function login({ email, password }) {
  const result = await query(`SELECT * FROM users WHERE email = $1`, [email]);
  const user = result.rows[0];

  if (!user) {
    // Same error for "no such user" and "wrong password" on purpose —
    // don't reveal which one it was, that leaks which emails are registered.
    throw new AppError('Invalid email or password', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken(user);
  return { user: toPublicUser(user), token };
}

async function getUserById(userId) {
  const result = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
  if (!result.rows[0]) throw new AppError('User not found', 404);
  return toPublicUser(result.rows[0]);
}

module.exports = { signup, login, getUserById, toPublicUser };

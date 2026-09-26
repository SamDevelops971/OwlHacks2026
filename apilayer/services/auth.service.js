const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { users } = require('../models/store');
const AppError = require('../utils/AppError');

const SALT_ROUNDS = 10;

function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Strip the password hash before ever sending a user object back to a client
function toPublicUser(user) {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

async function signup({ username, email, password }) {
  const existing = [...users.values()].find(
    u => u.email === email || u.username === username
  );
  if (existing) {
    throw new AppError('Username or email already in use', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = {
    id: uuidv4(),
    username,
    email,
    passwordHash,
    bio: '',
    createdAt: new Date().toISOString(),
  };
  users.set(user.id, user);

  const token = signToken(user);
  return { user: toPublicUser(user), token };
}

async function login({ email, password }) {
  const user = [...users.values()].find(u => u.email === email);
  if (!user) {
    // Same error for "no such user" and "wrong password" on purpose —
    // don't reveal which one it was, that leaks which emails are registered.
    throw new AppError('Invalid email or password', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken(user);
  return { user: toPublicUser(user), token };
}

module.exports = { signup, login, toPublicUser };

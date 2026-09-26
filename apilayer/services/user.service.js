const { users, follows } = require('../models/store');
const { toPublicUser } = require('./auth.service');
const AppError = require('../utils/AppError');

function getUserById(userId) {
  const user = users.get(userId);
  if (!user) throw new AppError('User not found', 404);
  return toPublicUser(user);
}

function updateUser(userId, updates) {
  const user = users.get(userId);
  if (!user) throw new AppError('User not found', 404);

  // Only allow specific fields to be updated — never let a client
  // overwrite passwordHash or id via a generic "update profile" endpoint.
  const allowed = ['bio', 'username'];
  for (const key of allowed) {
    if (updates[key] !== undefined) user[key] = updates[key];
  }
  users.set(userId, user);
  return toPublicUser(user);
}

function follow(currentUserId, targetUserId) {
  if (currentUserId === targetUserId) {
    throw new AppError('You cannot follow yourself', 400);
  }
  if (!users.has(targetUserId)) {
    throw new AppError('User to follow not found', 404);
  }

  if (!follows.has(currentUserId)) follows.set(currentUserId, new Set());
  follows.get(currentUserId).add(targetUserId);
  return { following: true };
}

function unfollow(currentUserId, targetUserId) {
  follows.get(currentUserId)?.delete(targetUserId);
  return { following: false };
}

function getFollowing(userId) {
  const ids = [...(follows.get(userId) || [])];
  return ids.map(id => getUserById(id));
}

function getFollowers(userId) {
  const followerIds = [];
  for (const [followerId, followingSet] of follows.entries()) {
    if (followingSet.has(userId)) followerIds.push(followerId);
  }
  return followerIds.map(id => getUserById(id));
}

module.exports = {
  getUserById,
  updateUser,
  follow,
  unfollow,
  getFollowing,
  getFollowers,
};

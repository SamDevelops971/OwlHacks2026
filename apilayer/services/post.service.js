const { v4: uuidv4 } = require('uuid');
const { posts, likes, comments, follows, users } = require('../models/store');
const AppError = require('../utils/AppError');

function enrichPost(post, viewerId) {
  const author = users.get(post.authorId);
  const likeSet = likes.get(post.id) || new Set();
  const postComments = comments.get(post.id) || [];

  return {
    id: post.id,
    text: post.text,
    createdAt: post.createdAt,
    author: author ? { id: author.id, username: author.username } : null,
    likeCount: likeSet.size,
    likedByMe: viewerId ? likeSet.has(viewerId) : false,
    commentCount: postComments.length,
  };
}

function createPost(authorId, text) {
  const post = { id: uuidv4(), authorId, text, createdAt: new Date().toISOString() };
  posts.set(post.id, post);
  return enrichPost(post, authorId);
}

function getPost(postId, viewerId) {
  const post = posts.get(postId);
  if (!post) throw new AppError('Post not found', 404);
  return enrichPost(post, viewerId);
}

function deletePost(postId, requesterId) {
  const post = posts.get(postId);
  if (!post) throw new AppError('Post not found', 404);
  if (post.authorId !== requesterId) {
    throw new AppError('You can only delete your own posts', 403);
  }
  posts.delete(postId);
  likes.delete(postId);
  comments.delete(postId);
  return { deleted: true };
}

/**
 * getFeed: a simplified "pull" model feed — at request time, gather
 * posts from everyone the user follows (plus their own), sort by
 * recency, and paginate with a cursor.
 *
 * Real-world feeds at scale usually use a "push" (fan-out-on-write)
 * model instead: when someone posts, the post ID is pushed into each
 * follower's precomputed feed list immediately, so reading the feed
 * later is a cheap lookup instead of an expensive join at read time.
 * Pull works fine for small/medium scale and is much simpler to reason about.
 */
function getFeed(userId, { cursor, limit = 10 }) {
  const followingIds = new Set(follows.get(userId) || []);
  followingIds.add(userId); // include your own posts in your feed

  let relevantPosts = [...posts.values()]
    .filter(p => followingIds.has(p.authorId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (cursor) {
    const cursorIndex = relevantPosts.findIndex(p => p.id === cursor);
    if (cursorIndex >= 0) relevantPosts = relevantPosts.slice(cursorIndex + 1);
  }

  const page = relevantPosts.slice(0, limit);
  const nextCursor = page.length === limit ? page[page.length - 1].id : null;

  return {
    posts: page.map(p => enrichPost(p, userId)),
    nextCursor,
  };
}

function likePost(postId, userId) {
  if (!posts.has(postId)) throw new AppError('Post not found', 404);
  if (!likes.has(postId)) likes.set(postId, new Set());
  likes.get(postId).add(userId);
  return { liked: true, likeCount: likes.get(postId).size };
}

function unlikePost(postId, userId) {
  likes.get(postId)?.delete(userId);
  return { liked: false, likeCount: likes.get(postId)?.size || 0 };
}

function addComment(postId, authorId, text) {
  if (!posts.has(postId)) throw new AppError('Post not found', 404);
  if (!comments.has(postId)) comments.set(postId, []);

  const comment = { id: uuidv4(), authorId, text, createdAt: new Date().toISOString() };
  comments.get(postId).push(comment);

  const author = users.get(authorId);
  return { ...comment, author: { id: author.id, username: author.username } };
}

function getComments(postId) {
  if (!posts.has(postId)) throw new AppError('Post not found', 404);
  return (comments.get(postId) || []).map(c => {
    const author = users.get(c.authorId);
    return { ...c, author: { id: author.id, username: author.username } };
  });
}

module.exports = {
  createPost,
  getPost,
  deletePost,
  getFeed,
  likePost,
  unlikePost,
  addComment,
  getComments,
};

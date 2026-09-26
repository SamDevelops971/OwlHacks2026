const { query } = require('../config/db');
const AppError = require('../utils/AppError');

/**
 * castVote: handles both "vote for the first time" and "change your
 * existing vote" (e.g. switching from upvote to downvote) in one query,
 * using Postgres's "upsert" syntax: ON CONFLICT ... DO UPDATE.
 *
 * This works because schema.sql defines votes' PRIMARY KEY as the pair
 * (user_id, post_id) — so a second INSERT with the same pair collides
 * with the first, and instead of erroring, we tell Postgres to just
 * update the existing row's value instead of rejecting the insert.
 * This is exactly what you want for "toggle your vote" behavior.
 */
async function castVote(postId, userId, value) {
  if (![1, -1].includes(value)) {
    throw new AppError('value must be 1 (upvote) or -1 (downvote)', 400);
  }

  const postCheck = await query(`SELECT id FROM posts WHERE id = $1`, [postId]);
  if (!postCheck.rows[0]) throw new AppError('Post not found', 404);

  await query(
    `INSERT INTO votes (user_id, post_id, value)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, post_id) DO UPDATE SET value = EXCLUDED.value`,
    [userId, postId, value]
  );

  return getScore(postId);
}

async function removeVote(postId, userId) {
  await query(`DELETE FROM votes WHERE user_id = $1 AND post_id = $2`, [userId, postId]);
  return getScore(postId);
}

async function getScore(postId) {
  const result = await query(
    `SELECT COALESCE(SUM(value), 0)::int AS score FROM votes WHERE post_id = $1`,
    [postId]
  );
  return { score: result.rows[0].score };
}

module.exports = { castVote, removeVote, getScore };

const { query } = require('../config/db');
const AppError = require('../utils/AppError');
const clubService = require('./club.service');

/**
 * This single query is doing the work that enrichPost() used to do by
 * hand in the in-memory version: joining in the author's username and
 * the club's name, and computing the vote score and comment count with
 * a real SQL aggregate instead of looping over JS Maps.
 *
 * COALESCE(SUM(v.value), 0) — SUM() returns NULL if a post has zero
 * rows in votes (nothing to sum), so COALESCE substitutes 0 instead of
 * letting a fresh, unvoted post show a score of null.
 *
 * The comment count is a correlated subquery rather than another JOIN,
 * because joining both votes AND comments directly would multiply rows
 * (one row per vote-comment combination) and inflate the SUM. Keeping
 * it as a subquery avoids that without needing DISTINCT gymnastics.
 */
const POST_SELECT = `
  SELECT
    p.id, p.title, p.body, p.club_id, p.author_id, p.created_at,
    u.username AS author_username,
    c.name AS club_name,
    COALESCE(SUM(v.value), 0)::int AS score,
    (SELECT COUNT(*)::int FROM comments cm WHERE cm.post_id = p.id) AS comment_count
  FROM posts p
  JOIN users u ON u.id = p.author_id
  JOIN clubs c ON c.id = p.club_id
  LEFT JOIN votes v ON v.post_id = p.id
`;
const POST_GROUP_BY = ` GROUP BY p.id, u.username, c.name `;

function shapePost(row, myVote) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    club: { id: row.club_id, name: row.club_name },
    author: { id: row.author_id, username: row.author_username },
    score: row.score,
    commentCount: row.comment_count,
    // null = viewer hasn't voted, 1 = upvoted, -1 = downvoted
    myVote: myVote ?? null,
  };
}

async function getMyVote(postId, userId) {
  if (!userId) return null;
  const result = await query(
    `SELECT value FROM votes WHERE post_id = $1 AND user_id = $2`,
    [postId, userId]
  );
  return result.rows[0]?.value ?? null;
}

async function createPost(clubId, authorId, { title, body }) {
  await clubService.getClubById(clubId); // throws 404 if the club doesn't exist

  const insertResult = await query(
    `INSERT INTO posts (title, body, club_id, author_id) VALUES ($1, $2, $3, $4) RETURNING id`,
    [title, body || null, clubId, authorId]
  );
  return getPost(insertResult.rows[0].id, authorId);
}

async function getPost(postId, viewerId) {
  const result = await query(`${POST_SELECT} WHERE p.id = $1 ${POST_GROUP_BY}`, [postId]);
  if (!result.rows[0]) throw new AppError('Post not found', 404);

  const myVote = await getMyVote(postId, viewerId);
  return shapePost(result.rows[0], myVote);
}

async function deletePost(postId, requesterId) {
  const result = await query(`SELECT author_id FROM posts WHERE id = $1`, [postId]);
  const post = result.rows[0];
  if (!post) throw new AppError('Post not found', 404);
  if (post.author_id !== requesterId) {
    throw new AppError('You can only delete your own posts', 403);
  }

  // ON DELETE CASCADE in schema.sql means Postgres automatically removes
  // this post's comments and votes too — no manual cleanup needed here,
  // unlike the in-memory version which had to delete from 3 maps by hand.
  await query(`DELETE FROM posts WHERE id = $1`, [postId]);
  return { deleted: true };
}

/**
 * listPosts: powers both "all recent posts" (no clubId) and "posts in
 * one club" (clubId given) with the same query, using cursor-based
 * pagination on the post's own numeric id. Because ids are SERIAL
 * (auto-incrementing), a lower id always means an earlier post, so
 * "give me posts with id < cursor" is a correct and cheap way to page
 * through results without needing a separate created_at comparison.
 */
async function listPosts({ clubId, cursor, limit = 10, viewerId }) {
  const conditions = [];
  const params = [];

  if (clubId) {
    params.push(clubId);
    conditions.push(`p.club_id = $${params.length}`);
  }
  if (cursor) {
    params.push(cursor);
    conditions.push(`p.id < $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit);
  const limitClause = `LIMIT $${params.length}`;

  const result = await query(
    `${POST_SELECT} ${whereClause} ${POST_GROUP_BY} ORDER BY p.id DESC ${limitClause}`,
    params
  );

  const posts = [];
  for (const row of result.rows) {
    const myVote = await getMyVote(row.id, viewerId);
    posts.push(shapePost(row, myVote));
  }

  const nextCursor = posts.length === limit ? posts[posts.length - 1].id : null;
  return { posts, nextCursor };
}

module.exports = { createPost, getPost, deletePost, listPosts };

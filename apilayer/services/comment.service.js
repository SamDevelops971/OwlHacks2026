const { query } = require('../config/db');
const AppError = require('../utils/AppError');

function shapeComment(row) {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    author: { id: row.author_id, username: row.author_username },
  };
}

async function addComment(postId, authorId, body) {
  const postCheck = await query(`SELECT id FROM posts WHERE id = $1`, [postId]);
  if (!postCheck.rows[0]) throw new AppError('Post not found', 404);

  const result = await query(
    `INSERT INTO comments (post_id, author_id, body) VALUES ($1, $2, $3)
     RETURNING id, body, created_at, author_id`,
    [postId, authorId, body]
  );

  // The INSERT ... RETURNING above doesn't give us the username (it's
  // not a column on comments), so a quick follow-up lookup fills it in.
  const userResult = await query(`SELECT username FROM users WHERE id = $1`, [authorId]);
  return shapeComment({ ...result.rows[0], author_username: userResult.rows[0].username });
}

async function getComments(postId) {
  const postCheck = await query(`SELECT id FROM posts WHERE id = $1`, [postId]);
  if (!postCheck.rows[0]) throw new AppError('Post not found', 404);

  const result = await query(
    `SELECT c.id, c.body, c.created_at, c.author_id, u.username AS author_username
     FROM comments c
     JOIN users u ON u.id = c.author_id
     WHERE c.post_id = $1
     ORDER BY c.created_at ASC`,
    [postId]
  );
  return result.rows.map(shapeComment);
}

module.exports = { addComment, getComments };

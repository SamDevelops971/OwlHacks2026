require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const { pool, init } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'hackathon-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }, // 1 week
  })
);

// ---------- Auth helpers ----------
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  next();
}

async function currentUser(req) {
  if (!req.session.userId) return null;
  const { rows } = await pool.query(
    'SELECT id, username, email FROM users WHERE id = $1',
    [req.session.userId]
  );
  return rows[0] || null;
}

// ---------- Auth routes ----------
app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (!email.endsWith('.edu')) {
    return res.status(400).json({ error: 'Please use your university (.edu) email' });
  }
  const hash = bcrypt.hashSync(password, 8);
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hash]
    );
    req.session.userId = rows[0].id;
    res.json(rows[0]);
  } catch (e) {
    res.status(400).json({ error: 'Username or email already taken' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  req.session.userId = user.id;
  res.json({ id: user.id, username: user.username, email: user.email });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/session', async (req, res) => {
  res.json({ user: await currentUser(req) });
});

// ---------- Clubs ----------
app.get('/api/clubs', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM clubs ORDER BY name');
  res.json(rows);
});

app.post('/api/clubs', requireAuth, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Club name required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO clubs (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || '']
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(400).json({ error: 'Club already exists' });
  }
});

app.post('/api/posts', requireAuth, async (req, res) => {
  const { title, body, club_id } = req.body;
  if (!title || !club_id) return res.status(400).json({ error: 'Title and club required' });
  const { rows } = await pool.query(
    'INSERT INTO posts (title, body, club_id, author_id) VALUES ($1, $2, $3, $4) RETURNING id',
    [title, body || '', club_id, req.session.userId]
  );
  res.json(rows[0]);
});

// ---------- Votes ----------
// body: { value: 1 | -1 | 0 }  (0 = remove vote)
app.post('/api/posts/:id/vote', requireAuth, async (req, res) => {
  const { value } = req.body;
  const postId = req.params.id;
  const userId = req.session.userId;

  if (value === 0) {
    await pool.query('DELETE FROM votes WHERE user_id = $1 AND post_id = $2', [userId, postId]);
  } else {
    await pool.query(
      `INSERT INTO votes (user_id, post_id, value) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, post_id) DO UPDATE SET value = EXCLUDED.value`,
      [userId, postId, value]
    );
  }

  const { rows } = await pool.query(
    'SELECT COALESCE(SUM(value), 0)::int AS score FROM votes WHERE post_id = $1',
    [postId]
  );
  res.json({ score: rows[0].score });
});


app.post('/api/posts/:id/comments', requireAuth, async (req, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'Comment body required' });
  const { rows } = await pool.query(
    'INSERT INTO comments (post_id, author_id, body) VALUES ($1, $2, $3) RETURNING id',
    [req.params.id, req.session.userId, body]
  );
  res.json(rows[0]);
});

// ---------- Comment Votes ----------
app.post('/api/comments/:id/vote', requireAuth, async (req, res) => {
  const { value } = req.body;
  const commentId = req.params.id;
  const userId = req.session.userId;

  if (value === 0) {
    await pool.query('DELETE FROM comment_votes WHERE user_id = $1 AND comment_id = $2', [userId, commentId]);
  } else {
    await pool.query(
      `INSERT INTO comment_votes (user_id, comment_id, value) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, comment_id) DO UPDATE SET value = EXCLUDED.value`,
      [userId, commentId, value]
    );
  }

  const { rows } = await pool.query(
    'SELECT COALESCE(SUM(value), 0)::int AS score FROM comment_votes WHERE comment_id = $1',
    [commentId]
  );
  res.json({ score: rows[0].score });
});

app.get('/api/posts/:id/likers', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, v.value, v.created_at
     FROM votes v JOIN users u ON u.id = v.user_id
     WHERE v.post_id = $1 ORDER BY v.created_at DESC`,
    [req.params.id]
  );
  res.json(rows);
});

app.get('/api/comments/:id/likers', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, v.value, v.created_at
     FROM comment_votes v JOIN users u ON u.id = v.user_id
     WHERE v.comment_id = $1 ORDER BY v.created_at DESC`,
    [req.params.id]
  );
  res.json(rows);
});


app.get('/api/posts', async (req, res) => {
  const { club_id, sort } = req.query;
  const order = sort === 'top' ? 'score DESC, p.created_at DESC' : 'p.created_at DESC';
  const userId = req.session.userId || null;

  let sql = `
    SELECT p.id, p.title, p.body, p.created_at, p.club_id,
           c.name AS club_name, u.username AS author,
           COALESCE(SUM(v.value), 0)::int AS score,
           MAX(CASE WHEN v.user_id = $1 THEN v.value END) AS my_vote,
           (SELECT COUNT(*)::int FROM comments cm WHERE cm.post_id = p.id) AS comment_count
    FROM posts p
    JOIN clubs c ON c.id = p.club_id
    JOIN users u ON u.id = p.author_id
    LEFT JOIN votes v ON v.post_id = p.id
  `;
  const params = [userId];
  if (club_id) {
    params.push(club_id);
    sql += ` WHERE p.club_id = $${params.length} `;
  }
  sql += ` GROUP BY p.id, c.name, u.username ORDER BY ${order}`;

  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

app.get('/api/posts/:id', async (req, res) => {
  const userId = req.session.userId || null;
  const { rows } = await pool.query(
    `SELECT p.id, p.title, p.body, p.created_at, p.club_id,
            c.name AS club_name, u.username AS author,
            COALESCE(SUM(v.value), 0)::int AS score,
            MAX(CASE WHEN v.user_id = $2 THEN v.value END) AS my_vote
     FROM posts p
     JOIN clubs c ON c.id = p.club_id
     JOIN users u ON u.id = p.author_id
     LEFT JOIN votes v ON v.post_id = p.id
     WHERE p.id = $1
     GROUP BY p.id, c.name, u.username`,
    [req.params.id, userId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.get('/api/posts/:id/comments', async (req, res) => {
  const userId = req.session.userId || null;
  const { rows } = await pool.query(
    `SELECT cm.id, cm.body, cm.created_at, u.username AS author,
            COALESCE(SUM(cv.value), 0)::int AS score,
            MAX(CASE WHEN cv.user_id = $2 THEN cv.value END) AS my_vote
     FROM comments cm
     JOIN users u ON u.id = cm.author_id
     LEFT JOIN comment_votes cv ON cv.comment_id = cm.id
     WHERE cm.post_id = $1
     GROUP BY cm.id, u.username
     ORDER BY cm.created_at ASC`,
    [req.params.id, userId]
  );
  res.json(rows);
});

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Campus Clubs running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

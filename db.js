require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// DATABASE_URL example (Supabase/Railway/Render/Neon all give you one):
// postgres://user:password@host:5432/dbname
// For local Postgres: postgres://postgres:postgres@localhost:5432/campus_clubs
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false }, // needed for most hosted free-tier Postgres
});

async function init() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM users');
  if (rows[0].c === 0) {
    console.log('Seeding database with demo data...');
    const passHash = bcrypt.hashSync('password123', 8);

    const userIds = [];
    for (const u of ['alice', 'bob', 'carla', 'dev']) {
      const r = await pool.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
        [u, `${u}@university.edu`, passHash]
      );
      userIds.push(r.rows[0].id);
    }

    const clubData = [
      ['Robotics Club', 'Building bots and breaking deadlines.'],
      ['Film Society', 'Weekly screenings and student filmmaking.'],
      ['Hiking Club', 'Trails, peaks, and terrible trail mix.'],
      ['Debate Team', 'Arguing about everything, professionally.'],
    ];
    const clubIds = [];
    for (const [name, description] of clubData) {
      const r = await pool.query(
        'INSERT INTO clubs (name, description) VALUES ($1, $2) RETURNING id',
        [name, description]
      );
      clubIds.push(r.rows[0].id);
    }

    const postData = [
      ['Robotics kickoff meeting Friday!', 'Come by the engineering building, room 204. Free pizza.', clubIds[0], userIds[0]],
      ['We need a new soldering iron', 'Ours finally died. Anyone have a spare?', clubIds[0], userIds[1]],
      ['This week: 90s cult classics', 'Screening starts 7pm in the student union theater.', clubIds[1], userIds[2]],
      ['Sunday sunrise hike — who is in?', 'Meeting at the trailhead parking lot at 6am.', clubIds[2], userIds[3]],
      ['Debate tournament results', 'We placed 2nd overall! Recap inside.', clubIds[3], userIds[0]],
    ];
    const postIds = [];
    for (const [title, body, club_id, author_id] of postData) {
      const r = await pool.query(
        'INSERT INTO posts (title, body, club_id, author_id) VALUES ($1, $2, $3, $4) RETURNING id',
        [title, body, club_id, author_id]
      );
      postIds.push(r.rows[0].id);
    }

    const voteData = [
      [userIds[1], postIds[0], 1],
      [userIds[2], postIds[0], 1],
      [userIds[3], postIds[0], 1],
      [userIds[0], postIds[3], 1],
      [userIds[1], postIds[3], 1],
    ];
    for (const [user_id, post_id, value] of voteData) {
      await pool.query(
        'INSERT INTO votes (user_id, post_id, value) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [user_id, post_id, value]
      );
    }

    const commentData = [
      [postIds[0], userIds[1], "Can't wait, see you all there!"],
      [postIds[3], userIds[2], 'Bringing coffee for everyone.'],
    ];
    for (const [post_id, author_id, body] of commentData) {
      await pool.query(
        'INSERT INTO comments (post_id, author_id, body) VALUES ($1, $2, $3)',
        [post_id, author_id, body]
      );
    }

    console.log('Seed complete. Demo login: alice@university.edu / password123');
  }
}

module.exports = { pool, init };

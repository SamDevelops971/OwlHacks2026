-- schema.sql
-- Run this once against your Postgres database to set up tables.
-- Works with any Postgres provider: Supabase, Railway, Render, Neon, ElephantSQL, or local Postgres.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clubs (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS votes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK (value IN (-1, 1)),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS comment_votes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_id ON comment_votes(comment_id);

ALTER TABLE votes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_posts_club_id ON posts(club_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_votes_post_id ON votes(post_id);

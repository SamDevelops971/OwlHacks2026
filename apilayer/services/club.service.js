const { query } = require('../config/db');
const AppError = require('../utils/AppError');

const UNIQUE_VIOLATION = '23505';

function toPublicClub(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
  };
}

async function createClub({ name, description }) {
  try {
    const result = await query(
      `INSERT INTO clubs (name, description) VALUES ($1, $2) RETURNING *`,
      [name, description || null]
    );
    return toPublicClub(result.rows[0]);
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      throw new AppError('A club with that name already exists', 409);
    }
    throw err;
  }
}

async function listClubs() {
  const result = await query(`SELECT * FROM clubs ORDER BY name ASC`);
  return result.rows.map(toPublicClub);
}

async function getClubById(clubId) {
  const result = await query(`SELECT * FROM clubs WHERE id = $1`, [clubId]);
  if (!result.rows[0]) throw new AppError('Club not found', 404);
  return toPublicClub(result.rows[0]);
}

module.exports = { createClub, listClubs, getClubById };

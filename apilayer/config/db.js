const {Pool} = require ('pg');
const { connectionString } = require('pg/lib/defaults');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL == 'true' ? {rejectUnauthorized: false} : false,

});

function query(text, params)
{
    return pool.query(text, params);
}

module.exports = {query, pool};
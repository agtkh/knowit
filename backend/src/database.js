// backend/src/database.js
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.KNOWIT_DB_USER,
  host: process.env.KNOWIT_DB_HOST,
  database: process.env.KNOWIT_DB_NAME,
  password: process.env.KNOWIT_DB_PASSWORD,
  port: process.env.KNOWIT_DB_PORT,
});

module.exports = pool;
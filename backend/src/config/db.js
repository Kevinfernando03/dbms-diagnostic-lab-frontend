/**
 * Database connection pool using mysql2/promise.
 * Configuration loaded strictly from environment variables.
 * Placeholders are used; no hardcoded credentials.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'meridian_diagnostics_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // dateStrings: true prevents MySQL driver from converting dates to local JS Date objects
  dateStrings: true,
});

/**
 * Health-check helper that tests database connectivity without leaking credentials.
 */
async function checkDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return { connected: true };
  } catch (error) {
    return {
      connected: false,
      message: error.message || 'Database connection error',
    };
  }
}

module.exports = {
  pool,
  checkDatabaseConnection,
};


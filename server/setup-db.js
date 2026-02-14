require('dotenv').config();
const { connect, execute } = require('./db');

async function setup() {
  try {
    await connect();
    await execute(`
      CREATE TABLE IF NOT EXISTS focus_sessions (
        session_id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(255),
        start_timestamp TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
        end_timestamp TIMESTAMP_NTZ,
        minutes_completed INTEGER DEFAULT 0,
        ended_early BOOLEAN DEFAULT FALSE,
        penalty_amount FLOAT DEFAULT 0,
        reward_minutes_earned INTEGER DEFAULT 0
      )
    `);
    console.log('focus_sessions table created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Setup failed:', err.message);
    process.exit(1);
  }
}

setup();

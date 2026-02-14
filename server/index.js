require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connect, execute } = require('./db');
const { optionalAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// POST /session/start
app.post('/session/start', optionalAuth, async (req, res) => {
  try {
    const userId = req.auth?.sub || 'anonymous';
    const { session_id } = req.body;

    await execute(
      'INSERT INTO focus_sessions (session_id, user_id) VALUES (?, ?)',
      [session_id, userId]
    );

    res.json({ success: true, session_id });
  } catch (err) {
    console.error('Error starting session:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /session/end
app.post('/session/end', optionalAuth, async (req, res) => {
  try {
    const { session_id, minutes_completed, ended_early } = req.body;
    const rewardMinutesEarned = ended_early ? 0 : 10;

    await execute(
      `UPDATE focus_sessions
       SET end_timestamp = CURRENT_TIMESTAMP(),
           minutes_completed = ?,
           ended_early = ?,
           reward_minutes_earned = ?
       WHERE session_id = ?`,
      [minutes_completed || 0, ended_early || false, rewardMinutesEarned, session_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error ending session:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /stats/today
app.get('/stats/today', optionalAuth, async (req, res) => {
  try {
    const userId = req.auth?.sub || 'anonymous';

    const rows = await execute(
      `SELECT COUNT(*) as session_count,
              COALESCE(SUM(minutes_completed), 0) as total_minutes
       FROM focus_sessions
       WHERE user_id = ?
         AND start_timestamp >= CURRENT_DATE()`,
      [userId]
    );

    const stats = rows[0] || { SESSION_COUNT: 0, TOTAL_MINUTES: 0 };
    res.json({
      session_count: stats.SESSION_COUNT || 0,
      total_minutes: stats.TOTAL_MINUTES || 0,
    });
  } catch (err) {
    console.error('Error fetching stats:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Connect to Snowflake and start server
connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.warn('Snowflake connection failed, starting without DB:', err.message);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (no Snowflake)`);
    });
  });

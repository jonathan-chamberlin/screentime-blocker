require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { readDb, writeDb } = require('./db');
const { optionalAuth, requireAuth } = require('./middleware/auth');

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

    const db = readDb();
    db.sessions.push({
      session_id,
      user_id: userId,
      start_timestamp: new Date().toISOString(),
      end_timestamp: null,
      minutes_completed: 0,
      ended_early: false,
      penalty_amount: 0,
      reward_minutes_earned: 0,
      blocked_attempts: 0
    });
    writeDb(db);

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

    const db = readDb();
    const session = db.sessions.find(s => s.session_id === session_id);
    if (session) {
      session.end_timestamp = new Date().toISOString();
      session.minutes_completed = minutes_completed || 0;
      session.ended_early = ended_early || false;
      session.reward_minutes_earned = rewardMinutesEarned;
      writeDb(db);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error ending session:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /session/blocked-attempt
app.post('/session/blocked-attempt', optionalAuth, async (req, res) => {
  try {
    const userId = req.auth?.sub || 'anonymous';
    const { session_id } = req.body;

    const db = readDb();
    let session;
    if (session_id) {
      session = db.sessions.find(s => s.session_id === session_id);
    } else {
      session = db.sessions.find(s => s.user_id === userId && s.end_timestamp === null);
    }

    if (session) {
      session.blocked_attempts = (session.blocked_attempts || 0) + 1;
      writeDb(db);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error recording blocked attempt:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /stats/today
app.get('/stats/today', optionalAuth, async (req, res) => {
  try {
    const userId = req.auth?.sub || 'anonymous';
    const db = readDb();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySessions = db.sessions.filter(s => {
      if (s.user_id !== userId) return false;
      const sessionDate = new Date(s.start_timestamp);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });

    const session_count = todaySessions.length;
    const total_minutes = todaySessions.reduce((sum, s) => sum + (s.minutes_completed || 0), 0);

    res.json({
      session_count,
      total_minutes,
    });
  } catch (err) {
    console.error('Error fetching stats:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /leaderboard
app.get('/leaderboard', async (req, res) => {
  try {
    const db = readDb();
    const userStats = {};

    db.sessions.forEach(session => {
      const userId = session.user_id;
      if (!userStats[userId]) {
        userStats[userId] = {
          totalMinutes: 0,
          totalSlackAttempts: 0
        };
      }
      userStats[userId].totalMinutes += session.minutes_completed || 0;
      userStats[userId].totalSlackAttempts += session.blocked_attempts || 0;
    });

    const leaderboard = Object.keys(userStats).map(userId => {
      const user = db.users[userId] || {};
      return {
        userId,
        displayName: user.displayName || userId,
        pictureUrl: user.pictureUrl || null,
        totalMinutes: userStats[userId].totalMinutes,
        totalSlackAttempts: userStats[userId].totalSlackAttempts
      };
    });

    leaderboard.sort((a, b) => b.totalMinutes - a.totalMinutes);

    res.json(leaderboard);
  } catch (err) {
    console.error('Error fetching leaderboard:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/profile
app.post('/auth/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { displayName, pictureUrl } = req.body;

    const db = readDb();
    if (!db.users[userId]) {
      db.users[userId] = {};
    }
    db.users[userId].displayName = displayName;
    db.users[userId].pictureUrl = pictureUrl;
    writeDb(db);

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving profile:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

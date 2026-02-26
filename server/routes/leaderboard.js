const express = require('express');
const { readDb, writeDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /leaderboard
router.get('/leaderboard', async (req, res) => {
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
router.post('/auth/profile', requireAuth, async (req, res) => {
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

module.exports = router;

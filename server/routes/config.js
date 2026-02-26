const express = require('express');
const { readDb, writeDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /config
// Returns per-user configuration used by extension + companion app.
router.get('/config', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.sub;
    const db = readDb();
    const userConfigs = db.userConfigs || {};
    res.json({ settings: userConfigs[userId] || {} });
  } catch (err) {
    console.error('Error loading config:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /config
// Stores per-user configuration used by extension + companion app.
router.put('/config', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.sub;
    const settings = req.body?.settings;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings object is required' });
    }

    const db = readDb();
    if (!db.userConfigs || typeof db.userConfigs !== 'object') {
      db.userConfigs = {};
    }

    db.userConfigs[userId] = {
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    writeDb(db);

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving config:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

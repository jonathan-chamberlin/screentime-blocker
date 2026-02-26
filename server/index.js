require('dotenv').config();
const express = require('express');
const cors = require('cors');

const sessionsRouter = require('./routes/sessions');
const leaderboardRouter = require('./routes/leaderboard');
const configRouter = require('./routes/config');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(sessionsRouter);
app.use(leaderboardRouter);
app.use(configRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

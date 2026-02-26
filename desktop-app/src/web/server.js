/**
 * Local web server — serves the dashboard UI and API routes on localhost.
 * Also provides a WebSocket endpoint for real-time timer updates.
 *
 * Replaces: chrome extension popup, settings, and blocked pages.
 */

import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { WEB_PORT, WEBSOCKET_TICK_MS } from '../shared/constants.js';
import { createApiRouter } from './routes/api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @typedef {Object} WebServerOptions
 * @property {number} [port] - Port to listen on (default: WEB_PORT)
 * @property {import('../session/session-engine.js').SessionEngineAPI} sessionEngine
 */

/**
 * Broadcast a typed message to all connected WebSocket clients.
 *
 * @param {WebSocketServer} wss
 * @param {string} type - Message type (e.g. 'tick', 'settings-updated')
 * @param {Object} data - Message payload
 */
function broadcastMessage(wss, type, data) {
  const message = JSON.stringify({ type, data });
  for (const client of wss.clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  }
}

/**
 * Start the local web server with REST API and WebSocket.
 *
 * @param {WebServerOptions} options
 * @returns {Promise<{ server: import('http').Server, wss: WebSocketServer, stop: () => Promise<void> }>}
 */
export async function startWebServer(options) {
  const { port = WEB_PORT, sessionEngine, onSettingsChanged, getBlockingState } = options;

  const app = express();
  app.use(express.json());

  // Create HTTP server (needed before wss for broadcast reference)
  const server = createServer(app);

  // WebSocket server on same port
  const wss = new WebSocketServer({ server });

  // API routes — pass broadcast function for settings-updated notifications
  const apiRouter = createApiRouter({
    sessionEngine,
    broadcast: (type, data) => broadcastMessage(wss, type, data),
    onSettingsChanged,
    getBlockingState,
  });
  app.use('/api', apiRouter);

  // Static files (dashboard, blocked page, settings)
  app.use(express.static(join(__dirname, 'static')));

  // Broadcast session state to all connected clients every WEBSOCKET_TICK_MS
  const tickInterval = setInterval(() => {
    const state = sessionEngine.getStatus();
    broadcastMessage(wss, 'tick', state);
  }, WEBSOCKET_TICK_MS);

  // Also broadcast on state changes (immediate, not waiting for tick)
  sessionEngine.on('stateChanged', (state) => {
    broadcastMessage(wss, 'stateChanged', state);
  });

  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log(`[web] Server listening on http://localhost:${port}`);

      const stop = () => new Promise((res) => {
        clearInterval(tickInterval);
        wss.close();
        server.close(() => res());
      });

      resolve({ server, wss, stop });
    });

    server.on('error', reject);
  });
}

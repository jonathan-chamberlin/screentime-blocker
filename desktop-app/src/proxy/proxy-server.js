/**
 * HTTPS MITM Proxy Server — intercepts browser traffic, applies blocking
 * rules, and redirects blocked URLs to localhost pages.
 *
 * Uses http-mitm-proxy for TLS interception with our custom CA cert.
 * The proxy evaluates each request through the rule engine and either
 * passes it through or responds with a 302 redirect.
 */

import { Proxy } from 'http-mitm-proxy';
import { join } from 'node:path';
import { PROXY_PORT, WEB_PORT } from '../shared/constants.js';
import { evaluateUrl, extractDomain } from './rule-engine.js';
import { getStorageDir } from '../storage.js';
import { CA_DIR_NAME } from '../shared/constants.js';

/**
 * @typedef {Object} ProxyServerOptions
 * @property {number} [port] - Port to listen on (default: PROXY_PORT)
 * @property {() => import('./rule-engine.js').BlockingState} getBlockingState
 *   - Function that returns current blocking state for rule evaluation
 * @property {(siteVisit: import('../shared/constants.js').SiteVisit) => void} [onSiteVisit]
 *   - Called when proxy sees a request (for productive site tracking)
 */

/**
 * Create and start the HTTPS MITM proxy.
 *
 * @param {ProxyServerOptions} options
 * @returns {Promise<{ proxy: Proxy, stop: () => Promise<void> }>}
 *
 * Subscribers of onSiteVisit: session-engine (via main.js wiring)
 */
export async function startProxy(options) {
  const { port = PROXY_PORT, getBlockingState, onSiteVisit } = options;
  const proxy = new Proxy();
  const caDir = join(getStorageDir(), CA_DIR_NAME);

  proxy.onError((_ctx, err) => {
    // Suppress common proxy errors (client disconnects, etc.)
    if (err.code === 'ECONNRESET' || err.code === 'EPIPE') return;
    console.error('[proxy] error:', err.message);
  });

  proxy.onRequest((ctx, callback) => {
    const req = ctx.clientToProxyRequest;
    const host = req.headers.host || '';
    const path = req.url || '/';
    const fullUrl = `https://${host}${path}`;
    const domain = extractDomain(fullUrl);

    // Skip localhost requests to avoid redirect loops
    if (domain === 'localhost' || domain === '127.0.0.1') {
      return callback();
    }

    // Notify session engine about the site visit
    if (onSiteVisit) {
      onSiteVisit({
        url: fullUrl,
        domain,
        path,
        timestamp: Date.now(),
      });
    }

    const state = getBlockingState();
    const result = evaluateUrl(fullUrl, state);

    if (result.action !== 'allow') {
      console.log('[proxy] %s %s → %s (redirect: %s)', result.action.toUpperCase(), domain, result.action, result.redirectUrl);
    }

    if (result.action === 'block' || result.action === 'nuclear-block') {
      // Respond with 302 redirect to our localhost blocked page
      ctx.proxyToClientResponse.writeHead(302, {
        Location: result.redirectUrl,
      });
      ctx.proxyToClientResponse.end();
      return;
    }

    // Allow — pass through to the actual server
    return callback();
  });

  return new Promise((resolve, reject) => {
    try {
      proxy.listen({
        port,
        sslCaDir: caDir,
        // Suppress default console output
        silent: true,
      }, () => {
        console.log(`[proxy] MITM proxy listening on localhost:${port}`);

        const stop = () => new Promise((res) => {
          proxy.close();
          res();
        });

        resolve({ proxy, stop });
      });
    } catch (err) {
      reject(err);
    }
  });
}

// Productivity Check — "Are you really working?" popup
// Injected into all pages during active sessions.
// Uses per-site timer that resets when navigating to a different domain.

(function() {
  const THRESHOLD_MS = PRODUCTIVITY_CHECK_MINUTES * 60 * 1000;
  let startTime = Date.now();
  let prompted = false;

  function checkTime() {
    if (prompted) return;

    // Ask background if session is active
    chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
      if (chrome.runtime.lastError || !response) return;
      if (!response.sessionActive) return;

      // Don't show on blocked.html or extension pages
      if (window.location.protocol === 'chrome-extension:') return;

      // Check if we've been on this site long enough
      const elapsed = Date.now() - startTime;
      if (elapsed >= THRESHOLD_MS) {
        prompted = true;
        showProductivityCheck();
      }
    });
  }

  function showProductivityCheck() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'brainrot-productivity-check';
    overlay.innerHTML = `
      <div class="brainrot-modal-backdrop">
        <div class="brainrot-modal">
          <h2>Are you really working right now?</h2>
          <p>You've been on <strong>${window.location.hostname}</strong> for over ${PRODUCTIVITY_CHECK_MINUTES} minute${PRODUCTIVITY_CHECK_MINUTES !== 1 ? 's' : ''}.</p>
          <div class="brainrot-modal-buttons">
            <button id="brainrot-yes-working" class="brainrot-btn brainrot-btn-yes">Yes, I'm working</button>
            <button id="brainrot-not-working" class="brainrot-btn brainrot-btn-no">No, block this site</button>
          </div>
          <p class="brainrot-modal-hint">"No" will add <strong>${window.location.hostname}</strong> to your blocked sites list</p>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .brainrot-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483647;
        font-family: 'Space Grotesk', sans-serif;
      }
      .brainrot-modal {
        background: #1a1a2e;
        border: 2px solid #00ff88;
        border-radius: 16px;
        padding: 32px;
        max-width: 420px;
        text-align: center;
        color: #ffffff;
        box-shadow: 0 0 40px rgba(0, 255, 136, 0.3);
      }
      .brainrot-modal h2 {
        color: #00ff88;
        font-size: 22px;
        margin: 0 0 12px 0;
      }
      .brainrot-modal p {
        color: rgba(255, 255, 255, 0.8);
        font-size: 15px;
        margin: 0 0 24px 0;
      }
      .brainrot-modal-buttons {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
      .brainrot-btn {
        padding: 10px 24px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.1s;
      }
      .brainrot-btn:hover {
        transform: scale(1.05);
      }
      .brainrot-btn:active {
        transform: scale(0.95);
      }
      .brainrot-btn-yes {
        background: #333;
        color: #fff;
      }
      .brainrot-btn-no {
        background: #ff4757;
        color: #fff;
      }
      .brainrot-modal-hint {
        color: rgba(255, 255, 255, 0.4);
        font-size: 12px;
        margin: 12px 0 0 0;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);

    // "Yes, I'm working" — dismiss and reset timer
    overlay.querySelector('#brainrot-yes-working').addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.remove();
      style.remove();
      prompted = false;
      startTime = Date.now(); // Reset timer
    });

    // "No, block this site" — add to blocked list
    overlay.querySelector('#brainrot-not-working').addEventListener('click', (e) => {
      e.stopPropagation();
      const domain = window.location.hostname.replace(/^www\./, '');
      chrome.runtime.sendMessage({
        action: 'addToBlockedSites',
        site: domain
      }, (response) => {
        if (chrome.runtime.lastError) {
          // Extension context invalidated — just remove the overlay
          overlay.remove();
          style.remove();
          return;
        }
        // The tab will be redirected by the background script
        overlay.remove();
        style.remove();
      });
    });
  }

  // Check every 30 seconds
  setInterval(checkTime, 30000);
  // Also check after threshold exactly
  setTimeout(checkTime, THRESHOLD_MS);
})();

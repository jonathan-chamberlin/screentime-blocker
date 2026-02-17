#!/usr/bin/env node

/**
 * Implement auto-save for settings page
 * - Remove all save buttons
 * - Add auto-save on input change
 * - Show subtle "Saved!" indicator
 */

const fs = require('fs');
const path = require('path');

const SETTINGS_HTML = path.resolve(__dirname, '../../extension/settings.html');
const SETTINGS_JS = path.resolve(__dirname, '../../extension/settings.js');

console.log('Implementing auto-save for settings page...\n');

// Step 1: Remove save buttons from HTML
console.log('Step 1: Removing save buttons from settings.html...');
let html = fs.readFileSync(SETTINGS_HTML, 'utf8');

// Remove saveBlockedApps button
html = html.replace(/<button id="saveBlockedApps">Save<\/button>\s*/g, '');

// Remove save-all-btn and its container if it exists
html = html.replace(/<button id="save-all-btn"[^>]*>.*?<\/button>\s*/gs, '');

// Add saved indicator after the header
if (!html.includes('id="saved-indicator"')) {
  html = html.replace(
    /<h1>Brainrot Blocker Settings<\/h1>/,
    `<h1>Brainrot Blocker Settings<\/h1>
            <div id="saved-indicator" class="saved-indicator" style="display: none;">✓ Saved!</div>`
  );

  // Add CSS for saved indicator
  html = html.replace(
    /<\/style>/,
    `
        .saved-indicator {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #00ff88;
            color: #1a1a2e;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            z-index: 1000;
            animation: fadeInOut 2s ease-in-out;
        }

        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-10px); }
            20% { opacity: 1; transform: translateY(0); }
            80% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-10px); }
        }
    </style>`
  );
}

fs.writeFileSync(SETTINGS_HTML, html, 'utf8');
console.log('✓ Save buttons removed, saved indicator added\n');

// Step 2: Add auto-save functionality to settings.js
console.log('Step 2: Adding auto-save functionality to settings.js...');
let js = fs.readFileSync(SETTINGS_JS, 'utf8');

// Add auto-save helper functions at the top (after existing helper functions)
const autoSaveFunctions = `
// Auto-save functionality
let saveTimeout = null;
function showSavedIndicator() {
  const indicator = document.getElementById('saved-indicator');
  if (indicator) {
    indicator.style.display = 'block';
    setTimeout(() => {
      indicator.style.display = 'none';
    }, 2000);
  }
}

async function autoSave(key, value) {
  // Clear any pending save
  if (saveTimeout) clearTimeout(saveTimeout);

  // Debounce: save 500ms after last change
  saveTimeout = setTimeout(async () => {
    try {
      await setStorage({ [key]: value });
      showSavedIndicator();
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, 500);
}

async function autoSaveMultiple(data) {
  if (saveTimeout) clearTimeout(saveTimeout);

  saveTimeout = setTimeout(async () => {
    try {
      await setStorage(data);
      showSavedIndicator();
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, 500);
}
`;

// Add auto-save functions before the DOMContentLoaded if they don't exist
if (!js.includes('function showSavedIndicator')) {
  js = js.replace(
    /document\.addEventListener\('DOMContentLoaded'/,
    `${autoSaveFunctions}\n\ndocument.addEventListener('DOMContentLoaded'`
  );
}

// Replace manual save button listeners with auto-save
// Remove saveBlockedApps button listener
js = js.replace(
  /document\.getElementById\('saveBlockedApps'\)\.addEventListener\('click', saveBlockedApps\);?\s*/g,
  ''
);

// Remove save-all-btn listener if it exists
js = js.replace(
  /document\.getElementById\('save-all-btn'\)\.addEventListener\('click'[^}]+}\);?\s*/gs,
  ''
);

// Add auto-save listeners for all inputs in the DOMContentLoaded section
const autoSaveListeners = `
  // Auto-save for text/number inputs
  const autoSaveInputs = ['penaltyTarget', 'penaltyAmount', 'paymentMethod'];
  autoSaveInputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', (e) => {
        autoSave(id, e.target.value);
      });
    }
  });

  // Auto-save for textareas
  const autoSaveTextareas = ['rewardSites', 'allowedPaths', 'productiveSites', 'customApps'];
  autoSaveTextareas.forEach(id => {
    const textarea = document.getElementById(id);
    if (textarea) {
      textarea.addEventListener('input', (e) => {
        const sites = e.target.value.split('\\n').filter(s => s.trim());
        autoSave(id, sites);
      });
    }
  });

  // Auto-save for radio buttons
  document.querySelectorAll('input[name="productiveMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      autoSave('productiveMode', e.target.value);
    });
  });

  document.querySelectorAll('input[name="strictMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      autoSave('strictMode', e.target.value);
    });
  });

  document.querySelectorAll('input[name="penaltyType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      autoSave('penaltyType', e.target.value);
    });
  });

  // Auto-save for productive app checkboxes
  document.querySelectorAll('#appsList input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', async () => {
      const apps = [];
      CURATED_APPS.forEach(app => {
        const cb = document.getElementById('app-' + app.process);
        if (cb && cb.checked) {
          apps.push({ name: app.name, process: app.process });
        }
      });
      await autoSave('productiveApps', apps);
    });
  });
`;

// Add auto-save listeners before the closing of DOMContentLoaded
js = js.replace(
  /(loadSettings\(\);)\s*(}\);)/,
  `$1\n\n${autoSaveListeners}\n$2`
);

fs.writeFileSync(SETTINGS_JS, js, 'utf8');
console.log('✓ Auto-save functionality added\n');

console.log('Implementation complete!');
console.log('Now testing with Playwright...\n');

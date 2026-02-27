---
phase: unified-settings-save
plan: 1
type: execute
total_waves: 2
total_tasks: 3
requirements_covered: []
files_modified: [extension/settings.html, extension/settings.js, extension/settings.css]
---

# Plan: Unified Settings Save — Plan 1

## Objective
Replace individual save buttons with a single floating banner at the bottom of the settings page that appears when any setting is modified, improving UX and reducing visual clutter.

## Context
- **Project**: Brainrot Blocker Chrome extension settings page
- **Phase goals**: Single save button, floating banner, unsaved changes indicator
- **Prerequisites**: Phase 7 complete with modular settings.js
- **Key decisions**:
  - Match existing UI style (dark theme, green accent)
  - Show "You have unsaved changes" warning
  - Just "Save" button, no "Discard"
  - Banner floats/sticks to bottom of viewport

## Wave 1 — Add Banner and Change Detection

<task type="auto">
  <name>Add floating save banner HTML and CSS</name>
  <files>extension/settings.html, extension/settings.css</files>
  <action>
**HTML** (add before closing `</body>`):
```html
<div id="save-banner" class="save-banner hidden">
  <div class="save-banner-content">
    <span class="save-banner-message">You have unsaved changes</span>
    <button id="save-all-btn" class="save-all-btn">Save Changes</button>
  </div>
</div>
```

**CSS** (extension/settings.css):
```css
.save-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #1a1a2e;
  border-top: 2px solid #00ff88;
  padding: 16px 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  box-shadow: 0 -4px 20px rgba(0, 255, 136, 0.2);
  transition: transform 0.3s ease;
}

.save-banner.hidden {
  transform: translateY(100%);
}

.save-banner-content {
  display: flex;
  align-items: center;
  gap: 24px;
  max-width: 1200px;
  width: 100%;
}

.save-banner-message {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  flex: 1;
}

.save-all-btn {
  background: #00ff88;
  color: #1a1a2e;
  border: none;
  padding: 10px 32px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: transform 0.1s, background 0.2s;
}

.save-all-btn:hover {
  background: #00cc6f;
  transform: scale(1.05);
}

.save-all-btn:active {
  transform: scale(0.95);
}
```

This matches the existing dark theme with green accent.
  </action>
  <verify>Open settings.html in Chrome, manually remove .hidden class from banner, verify it appears at bottom with correct styling</verify>
  <done>Save banner HTML and CSS added, styled correctly with floating layout</done>
</task>

<task type="auto">
  <name>Add change detection logic to settings.js</name>
  <files>extension/settings.js</files>
  <action>
Add change tracking state:
```javascript
let hasUnsavedChanges = false;
const pendingChanges = {};
```

Add change detection event listeners to all inputs:
- Text inputs (work minutes, reward minutes, custom sites, custom apps, etc.)
- Checkboxes (productive sites, productive apps, blocked apps, strict mode, etc.)
- Radio buttons (productive mode)

When any input changes:
```javascript
function markAsChanged(settingKey, value) {
  hasUnsavedChanges = true;
  pendingChanges[settingKey] = value;
  showSaveBanner();
}

function showSaveBanner() {
  const banner = document.getElementById('save-banner');
  banner.classList.remove('hidden');
}

function hideSaveBanner() {
  const banner = document.getElementById('save-banner');
  banner.classList.add('hidden');
  hasUnsavedChanges = false;
  pendingChanges = {};
}
```

Add event listeners:
```javascript
// Example for work minutes
document.getElementById('work-minutes').addEventListener('input', (e) => {
  markAsChanged('workMinutes', parseInt(e.target.value));
});

// Similar for all other settings inputs
```

Add unified save handler:
```javascript
document.getElementById('save-all-btn').addEventListener('click', async () => {
  try {
    await setStorage(pendingChanges);
    showSuccessMessage('All settings saved!');
    hideSaveBanner();
  } catch (error) {
    showErrorMessage('Failed to save settings: ' + error.message);
  }
});

function showSuccessMessage(msg) {
  const bannerMessage = document.querySelector('.save-banner-message');
  bannerMessage.textContent = msg;
  bannerMessage.style.color = '#00ff88';
  setTimeout(() => {
    hideSaveBanner();
  }, 2000);
}
```
  </action>
  <verify>Open settings.html, modify any setting, verify banner appears; click Save, verify banner disappears</verify>
  <done>Settings.js tracks all input changes and shows/hides save banner appropriately</done>
</task>

## Wave 2 — Remove Individual Save Buttons

<task type="auto">
  <name>Remove individual save buttons from settings page</name>
  <files>extension/settings.html, extension/settings.js</files>
  <action>
**HTML**:
- Remove all `<button class="save-btn">` elements from all sections
- Keep section structure intact, only remove save buttons

Sections to update:
- Work/reward ratio section
- Productive sites section
- Productive apps section
- Blocked apps section (if exists from Phase 9)
- Strict mode section
- Penalty settings section

**JS**:
- Remove all individual save button event listeners (search for `.addEventListener('click'` on save buttons)
- Remove individual save functions like `saveWorkRewardRatio()`, `saveProductiveSites()`, etc.
- All saving now happens through unified `save-all-btn` handler which saves `pendingChanges` object

Keep existing validation logic — if work minutes < 1 or reward minutes < 1, show error before saving.
  </action>
  <verify>Open settings.html, verify no individual save buttons remain; modify settings, click Save Changes banner, verify all settings persist</verify>
  <done>All individual save buttons removed, only unified save banner remains and works correctly</done>
</task>

## Success Criteria
- All individual save buttons removed from settings page
- Single floating save banner appears at bottom when any setting changes
- Banner sticks to bottom of viewport and scrolls with page
- Banner shows "You have unsaved changes" message
- Clicking "Save Changes" persists all modified settings at once
- Banner disappears after successful save with confirmation
- Banner matches existing UI theme (dark background, green accent)
- All existing settings functionality preserved (validation, locking during sessions, etc.)

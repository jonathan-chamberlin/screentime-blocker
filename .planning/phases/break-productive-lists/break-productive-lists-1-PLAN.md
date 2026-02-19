---
phase: break-productive-lists
plan: 1
type: execute
total_waves: 4
total_tasks: 8
requirements_covered: [REQ-035, REQ-036, REQ-037, REQ-038, REQ-039]
files_modified: [extension/constants.js, extension/list-utils.js, extension/background.js, extension/manifest.json, extension/tab-monitor.js, extension/session-state.js, extension/settings.html, extension/settings.js, extension/popup.html, extension/popup.js]
---

# Plan: Break & Productive Lists — Plan 1

## Objective
Replace flat `rewardSites`/`productiveSites` arrays with named, reusable **break lists** and **productive lists**. Each list contains both sites and apps. Multiple lists can be active simultaneously. The session blocking and productive detection logic reads from the union of active lists.

## Context
- Project: Brainrot Blocker Chrome Extension (MV3, no build system, importScripts module loading)
- Phase goals: Named lists, default break list, list CRUD UI, list selection UI, popup display, session integration
- Prerequisites: Phase 7 complete (modular architecture with 8 focused modules)
- Key decisions: Lists hold sites+apps; multiple active simultaneously; category header toggles all; no migration; default break list ships pre-populated; "All sites" is mutually exclusive with productive list selections

## Storage Schema

```js
// NEW storage keys
breakLists: [
  {
    id: 'break-default',
    name: 'Default',
    sites: ['instagram.com', 'facebook.com', 'youtube.com', ...adultDomains, ...gamblingDomains, ...newsDomains],
    apps: [{ name: 'Steam', process: 'steam', detectProcesses: ['steam', 'steamwebhelper'], killProcesses: ['steam', 'steamwebhelper'] }],
    isActive: true
  }
],
productiveLists: [],
productiveMode: 'all-except-blocked'  // 'all-except-blocked' or 'lists'
// When productiveMode is 'lists', the union of isActive productive lists' sites/apps determines what's productive.

// KEPT as-is (global, not per-list):
allowedPaths: [],
skipProductivityCheck: []

// DEPRECATED (no longer read by runtime logic, kept for reference):
// rewardSites, productiveSites, blockedApps, productiveApps
```

## Wave 1 — Data Model & Utilities

<task type="auto">
  <name>Add list data model to constants.js</name>
  <files>extension/constants.js</files>
  <action>
    In `extension/constants.js`, add the following:

    1. Add a `DEFAULT_BREAK_LIST` constant — an object representing the pre-populated default break list:
    ```js
    const DEFAULT_BREAK_LIST = {
      id: 'break-default',
      name: 'Default',
      sites: [
        'instagram.com',
        'facebook.com',
        'youtube.com',
        'store.steampowered.com', 'steamcommunity.com',
        // All domains from the "Adult Sites" entry in PRESET_BLOCKED_SITES (the one with domains array of ~35 entries)
        // All domains from the "Gambling" entries in PRESET_BLOCKED_SITES
        // All domains from the "News" entries in PRESET_BLOCKED_SITES (cnn.com, bbc.com, foxnews.com, nytimes.com, washingtonpost.com, reuters.com, apnews.com, news.google.com, news.yahoo.com, msn.com, theguardian.com, nbcnews.com, abcnews.go.com, cbsnews.com, usatoday.com, huffpost.com, nypost.com, dailymail.co.uk, buzzfeed.com, vice.com)
      ],
      apps: [
        { name: 'Steam', process: 'steam', detectProcesses: ['steam', 'steamwebhelper'], killProcesses: ['steam', 'steamwebhelper'] }
      ],
      isActive: true
    };
    ```
    IMPORTANT: Pull the actual domain arrays from the existing `PRESET_BLOCKED_SITES` constant for Adult Sites and Gambling entries. For News, pull the domains from the News category entries in `PRESET_BLOCKED_SITES`. Do NOT make up domains.

    2. Update the `DEFAULTS` object to add:
    ```js
    breakLists: [DEFAULT_BREAK_LIST],
    productiveLists: [],
    ```
    Keep the existing `productiveMode: 'all-except-blocked'` default.

    3. Keep `rewardSites`, `productiveSites`, `blockedApps`, `productiveApps` in DEFAULTS for now (backward compat during transition) but they will no longer be the source of truth at runtime.

    4. Add a `PRESET_BREAK_SITES` constant that mirrors `PRESET_BLOCKED_SITES` exactly (same categories, same entries). This will be used in the list editor UI for break lists. Just alias it:
    ```js
    const PRESET_BREAK_SITES = PRESET_BLOCKED_SITES;
    ```

    5. Add a `PRESET_BREAK_APPS` constant for apps available in break list editors:
    ```js
    const PRESET_BREAK_APPS = [
      { name: 'Steam', process: 'steam', detectProcesses: ['steam', 'steamwebhelper'], killProcesses: ['steam', 'steamwebhelper'], category: 'Gaming', checked: false },
      { name: 'Epic Games Launcher', process: 'EpicGamesLauncher', category: 'Gaming', checked: false },
      { name: 'Discord', process: 'Discord', category: 'Communication', checked: false },
      { name: 'Minecraft', process: 'javaw', category: 'Gaming', checked: false },
      { name: 'League of Legends', process: 'LeagueClientUx.exe', detectProcesses: ['LeagueClientUx.exe', 'LeagueClient.exe', 'League of Legends.exe', 'RiotClientServices.exe'], killProcesses: ['LeagueClientUx.exe', 'LeagueClient.exe', 'League of Legends.exe', 'RiotClientServices.exe'], category: 'Gaming', checked: false },
      { name: 'Valorant', process: 'VALORANT-Win64-Shipping.exe', detectProcesses: ['VALORANT-Win64-Shipping.exe', 'RiotClientServices.exe'], killProcesses: ['VALORANT-Win64-Shipping.exe', 'RiotClientServices.exe'], category: 'Gaming', checked: false },
      { name: 'Fortnite', process: 'FortniteClient-Win64-Shipping.exe', category: 'Gaming', checked: false },
      { name: 'Apex Legends', process: 'r5apex.exe', category: 'Gaming', checked: false },
      { name: 'World of Warcraft', process: 'Wow.exe', category: 'Gaming', checked: false },
      { name: 'Overwatch 2', process: 'Overwatch.exe', category: 'Gaming', checked: false },
    ];
    ```
  </action>
  <verify>Open extension/constants.js and verify DEFAULT_BREAK_LIST exists with correct domains, DEFAULTS includes breakLists/productiveLists, PRESET_BREAK_SITES and PRESET_BREAK_APPS exist.</verify>
  <done>constants.js has new list-related constants and updated DEFAULTS</done>
</task>

<task type="auto">
  <name>Create list-utils.js utility module</name>
  <files>extension/list-utils.js</files>
  <action>
    Create a new file `extension/list-utils.js` with utility functions for working with break and productive lists. This file will be loaded via importScripts() in the service worker and via script tag in settings/popup pages.

    Functions to implement:

    ```js
    /**
     * Get the union of all active break lists' sites as a flat string array.
     * @param {Array} breakLists - Array of list objects from storage
     * @returns {string[]} - Deduplicated domain strings
     */
    function getActiveBreakSites(breakLists) {
      if (!breakLists || !breakLists.length) return [];
      const sites = new Set();
      for (const list of breakLists) {
        if (list.isActive && list.sites) {
          for (const site of list.sites) sites.add(site);
        }
      }
      return Array.from(sites);
    }

    /**
     * Get the union of all active break lists' apps as a flat array.
     * Each app is { name, process, detectProcesses?, killProcesses? }.
     * Deduplicate by process name.
     * @param {Array} breakLists
     * @returns {Array} - App objects
     */
    function getActiveBreakApps(breakLists) {
      if (!breakLists || !breakLists.length) return [];
      const seen = new Set();
      const apps = [];
      for (const list of breakLists) {
        if (list.isActive && list.apps) {
          for (const app of list.apps) {
            if (!seen.has(app.process)) {
              seen.add(app.process);
              apps.push(app);
            }
          }
        }
      }
      return apps;
    }

    /**
     * Get the union of all active productive lists' sites.
     * @param {Array} productiveLists
     * @returns {string[]}
     */
    function getActiveProductiveSites(productiveLists) {
      if (!productiveLists || !productiveLists.length) return [];
      const sites = new Set();
      for (const list of productiveLists) {
        if (list.isActive && list.sites) {
          for (const site of list.sites) sites.add(site);
        }
      }
      return Array.from(sites);
    }

    /**
     * Get the union of all active productive lists' apps (process name strings).
     * @param {Array} productiveLists
     * @returns {string[]}
     */
    function getActiveProductiveApps(productiveLists) {
      if (!productiveLists || !productiveLists.length) return [];
      const apps = new Set();
      for (const list of productiveLists) {
        if (list.isActive && list.apps) {
          for (const app of list.apps) apps.add(app);
        }
      }
      return Array.from(apps);
    }

    /**
     * Generate a unique list ID.
     * @param {string} prefix - 'break' or 'prod'
     * @returns {string}
     */
    function generateListId(prefix) {
      return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    }

    /**
     * Create a new empty list object.
     * @param {string} type - 'break' or 'productive'
     * @param {string} name
     * @returns {Object}
     */
    function createNewList(type, name) {
      return {
        id: generateListId(type === 'break' ? 'break' : 'prod'),
        name: name,
        sites: [],
        apps: [],
        isActive: false
      };
    }
    ```

    All functions must be plain functions (not in a class or module export) because the extension uses importScripts() which puts everything in global scope.
  </action>
  <verify>Open extension/list-utils.js and verify all 6 functions exist and are syntactically correct.</verify>
  <done>list-utils.js exists with getActiveBreakSites, getActiveBreakApps, getActiveProductiveSites, getActiveProductiveApps, generateListId, createNewList</done>
</task>

## Wave 2 — Service Worker Wiring & Backend Integration

<task type="auto">
  <name>Wire list-utils.js into service worker and manifest</name>
  <files>extension/background.js, extension/manifest.json</files>
  <action>
    1. In `extension/background.js`, add `'list-utils.js'` to the `importScripts()` call. The current importScripts line loads multiple files — add list-utils.js after constants.js and before other modules. Example:
    ```js
    importScripts('constants.js', 'list-utils.js', 'storage.js', ...);
    ```

    2. In `extension/manifest.json`, add `"list-utils.js"` to the `web_accessible_resources` files array if one exists. Also ensure it's in any content_scripts or other relevant arrays if needed.

    Look at the current manifest.json structure. The settings.html and popup.html load scripts via `<script>` tags, so list-utils.js just needs to be available in the extension directory (which it already is by being created there).
  </action>
  <verify>Check that background.js importScripts includes list-utils.js. Check manifest.json is valid JSON.</verify>
  <done>Service worker loads list-utils.js on startup</done>
</task>

<task type="auto">
  <name>Update tab-monitor.js and session-state.js to use lists</name>
  <files>extension/tab-monitor.js, extension/session-state.js</files>
  <action>
    These two files currently read `rewardSites`, `productiveSites`, `productiveApps`, and `blockedApps` directly from storage. They need to read `breakLists` and `productiveLists` instead, and compute effective sites/apps using the list-utils functions.

    **tab-monitor.js — `checkCurrentTab()` function:**

    Currently (around line 5-36) it reads:
    ```js
    const data = await getStorage(['productiveSites', 'productiveMode', 'rewardSites', 'allowedPaths']);
    ```

    Change to:
    ```js
    const data = await getStorage(['breakLists', 'productiveLists', 'productiveMode', 'allowedPaths']);
    const blockedSites = getActiveBreakSites(data.breakLists || DEFAULTS.breakLists);
    const productiveSites = getActiveProductiveSites(data.productiveLists || DEFAULTS.productiveLists);
    ```

    Then use `blockedSites` where `data.rewardSites` was used, and `productiveSites` where `data.productiveSites` was used. The rest of the logic (productiveMode check, allowedPaths) stays the same.

    **tab-monitor.js — window focus handling (around lines 86-103):**

    Where it reads `productiveApps` or `blockedApps` from storage, change to read `breakLists` and `productiveLists`:
    - `isProductiveApp(name)` should check against `getActiveProductiveApps(productiveLists)`
    - `isBlockedApp(name)` should check against `getActiveBreakApps(breakLists)` — match on process name or any detectProcesses entry

    Find the `isProductiveApp` and `isBlockedApp` functions (they may be in tab-monitor.js or app-monitor.js) and update them to accept the computed lists. If they read from storage internally, change them to read `breakLists`/`productiveLists` and use the list-utils functions.

    **session-state.js — `loadSiteConfig()` function:**

    Currently reads `rewardSites` from storage and returns `{ sites, allowedPaths }` for use by blocking.js.

    Change to read `breakLists` from storage:
    ```js
    async function loadSiteConfig() {
      const data = await getStorage(['breakLists', 'allowedPaths']);
      const breakLists = data.breakLists || DEFAULTS.breakLists;
      return {
        sites: getActiveBreakSites(breakLists),
        allowedPaths: data.allowedPaths || DEFAULTS.allowedPaths
      };
    }
    ```

    IMPORTANT: Also check if session-state.js or any other module reads `blockedApps` from storage for app-blocking during sessions. If so, update those reads to use `getActiveBreakApps(breakLists)` instead.

    Note: `getActiveBreakSites`, `getActiveBreakApps`, etc. are globally available because list-utils.js is loaded via importScripts() before these modules.
  </action>
  <verify>Read tab-monitor.js and session-state.js to confirm they read breakLists/productiveLists instead of rewardSites/productiveSites. Ensure no references to the old storage keys remain in these files.</verify>
  <done>Runtime logic reads from list-based storage format; blocking and productive detection use union of active lists</done>
</task>

## Wave 3 — Settings UI

<task type="auto">
  <name>Restructure settings.html for lists</name>
  <files>extension/settings.html</files>
  <action>
    Major restructuring of settings.html. Add list-utils.js script tag. Replace flat site/app sections with list-based sections.

    **1. Add script tag** — Before the settings.js script tag at the bottom, add:
    ```html
    <script src="list-utils.js"></script>
    ```

    **2. Add "Active Lists" section** — Insert a new section AFTER Strict Mode and BEFORE the "What is Distracting?" group label:
    ```html
    <div class="section expanded" data-lockable>
        <h2>Active Lists</h2>
        <div class="section-body">
            <div class="form-group">
                <label>Break lists to enforce</label>
                <p class="setting-description" style="font-size: 12px; color: #888; margin: 4px 0 8px;">Sites and apps in active break lists are blocked during work sessions and accessible during breaks.</p>
                <div id="activeBreakLists" style="display: flex; flex-direction: column; gap: 6px;"></div>
                <p id="noBreakLists" style="color: #888; font-size: 13px; display: none;">No break lists created yet. Create one below.</p>
            </div>
            <div class="form-group" style="margin-top: 16px;">
                <label>What counts as productive?</label>
                <p class="setting-description" style="font-size: 12px; color: #888; margin: 4px 0 8px;">Your work timer only runs when you're on a productive site or app.</p>
                <div id="activeProductiveMode" style="display: flex; flex-direction: column; gap: 6px;">
                    <label class="app-checkbox-item" style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: rgba(255,255,255,0.05); border-radius: 6px; cursor: pointer;">
                        <input type="checkbox" id="productiveModeAll" checked>
                        <span>All sites (except blocked)</span>
                    </label>
                </div>
                <div id="activeProductiveLists" style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px;"></div>
                <p id="noProductiveLists" style="color: #888; font-size: 13px; display: none;">No productive lists created yet. Create one below.</p>
            </div>
        </div>
    </div>
    ```

    **3. Replace "Break Only Sites" section** with "Break Lists" section:
    ```html
    <div class="section" data-lockable>
        <h2>Break Lists</h2>
        <div class="section-body">
            <p class="setting-description" style="font-size: 13px; color: #aaa; margin-bottom: 12px;">Create named lists of sites and apps to block during work sessions. Activate them in the "Active Lists" section above.</p>
            <div id="breakListsContainer"></div>
            <button id="btn-create-break-list" class="btn" style="margin-top: 12px; background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">+ Create New Break List</button>
            <div id="breakListEditor" style="display: none; margin-top: 16px; padding: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">
                <div class="form-group">
                    <label for="breakListName">List Name</label>
                    <input type="text" id="breakListName" placeholder="e.g., Social Media, Gaming" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: white;">
                </div>
                <div class="form-group" style="margin-top: 12px;">
                    <label>Sites to block</label>
                    <div id="breakListSites" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px;"></div>
                </div>
                <div class="form-group" style="margin-top: 12px;">
                    <label for="breakListCustomSites">Custom sites (one per line)</label>
                    <textarea id="breakListCustomSites" style="min-height: 60px;" placeholder="mysite.com&#10;othersite.com"></textarea>
                </div>
                <div class="form-group" style="margin-top: 12px;">
                    <label>Apps to block</label>
                    <div id="breakListApps" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;"></div>
                </div>
                <div class="form-group" style="margin-top: 12px;">
                    <label for="breakListCustomApps">Custom apps — process name (one per line)</label>
                    <textarea id="breakListCustomApps" style="min-height: 60px;" placeholder="steam&#10;discord"></textarea>
                </div>
                <div style="margin-top: 16px; display: flex; gap: 8px;">
                    <button id="btn-save-break-list" class="btn" style="background: #27ae60; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer;">Save List</button>
                    <button id="btn-cancel-break-list" class="btn" style="background: #555; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer;">Cancel</button>
                </div>
            </div>
        </div>
    </div>
    ```

    **4. Keep "Allowed exceptions" as a standalone subsection.** Move the allowed paths form-group out of the old "Break Only Sites" section and place it right after the Break Lists section, inside its own small collapsible section:
    ```html
    <div class="section">
        <h2>Allowed Exceptions</h2>
        <div class="section-body">
            <p class="setting-description" style="font-size: 13px; color: #aaa; margin-bottom: 8px;">Specific pages that bypass all break list blocking (e.g., educational YouTube channels).</p>
            <div class="form-group">
                <label for="allowedPaths">Allowed paths (one per line)</label>
                <textarea id="allowedPaths" placeholder="youtube.com/@Veritasium&#10;reddit.com/r/learnprogramming"></textarea>
            </div>
        </div>
    </div>
    ```

    **5. Keep Nuclear Block section exactly as-is** (no changes).

    **6. Remove the old "Blocked Applications" section** (`id="section-blocked-apps"`). Apps are now part of break lists.

    **7. Replace "Productive Sites" section** with "Productive Lists" section:
    ```html
    <div class="section" data-lockable>
        <h2>Productive Lists</h2>
        <div class="section-body">
            <p class="setting-description" style="font-size: 13px; color: #aaa; margin-bottom: 12px;">Create named lists of sites and apps that count as productive. Activate them in the "Active Lists" section above.</p>
            <div id="productiveListsContainer"></div>
            <button id="btn-create-productive-list" class="btn" style="margin-top: 12px; background: #27ae60; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">+ Create New Productive List</button>
            <div id="productiveListEditor" style="display: none; margin-top: 16px; padding: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">
                <div class="form-group">
                    <label for="productiveListName">List Name</label>
                    <input type="text" id="productiveListName" placeholder="e.g., Coding, Writing" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: white;">
                </div>
                <div class="form-group" style="margin-top: 12px;">
                    <label>Productive sites</label>
                    <div id="productiveListSites" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px;"></div>
                </div>
                <div class="form-group" style="margin-top: 12px;">
                    <label for="productiveListCustomSites">Custom sites (one per line)</label>
                    <textarea id="productiveListCustomSites" style="min-height: 60px;" placeholder="myworksite.com"></textarea>
                </div>
                <div class="form-group" style="margin-top: 12px;">
                    <label>Productive apps</label>
                    <div id="productiveListApps" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;"></div>
                </div>
                <div class="form-group" style="margin-top: 12px;">
                    <label for="productiveListCustomApps">Custom apps — process name (one per line)</label>
                    <textarea id="productiveListCustomApps" style="min-height: 60px;" placeholder="Code&#10;WindowsTerminal"></textarea>
                </div>
                <div style="margin-top: 16px; display: flex; gap: 8px;">
                    <button id="btn-save-productive-list" class="btn" style="background: #27ae60; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer;">Save List</button>
                    <button id="btn-cancel-productive-list" class="btn" style="background: #555; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer;">Cancel</button>
                </div>
            </div>
        </div>
    </div>
    ```

    **8. Keep "Skip Productivity Check Popup" section exactly as-is.**

    **9. Remove the old "Productive Applications" section** (`id="section-productive-apps"`). Apps are now part of productive lists.

    **10. Keep Companion App section, but update its description** — it now controls whether the extension tracks desktop apps. The visibility toggle for blocked/productive apps sections is no longer needed (those sections are gone). Keep the companionMode radio but remove the toggleAppSections behavior.

    **11. Keep Penalty, Danger Zone sections exactly as-is.**
  </action>
  <verify>Open settings.html and verify: Active Lists section exists after Strict Mode; Break Lists section exists with editor; Productive Lists section exists with editor; Allowed Exceptions is standalone; old Break Only Sites / Blocked Apps / Productive Sites / Productive Apps sections are removed; Nuclear Block is unchanged.</verify>
  <done>settings.html has new list-based layout with selection, creation, and editing sections</done>
</task>

<task type="auto">
  <name>Rewrite settings.js for list management</name>
  <files>extension/settings.js</files>
  <action>
    Major rewrite of settings.js to support list CRUD, category toggle-all, and list selection. This is the largest task. Read the FULL current settings.js first to understand all existing patterns.

    **Key changes:**

    **1. Remove old functions:**
    - Remove `loadBlockedSites()`, `saveBlockedSites()`, `loadProductiveSites()`, `saveProductiveSites()`
    - Remove `loadBlockedApps()`, `saveBlockedApps()`, `loadProductiveApps()`, `saveProductiveApps()`
    - Remove `toggleProductiveSitesList()`, `toggleAppSections()`
    - Remove `PRESET_BLOCKED_APPS` constant (it's now `PRESET_BREAK_APPS` in constants.js)

    **2. Add list state variables:**
    ```js
    let editingBreakListId = null;   // null = creating new, string = editing existing
    let editingProductiveListId = null;
    ```

    **3. Add `loadActiveListsUI()` function:**
    Reads `breakLists` and `productiveLists` from storage. Renders checkboxes in `#activeBreakLists` for each break list, and in `#activeProductiveLists` for each productive list. Also sets `#productiveModeAll` checkbox based on `productiveMode`.

    For each break list:
    ```html
    <label class="app-checkbox-item" style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: rgba(255,255,255,0.05); border-radius: 6px; cursor: pointer;">
        <input type="checkbox" data-list-id="{id}" data-list-type="break" {checked if isActive}>
        <span>{name}</span>
    </label>
    ```

    For each productive list (in `#activeProductiveLists`):
    ```html
    <label class="app-checkbox-item" style="...same...">
        <input type="checkbox" data-list-id="{id}" data-list-type="productive" {checked if isActive}>
        <span>{name}</span>
    </label>
    ```

    Show/hide `#noBreakLists` and `#noProductiveLists` based on whether lists exist.

    **Mutual exclusivity logic for productive mode:**
    - When `#productiveModeAll` is checked → set `productiveMode` to `'all-except-blocked'` in storage, uncheck all productive list checkboxes, set all productive lists' `isActive` to false in storage.
    - When any productive list checkbox is checked → uncheck `#productiveModeAll`, set `productiveMode` to `'lists'` in storage.
    - When all productive list checkboxes are unchecked → auto-check `#productiveModeAll`, set `productiveMode` to `'all-except-blocked'`.

    **4. Add `renderBreakListsContainer()` function:**
    Reads `breakLists` from storage. For each list, renders a card in `#breakListsContainer`:
    ```html
    <div class="list-card" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(255,255,255,0.05); border-radius: 6px; margin-bottom: 6px;">
        <span style="font-weight: 500;">{name}</span>
        <span style="color: #888; font-size: 12px;">{sites.length} sites, {apps.length} apps</span>
        <div style="display: flex; gap: 6px;">
            <button class="btn-edit-list" data-list-id="{id}" data-list-type="break" style="background: #3498db; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Edit</button>
            <button class="btn-delete-list" data-list-id="{id}" data-list-type="break" style="background: #e74c3c; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Delete</button>
        </div>
    </div>
    ```
    Don't show Delete button for the default list (id === 'break-default'). Still show Edit.

    **5. Add `renderProductiveListsContainer()` function:**
    Same pattern as break lists but reads from `productiveLists`.

    **6. Add `openBreakListEditor(listId)` function:**
    - If `listId` is null → creating new list (clear all checkboxes, empty name field)
    - If `listId` is a string → editing existing list (pre-populate checkboxes and name)
    - Shows `#breakListEditor`, hides `#btn-create-break-list`
    - Renders site presets from `PRESET_BREAK_SITES` (same as old `PRESET_BLOCKED_SITES`) into `#breakListSites`
    - Renders app presets from `PRESET_BREAK_APPS` into `#breakListApps`
    - **Category header with toggle-all:** For each category, render a header with a checkbox:
      ```html
      <div class="app-category-header" style="grid-column: 1 / -1; ...">
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" class="category-toggle" data-category="{category}">
              <strong>{category}</strong>
          </label>
      </div>
      ```
      When the category checkbox changes:
      - If checked → check all item checkboxes in that category
      - If unchecked → uncheck all item checkboxes in that category
      When any individual item checkbox changes → update the category header checkbox (checked if all items checked, unchecked if any unchecked)
    - Pre-check sites/apps that are in the existing list being edited
    - Custom sites/apps textareas pre-populated with non-preset entries from the list

    **7. Add `openProductiveListEditor(listId)` function:**
    Same pattern but uses `PRESET_PRODUCTIVE_SITES` for sites and `CURATED_APPS` for apps. The CURATED_APPS are rendered as checkboxes grouped by category (same category-header toggle-all pattern).

    **8. Add `saveBreakList()` function:**
    - Reads name from `#breakListName`
    - Collects checked site presets → domain strings
    - Collects custom sites from `#breakListCustomSites` textarea
    - Collects checked app presets → app objects (with name, process, detectProcesses, killProcesses)
    - Collects custom apps from `#breakListCustomApps` → creates simple `{ name: processName, process: processName }` objects
    - If `editingBreakListId` is null → creates new list via `createNewList('break', name)`, adds sites/apps, pushes to `breakLists` array in storage
    - If editing existing → finds list by id, updates name/sites/apps
    - Saves to storage
    - Hides editor, re-renders container and active lists UI
    - Shows saved indicator

    **9. Add `saveProductiveList()` function:**
    Same pattern but for productive lists. Apps are stored as process name strings (not objects), matching the current `productiveApps` format.

    **10. Add `deleteList(listId, listType)` function:**
    - Confirms with user
    - Removes from `breakLists` or `productiveLists` array in storage
    - Re-renders container and active lists UI

    **11. Update `loadSettings()` function:**
    - Call `loadActiveListsUI()`, `renderBreakListsContainer()`, `renderProductiveListsContainer()` instead of the old load functions
    - Still load `allowedPaths`, `skipProductivityCheck`, `strictMode`, `companionMode`, `penaltyEnabled`, etc.
    - Remove calls to old `loadBlockedSites()`, `loadProductiveSites()`, `loadBlockedApps()`, `loadProductiveApps()`

    **12. Wire event listeners in DOMContentLoaded:**
    - `#btn-create-break-list` click → `openBreakListEditor(null)`
    - `#btn-save-break-list` click → `saveBreakList()`
    - `#btn-cancel-break-list` click → hide editor, show create button
    - `#btn-create-productive-list` click → `openProductiveListEditor(null)`
    - `#btn-save-productive-list` click → `saveProductiveList()`
    - `#btn-cancel-productive-list` click → hide editor, show create button
    - Delegate click on `.btn-edit-list` → `openBreakListEditor(id)` or `openProductiveListEditor(id)`
    - Delegate click on `.btn-delete-list` → `deleteList(id, type)`
    - `#activeBreakLists` change → toggle list's `isActive`, save to storage
    - `#activeProductiveLists` change → toggle list's `isActive`, save to storage, handle mutual exclusivity with "All sites"
    - `#productiveModeAll` change → handle mutual exclusivity
    - Remove old event listeners for `#blockedSitesList`, `#customBlockedSites`, `productiveMode` radios, `#productiveSitesList`, `#customProductiveSites`, `#curatedAppsList`, `#customApps`, `#blockedAppsList`
    - Keep: `#allowedPaths`, `#skipProductivityCheck`, strictMode radios, companionMode radios, penalty radios, nuclear block listeners

    **13. Update `lockSiteSections(locked)` function:**
    Keep the existing data-lockable locking logic. It should still work since the new sections have `data-lockable`.

    **14. Update companionMode handler:**
    Remove the call to `toggleAppSections()`. The companion mode toggle no longer needs to show/hide app sections since apps are embedded in lists. Keep the companionMode storage save and message send.

    **15. Send `updateRewardSites` message when break list active state changes:**
    When a break list's `isActive` changes or a break list is saved/deleted, send `chrome.runtime.sendMessage({ action: 'updateRewardSites' })` so the background script knows to refresh blocking rules if a session is active.

    IMPORTANT: The file currently uses `autoSave(key, value)` with a debounced save pattern and a green "Saved!" toast. Reuse this pattern for list saves. The existing `showSavedIndicator()` function should be called after list operations.
  </action>
  <verify>Load the extension settings page in Chrome. Verify: Active Lists section renders with break list checkboxes and productive mode options. Break Lists section shows default list with edit button. Create new break list button opens editor with category toggles. Save/cancel works. Productive Lists section works similarly. Old flat sections are gone.</verify>
  <done>settings.js fully manages list CRUD, category toggles, list selection with mutual exclusivity, and integrates with storage</done>
</task>

## Wave 4 — Popup Display

<task type="auto">
  <name>Show active list names in popup</name>
  <files>extension/popup.html, extension/popup.js</files>
  <action>
    **1. Add list-utils.js script tag to popup.html:**
    Before the popup.js script tag, add:
    ```html
    <script src="list-utils.js"></script>
    ```

    **2. Add list display area to popup.html:**
    Add a new div after the `.ratio-row` div and before `#timer-section`:
    ```html
    <div id="active-lists-display" style="padding: 4px 16px 8px; font-size: 12px; color: #aaa;">
        <div id="break-lists-label" style="margin-bottom: 2px;"></div>
        <div id="productive-lists-label"></div>
    </div>
    ```

    **3. Add `renderActiveLists()` function to popup.js:**
    ```js
    async function renderActiveLists() {
      const data = await new Promise(r => chrome.storage.local.get(['breakLists', 'productiveLists', 'productiveMode'], r));
      const breakLists = data.breakLists || [];
      const productiveLists = data.productiveLists || [];
      const productiveMode = data.productiveMode || 'all-except-blocked';

      const activeBreak = breakLists.filter(l => l.isActive);
      const breakLabel = document.getElementById('break-lists-label');
      if (activeBreak.length > 0) {
        breakLabel.textContent = '🚫 Blocking: ' + activeBreak.map(l => l.name).join(', ');
        breakLabel.style.display = '';
      } else {
        breakLabel.textContent = '🚫 No break lists active';
        breakLabel.style.display = '';
      }

      const prodLabel = document.getElementById('productive-lists-label');
      if (productiveMode === 'all-except-blocked') {
        prodLabel.style.display = 'none';
      } else {
        const activeProductive = productiveLists.filter(l => l.isActive);
        if (activeProductive.length > 0) {
          prodLabel.textContent = '✅ Productive: ' + activeProductive.map(l => l.name).join(', ');
          prodLabel.style.display = '';
        } else {
          prodLabel.textContent = '✅ No productive lists active';
          prodLabel.style.display = '';
        }
      }
    }
    ```

    **4. Call `renderActiveLists()` on popup load** — add it to the DOMContentLoaded handler, after the existing init logic.

    **5. Also call it during polling** — inside the polling interval that calls `getStatus`, call `renderActiveLists()` as well so it updates if user changes settings while popup is open. Actually, this doesn't need to be every second — just on load is fine since settings changes require reopening popup.
  </action>
  <verify>Open the extension popup. Verify it shows "Blocking: Default" (or whatever active break list names are). Verify productive list names only show when productiveMode is not 'all-except-blocked'.</verify>
  <done>Popup displays active break list names and conditionally shows productive list names</done>
</task>

<task type="checkpoint:human-verify">
  <name>End-to-end verification</name>
  <files>none</files>
  <action>
    Walk through the full user flow:
    1. Open settings → "Active Lists" section shows Default break list checked
    2. Click into "Break Lists" → see Default list card with Edit button
    3. Click "Create New Break List" → editor expands with category checkboxes
    4. Check a category header → all items in category toggle
    5. Name it "Gaming", check some game sites/apps → Save
    6. "Gaming" appears in Active Lists section
    7. Check "Gaming" in Active Lists → both Default and Gaming are active
    8. Open popup → shows "Blocking: Default, Gaming"
    9. Create a productive list "Coding" with some sites
    10. In Active Lists, uncheck "All sites" → check "Coding"
    11. Popup shows "Productive: Coding"
    12. Start a work session → sites from both active break lists are blocked
    13. Timer runs only on sites in the Coding productive list
    14. End session → sites unblocked
    15. Nuclear block still works independently
  </action>
  <verify>User performs manual verification</verify>
  <done>All list features work end-to-end: CRUD, selection, blocking integration, popup display</done>
</task>

## Success Criteria
- Break lists and productive lists stored in chrome.storage with CRUD operations
- Default break list ships with Instagram, Facebook, YouTube, Steam, Adult, Gambling, News sites
- Category header checkboxes toggle all items in category
- Multiple lists can be active simultaneously
- Active Lists section at top of settings with mutual-exclusive productive mode
- Popup shows active break list names; shows productive list names only when not "All sites" mode
- Session blocking uses union of active break lists
- Productive detection uses union of active productive lists (or all-except-blocked)
- Nuclear block unchanged
- Allowed paths and skip productivity check remain global

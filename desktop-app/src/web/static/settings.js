    /* ===== Dropdown Definitions ===== */
    const IDLE_OPTIONS = [
      { value: 5, label: '5s (test)' }, { value: 10, label: '10 sec' }, { value: 30, label: '30 sec' },
      { value: 60, label: '1 min' }, { value: 120, label: '2 min' }, { value: 180, label: '3 min' },
      { value: 300, label: '5 min' },
    ];
    const MODE_OPTIONS = [
      { value: 'off', label: 'Off' }, { value: 'manual', label: 'Manual' },
      { value: 'scheduled', label: 'Scheduled' }, { value: 'always-on', label: 'Always On' },
    ];

    // Ported from: extension/constants.js — PRESET_BLOCKED_SITES
    const PRESET_BREAK_SITES = [
      { name: 'Facebook', domain: 'facebook.com', category: 'Social Media' },
      { name: 'Instagram', domain: 'instagram.com', category: 'Social Media' },
      { name: 'Twitter / X', domains: ['twitter.com', 'x.com'], category: 'Social Media' },
      { name: 'TikTok', domain: 'tiktok.com', category: 'Social Media' },
      { name: 'Snapchat', domain: 'snapchat.com', category: 'Social Media' },
      { name: 'Reddit', domain: 'reddit.com', category: 'Social Media' },
      { name: 'Discord', domain: 'discord.com', category: 'Social Media' },
      { name: 'LinkedIn', domain: 'linkedin.com', category: 'Social Media' },
      { name: 'Pinterest', domain: 'pinterest.com', category: 'Social Media' },
      { name: 'Tumblr', domain: 'tumblr.com', category: 'Social Media' },
      { name: 'Telegram', domain: 'telegram.org', category: 'Social Media' },
      { name: 'WhatsApp', domain: 'whatsapp.com', category: 'Social Media' },
      { name: 'Messenger', domain: 'messenger.com', category: 'Social Media' },
      { name: 'YouTube', domain: 'youtube.com', category: 'Video & Streaming' },
      { name: 'Twitch', domain: 'twitch.tv', category: 'Video & Streaming' },
      { name: 'Netflix', domain: 'netflix.com', category: 'Video & Streaming' },
      { name: 'Hulu', domain: 'hulu.com', category: 'Video & Streaming' },
      { name: 'Disney+', domain: 'disneyplus.com', category: 'Video & Streaming' },
      { name: 'Prime Video', domain: 'primevideo.com', category: 'Video & Streaming' },
      { name: 'HBO Max', domain: 'hbomax.com', category: 'Video & Streaming' },
      { name: 'Peacock', domain: 'peacocktv.com', category: 'Video & Streaming' },
      { name: 'Paramount+', domain: 'paramountplus.com', category: 'Video & Streaming' },
      { name: 'Crunchyroll', domain: 'crunchyroll.com', category: 'Video & Streaming' },
      { name: 'Vimeo', domain: 'vimeo.com', category: 'Video & Streaming' },
      { name: 'Dailymotion', domain: 'dailymotion.com', category: 'Video & Streaming' },
      { name: 'CNN', domain: 'cnn.com', category: 'News' },
      { name: 'BBC', domain: 'bbc.com', category: 'News' },
      { name: 'NY Times', domain: 'nytimes.com', category: 'News' },
      { name: 'The Guardian', domain: 'theguardian.com', category: 'News' },
      { name: 'Washington Post', domain: 'washingtonpost.com', category: 'News' },
      { name: 'Fox News', domain: 'foxnews.com', category: 'News' },
      { name: 'Reuters', domain: 'reuters.com', category: 'News' },
      { name: 'AP News', domain: 'apnews.com', category: 'News' },
      { name: 'NBC News', domain: 'nbcnews.com', category: 'News' },
      { name: 'Bloomberg', domain: 'bloomberg.com', category: 'News' },
      { name: 'WSJ', domain: 'wsj.com', category: 'News' },
      { name: 'USA Today', domain: 'usatoday.com', category: 'News' },
      { name: 'Amazon', domain: 'amazon.com', category: 'Shopping' },
      { name: 'eBay', domain: 'ebay.com', category: 'Shopping' },
      { name: 'Walmart', domain: 'walmart.com', category: 'Shopping' },
      { name: 'Target', domain: 'target.com', category: 'Shopping' },
      { name: 'Costco', domain: 'costco.com', category: 'Shopping' },
      { name: 'Etsy', domain: 'etsy.com', category: 'Shopping' },
      { name: 'Wish', domain: 'wish.com', category: 'Shopping' },
      { name: 'Temu', domain: 'temu.com', category: 'Shopping' },
      { name: 'AliExpress', domain: 'aliexpress.com', category: 'Shopping' },
      { name: 'Best Buy', domain: 'bestbuy.com', category: 'Shopping' },
      { name: 'Newegg', domain: 'newegg.com', category: 'Shopping' },
      { name: 'Wayfair', domain: 'wayfair.com', category: 'Shopping' },
      { name: 'Overstock', domain: 'overstock.com', category: 'Shopping' },
      { name: 'Home Depot', domain: 'homedepot.com', category: 'Shopping' },
      { name: 'SHEIN', domain: 'shein.com', category: 'Shopping' },
      { name: 'ASOS', domain: 'asos.com', category: 'Shopping' },
      { name: 'Zara', domain: 'zara.com', category: 'Shopping' },
      { name: 'H&M', domain: 'hm.com', category: 'Shopping' },
      { name: 'Nike', domain: 'nike.com', category: 'Shopping' },
      { name: 'Adidas', domain: 'adidas.com', category: 'Shopping' },
      { name: 'Nordstrom', domain: 'nordstrom.com', category: 'Shopping' },
      { name: "Macy's", domain: 'macys.com', category: 'Shopping' },
      { name: 'Zappos', domain: 'zappos.com', category: 'Shopping' },
      { name: 'Steam', domain: 'steampowered.com', category: 'Gaming' },
      { name: 'Epic Games', domain: 'epicgames.com', category: 'Gaming' },
      { name: 'Roblox', domain: 'roblox.com', category: 'Gaming' },
      { name: 'Minecraft', domain: 'minecraft.net', category: 'Gaming' },
      { name: 'League of Legends', domain: 'leagueoflegends.com', category: 'Gaming' },
      { name: 'Valorant', domain: 'playvalorant.com', category: 'Gaming' },
      { name: 'Fortnite', domain: 'fortnite.com', category: 'Gaming' },
      { name: 'Apex Legends', domain: 'apexlegends.com', category: 'Gaming' },
      { name: 'World of Warcraft', domain: 'worldofwarcraft.com', category: 'Gaming' },
      { name: 'Overwatch 2', domain: 'playoverwatch.com', category: 'Gaming' },
      { name: 'IGN', domain: 'ign.com', category: 'Gaming' },
      { name: 'GameSpot', domain: 'gamespot.com', category: 'Gaming' },
      { name: 'Polygon', domain: 'polygon.com', category: 'Gaming' },
      { name: 'Kotaku', domain: 'kotaku.com', category: 'Gaming' },
      { name: 'PC Gamer', domain: 'pcgamer.com', category: 'Gaming' },
      { name: 'DraftKings', domain: 'draftkings.com', category: 'Gambling' },
      { name: 'FanDuel', domain: 'fanduel.com', category: 'Gambling' },
      { name: 'BetMGM', domain: 'betmgm.com', category: 'Gambling' },
      { name: 'Caesars', domain: 'caesarssportsbook.com', category: 'Gambling' },
      { name: 'bet365', domain: 'bet365.com', category: 'Gambling' },
      { name: 'Betway', domain: 'betway.com', category: 'Gambling' },
      { name: 'William Hill', domain: 'williamhill.com', category: 'Gambling' },
      { name: 'BetRivers', domain: 'betrivers.com', category: 'Gambling' },
      { name: 'PointsBet', domain: 'pointsbet.com', category: 'Gambling' },
      { name: 'Bovada', domain: 'bovada.lv', category: 'Gambling' },
      { name: 'PokerStars', domain: 'pokerstars.com', category: 'Gambling' },
      { name: 'GGPoker', domain: 'ggpoker.com', category: 'Gambling' },
      { name: 'OnlyFans', domain: 'onlyfans.com', category: 'Adult Sites' },
      { name: 'Adult Websites', domains: [
        'pornhub.com','xvideos.com','xnxx.com','redtube.com','youporn.com',
        'xhamster.com','tube8.com','spankbang.com','beeg.com','eporner.com',
        'vporn.com','txxx.com','tnaflix.com','fuq.com','hclips.com',
        'drtuber.com','nuvid.com','pornone.com','empflix.com','brazzers.com',
        'realitykings.com','bangbros.com','naughtyamerica.com','anyporn.com',
        'hotmovs.com','cliphunter.com','ixxx.com','pornmd.com','alphaporno.com',
        'porntrex.com','sxyprn.com','porntube.com','fapster.xxx','gotporn.com',
        'faphouse.com',
      ], category: 'Adult Sites' },
    ];

    // Ported from: extension/constants.js — PRESET_BREAK_APPS
    const PRESET_BREAK_APPS = [
      { name: 'Steam', process: 'steam', category: 'Gaming' },
      { name: 'Epic Games Launcher', process: 'EpicGamesLauncher', category: 'Gaming' },
      { name: 'Discord', process: 'Discord', category: 'Communication' },
      { name: 'Minecraft', process: 'javaw', category: 'Gaming' },
      { name: 'League of Legends', process: 'LeagueClientUx.exe', category: 'Gaming' },
      { name: 'Valorant', process: 'VALORANT-Win64-Shipping.exe', category: 'Gaming' },
      { name: 'Fortnite', process: 'FortniteClient-Win64-Shipping.exe', category: 'Gaming' },
      { name: 'Apex Legends', process: 'r5apex.exe', category: 'Gaming' },
      { name: 'World of Warcraft', process: 'Wow.exe', category: 'Gaming' },
      { name: 'Overwatch 2', process: 'Overwatch.exe', category: 'Gaming' },
    ];

    // Ported from: extension/constants.js — PRESET_PRODUCTIVE_SITES
    const PRESET_PRODUCTIVE_SITES = [
      { name: 'Google Docs', domain: 'docs.google.com', category: 'Productivity' },
      { name: 'Google Drive', domain: 'drive.google.com', category: 'Productivity' },
      { name: 'Google Sheets', domain: 'sheets.google.com', category: 'Productivity' },
      { name: 'Notion', domain: 'notion.so', category: 'Productivity' },
      { name: 'Trello', domain: 'trello.com', category: 'Productivity' },
      { name: 'Asana', domain: 'asana.com', category: 'Productivity' },
      { name: 'ClickUp', domain: 'app.clickup.com', category: 'Productivity' },
      { name: 'Linear', domain: 'linear.app', category: 'Productivity' },
      { name: 'GitHub', domain: 'github.com', category: 'Development' },
      { name: 'Stack Overflow', domain: 'stackoverflow.com', category: 'Development' },
      { name: 'MDN Web Docs', domain: 'developer.mozilla.org', category: 'Development' },
      { name: 'GitLab', domain: 'gitlab.com', category: 'Development' },
      { name: 'CodePen', domain: 'codepen.io', category: 'Development' },
      { name: 'Claude', domain: 'claude.ai', category: 'AI Tools' },
      { name: 'ChatGPT', domain: 'chatgpt.com', category: 'AI Tools' },
      { name: 'Gemini', domain: 'gemini.google.com', category: 'AI Tools' },
      { name: 'Perplexity', domain: 'perplexity.ai', category: 'AI Tools' },
      { name: 'Grok', domain: 'grok.com', category: 'AI Tools' },
      { name: 'Splice', domain: 'splice.com', category: 'Music Production' },
      { name: 'Bandcamp', domain: 'bandcamp.com', category: 'Music Production' },
      { name: 'SoundCloud', domain: 'soundcloud.com', category: 'Music Production' },
      { name: 'Beatport', domain: 'beatport.com', category: 'Music Production' },
      { name: 'Sonic Academy', domain: 'sonicacademy.com', category: 'Music Production' },
      { name: 'Point Blank School', domain: 'pointblankmusicschool.com', category: 'Music Production' },
      { name: 'ProducerTech', domain: 'producertech.com', category: 'Music Production' },
      { name: 'Canvas', domain: 'instructure.com', category: 'School & Academics' },
      { name: 'Gradescope', domain: 'gradescope.com', category: 'School & Academics' },
      { name: 'Google Classroom', domain: 'classroom.google.com', category: 'School & Academics' },
      { name: 'Blackboard', domain: 'blackboard.com', category: 'School & Academics' },
      { name: 'Coursera', domain: 'coursera.org', category: 'School & Academics' },
      { name: 'Khan Academy', domain: 'khanacademy.org', category: 'School & Academics' },
      { name: 'Quizlet', domain: 'quizlet.com', category: 'School & Academics' },
      { name: 'Chegg', domain: 'chegg.com', category: 'School & Academics' },
    ];

    // Ported from: extension/constants.js — CURATED_APPS
    const PRESET_PRODUCTIVE_APPS = [
      { name: 'PowerShell', process: 'powershell', category: 'Commonly Used' },
      { name: 'VS Code', process: 'Code', category: 'Commonly Used' },
      { name: 'Windows Terminal', process: 'WindowsTerminal', category: 'Commonly Used' },
      { name: 'Discord', process: 'Discord', category: 'Communication' },
      { name: 'Teams', process: 'ms-teams', category: 'Communication' },
      { name: 'Slack', process: 'slack', category: 'Communication' },
      { name: 'Zoom', process: 'Zoom', category: 'Communication' },
      { name: 'Adobe Acrobat', process: 'Acrobat', category: 'Office' },
      { name: 'Excel', process: 'EXCEL', category: 'Office' },
      { name: 'PowerPoint', process: 'POWERPNT', category: 'Office' },
      { name: 'Word', process: 'WINWORD', category: 'Office' },
      { name: 'ClickUp', process: 'ClickUp', category: 'Productivity' },
      { name: 'Notion', process: 'Notion', category: 'Productivity' },
      { name: 'Obsidian', process: 'Obsidian', category: 'Productivity' },
      { name: 'OneNote', process: 'ONENOTE', category: 'Productivity' },
      { name: 'Todoist', process: 'Todoist', category: 'Productivity' },
      { name: 'ChatGPT Desktop', process: 'ChatGPT', category: 'AI Assistants' },
      { name: 'Claude Desktop', process: 'claude', category: 'AI Assistants' },
      { name: 'Cursor', process: 'Cursor', category: 'AI Assistants' },
      { name: 'Illustrator', process: 'Illustrator', category: 'Design' },
      { name: 'Photoshop', process: 'Photoshop', category: 'Design' },
      { name: 'Blender', process: 'blender', category: 'Design' },
      { name: 'Figma', process: 'Figma', category: 'Design' },
      { name: 'Unity', process: 'Unity', category: 'Design' },
      { name: 'FL Studio', process: 'FL64', category: 'Music Production' },
      { name: 'Kontakt', process: 'Kontakt', category: 'Music Production' },
      { name: 'Maschine 2', process: 'Maschine 2', category: 'Music Production' },
      { name: 'Pro Tools', process: 'Protools', category: 'Music Production' },
      { name: 'Reaper', process: 'reaper', category: 'Music Production' },
      { name: 'Reason', process: 'reason', category: 'Music Production' },
      { name: 'rekordbox', process: 'rekordbox', category: 'Music Production' },
      { name: 'Serato DJ Pro', process: 'Serato DJ Pro', category: 'Music Production' },
      { name: 'Splice', process: 'Splice', category: 'Music Production' },
      { name: 'Studio One', process: 'Studio One', category: 'Music Production' },
      { name: 'Cubase', process: 'cubase', category: 'Music Production' },
      { name: 'VirtualDJ', process: 'virtualdj_pro', category: 'Music Production' },
      { name: 'Android Studio', process: 'studio64', category: 'Development' },
      { name: 'JetBrains IDEs', process: 'idea64', category: 'Development' },
      { name: 'Notepad++', process: 'notepad++', category: 'Development' },
      { name: 'PyCharm', process: 'pycharm64', category: 'Development' },
      { name: 'Sublime Text', process: 'sublime_text', category: 'Development' },
      { name: 'Vim/Neovim', process: 'nvim', category: 'Development' },
      { name: 'Visual Studio', process: 'devenv', category: 'Development' },
      { name: 'WebStorm', process: 'webstorm64', category: 'Development' },
      { name: 'Docker Desktop', process: 'Docker Desktop', category: 'Development' },
      { name: 'Git Bash', process: 'mintty', category: 'Development' },
      { name: 'Postman', process: 'Postman', category: 'Development' },
      { name: 'DBeaver', process: 'dbeaver', category: 'Development' },
      { name: 'SSMS', process: 'Ssms', category: 'Development' },
    ];

    /* ===== State ===== */
    let settings = {};
    let expandedListId = null;

    /* ===== Utilities ===== */

    function toggleSection(id) {
      document.getElementById(id).classList.toggle('open');
    }

    function flashSaved() {
      const el = document.getElementById('saveIndicator');
      el.classList.add('visible');
      setTimeout(() => el.classList.remove('visible'), 1200);
    }

    function populateSelect(id, options, currentValue) {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = '';
      for (const opt of options) {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        if (String(opt.value) === String(currentValue)) o.selected = true;
        el.appendChild(o);
      }
    }

    function setupSelect(id, parseValue) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        save({ [el.dataset.key]: parseValue(el.value) });
      });
    }

    function setupToggle(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', () => {
        const key = el.dataset.key;
        const isOn = el.classList.contains('on');
        save({ [key]: !isOn });
      });
    }

    function modeBadgeClass(mode) {
      return `mode-badge mode-badge-${mode || 'off'}`;
    }

    function modeBadgeLabel(mode) {
      const found = MODE_OPTIONS.find(o => o.value === mode);
      return found ? found.label : (mode || 'Off');
    }

    function renderTags(items, onRemoveExpr) {
      return (items || []).map((item, i) =>
        `<span class="tag">${escHtml(item)}<button onclick="${onRemoveExpr}(${i})">&times;</button></span>`
      ).join('');
    }

    function escHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    /* ===== Preset Picker ===== */

    function presetDomains(item) {
      return item.domains ? item.domains : [item.domain];
    }

    function isPresetActive(list, section, field, item) {
      const arr = (list[section] && list[section][field]) || [];
      const keys = field === 'sites' ? presetDomains(item) : [item.process];
      return keys.every(k => arr.includes(k));
    }

    function renderPresetPicker(list, section) {
      const isBlocked = section === 'blocked';
      const sitePresets = isBlocked ? PRESET_BREAK_SITES : PRESET_PRODUCTIVE_SITES;
      const appPresets = isBlocked ? PRESET_BREAK_APPS : PRESET_PRODUCTIVE_APPS;

      const siteButtons = sitePresets.map(item => {
        const keys = presetDomains(item);
        const active = isPresetActive(list, section, 'sites', item);
        return `<button class="preset-circle${active ? ' active' : ''}"
          data-list="${list.id}" data-section="${section}" data-field="sites"
          data-keys='${JSON.stringify(keys).replace(/'/g, '&#39;')}'
          onclick="togglePreset(this)">${escHtml(item.name)}</button>`;
      }).join('');

      const appButtons = appPresets.map(item => {
        const active = isPresetActive(list, section, 'apps', item);
        return `<button class="preset-circle${active ? ' active' : ''}"
          data-list="${list.id}" data-section="${section}" data-field="apps"
          data-keys='${JSON.stringify([item.process]).replace(/'/g, '&#39;')}'
          onclick="togglePreset(this)">${escHtml(item.name)}</button>`;
      }).join('');

      const cats = [...new Set([
        ...sitePresets.map(i => i.category),
        ...appPresets.map(i => i.category),
      ])];
      const catButtons = cats.map(cat => {
        const catSiteKeys = sitePresets.filter(i => i.category === cat).flatMap(presetDomains);
        const catAppKeys = appPresets.filter(i => i.category === cat).map(i => i.process);
        const siteArr = (list[section] && list[section].sites) || [];
        const appArr = (list[section] && list[section].apps) || [];
        const allKeys = [...catSiteKeys, ...catAppKeys];
        const allArr = [...siteArr, ...appArr];
        const allIn = allKeys.length > 0 && allKeys.every(k => allArr.includes(k));
        const anyIn = allKeys.some(k => allArr.includes(k));
        const cls = allIn ? 'active' : anyIn ? 'partial' : '';
        return `<button class="preset-cat-circle${cls ? ' ' + cls : ''}"
          data-list="${list.id}" data-section="${section}" data-category="${escHtml(cat)}"
          onclick="toggleCategory(this)">${escHtml(cat)}</button>`;
      }).join('');

      return `
        <div class="preset-picker">
          <div class="preset-picker-heading">Category Filters</div>
          <div class="preset-categories">${catButtons}</div>
          <div class="preset-picker-heading" style="margin-top:10px">Common Filters</div>
          <div class="preset-picker-columns">
            <div class="preset-col">
              <div class="preset-col-title">Sites</div>
              ${siteButtons}
            </div>
            <div class="preset-col">
              <div class="preset-col-title">Apps</div>
              ${appButtons}
            </div>
          </div>
        </div>`;
    }

    function togglePreset(btn) {
      const listId = btn.dataset.list;
      const section = btn.dataset.section;
      const field = btn.dataset.field;
      const keys = JSON.parse(btn.dataset.keys);
      const list = (settings.lists || []).find(l => l.id === listId);
      if (!list) return;
      if (!list[section]) list[section] = {};
      if (!list[section][field]) list[section][field] = [];
      const arr = list[section][field];
      if (keys.every(k => arr.includes(k))) {
        list[section][field] = arr.filter(k => !keys.includes(k));
      } else {
        for (const k of keys) { if (!arr.includes(k)) arr.push(k); }
      }
      save({ lists: settings.lists });
    }

    function toggleCategory(btn) {
      const listId = btn.dataset.list;
      const section = btn.dataset.section;
      const catName = btn.dataset.category;
      const isBlocked = section === 'blocked';
      const sitePresets = isBlocked ? PRESET_BREAK_SITES : PRESET_PRODUCTIVE_SITES;
      const appPresets = isBlocked ? PRESET_BREAK_APPS : PRESET_PRODUCTIVE_APPS;
      const list = (settings.lists || []).find(l => l.id === listId);
      if (!list) return;
      if (!list[section]) list[section] = {};
      if (!list[section].sites) list[section].sites = [];
      if (!list[section].apps) list[section].apps = [];
      const siteKeys = sitePresets.filter(i => i.category === catName).flatMap(presetDomains);
      const appKeys = appPresets.filter(i => i.category === catName).map(i => i.process);
      const allSitesIn = siteKeys.every(k => list[section].sites.includes(k));
      const allAppsIn = appKeys.every(k => list[section].apps.includes(k));
      if (allSitesIn && allAppsIn && (siteKeys.length + appKeys.length > 0)) {
        list[section].sites = list[section].sites.filter(k => !siteKeys.includes(k));
        list[section].apps = list[section].apps.filter(k => !appKeys.includes(k));
      } else {
        for (const k of siteKeys) { if (!list[section].sites.includes(k)) list[section].sites.push(k); }
        for (const k of appKeys) { if (!list[section].apps.includes(k)) list[section].apps.push(k); }
      }
      save({ lists: settings.lists });
    }

    /* ===== API ===== */

    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        settings = await res.json();
        populateSelect('idleTimeoutSeconds', IDLE_OPTIONS, settings.idleTimeoutSeconds);
        renderAll();
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }

    async function save(updates) {
      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        settings = await res.json();
        flashSaved();
        renderAll();
      } catch (e) {
        console.error('Save failed:', e);
      }
    }

    /* ===== List CRUD ===== */

    function addList() {
      const lists = settings.lists ? [...settings.lists] : [];
      const newId = crypto.randomUUID();
      lists.push({
        id: newId,
        name: 'New List',
        mode: 'manual',
        blocked: { sites: [], apps: [], allowedPaths: [] },
        productive: { mode: 'all-except-blocked', sites: [], apps: [] },
      });
      expandedListId = newId;
      save({ lists });
    }

    function deleteList(id) {
      const lists = settings.lists || [];
      if (lists.length <= 1) return;
      const filtered = lists.filter(l => l.id !== id);
      const updates = { lists: filtered };
      if (settings.activeListId === id) {
        updates.activeListId = filtered[0].id;
      }
      if (expandedListId === id) expandedListId = null;
      save(updates);
    }

    function renameList(id, name) {
      const list = (settings.lists || []).find(l => l.id === id);
      if (!list || list.name === name) return;
      list.name = name;
      save({ lists: settings.lists });
    }

    function changeListMode(id, mode) {
      const list = (settings.lists || []).find(l => l.id === id);
      if (!list) return;
      list.mode = mode;
      save({ lists: settings.lists });
    }

    function changeProductiveMode(id, mode) {
      const list = (settings.lists || []).find(l => l.id === id);
      if (!list) return;
      if (!list.productive) list.productive = { mode: 'all-except-blocked', sites: [], apps: [] };
      list.productive.mode = mode;
      save({ lists: settings.lists });
    }

    function addToList(id, section, field, inputId) {
      const input = document.getElementById(inputId);
      if (!input) return;
      const value = input.value.trim().toLowerCase();
      if (!value) return;
      input.value = '';
      const list = (settings.lists || []).find(l => l.id === id);
      if (!list) return;
      if (!list[section]) list[section] = {};
      if (!list[section][field]) list[section][field] = [];
      if (list[section][field].includes(value)) return;
      list[section][field].push(value);
      save({ lists: settings.lists });
    }

    function removeFromList(id, section, field, index) {
      const list = (settings.lists || []).find(l => l.id === id);
      if (!list) return;
      if (!list[section] || !list[section][field]) return;
      list[section][field].splice(index, 1);
      save({ lists: settings.lists });
    }

    /* ===== Nuclear Block ===== */

    const PRESET_NUCLEAR_SITES = [
      { name: 'OnlyFans', domain: 'onlyfans.com' },
      { name: 'Adult Websites', domains: [
        'pornhub.com','xvideos.com','xnxx.com','redtube.com','youporn.com',
        'xhamster.com','tube8.com','spankbang.com','beeg.com','eporner.com',
        'vporn.com','txxx.com','tnaflix.com','fuq.com','hclips.com',
        'drtuber.com','nuvid.com','pornone.com','empflix.com','brazzers.com',
        'realitykings.com','bangbros.com','naughtyamerica.com','anyporn.com',
        'hotmovs.com','cliphunter.com','ixxx.com','pornmd.com','alphaporno.com',
        'porntrex.com','sxyprn.com','porntube.com','fapster.xxx','gotporn.com','faphouse.com',
      ]},
      { name: 'Gambling Sites', domains: [
        'draftkings.com','fanduel.com','betmgm.com','caesarssportsbook.com',
        'bet365.com','betway.com','williamhill.com','betrivers.com',
        'pointsbet.com','hardrock.bet','unibet.com','bwin.com',
        'bovada.lv','mybookie.ag','betonline.ag','sportsbetting.ag',
        'prizepicks.com','getfliff.com','barstoolsports.com','ladbrokes.com',
        'paddypower.com','888casino.com','pokerstars.com','ggpoker.com','partypoker.com','wsop.com',
      ]},
      { name: 'Steam', domain: 'steampowered.com' },
      { name: 'Epic Games', domain: 'epicgames.com' },
      { name: 'League of Legends', domain: 'leagueoflegends.com' },
      { name: 'World of Warcraft', domain: 'worldofwarcraft.com' },
      { name: 'Valorant', domain: 'playvalorant.com' },
    ];

    function getNuclearSiteStage(site) {
      const now = Date.now();
      if (now - site.addedAt < site.cooldown1Ms) return 'locked';
      if (!site.unblockClickedAt) return 'ready';
      if (site.cooldown2Ms > 0 && now - site.unblockClickedAt < site.cooldown2Ms) return 'unblocking';
      return 'confirm';
    }

    function getNuclearCountdownMs(site) {
      const now = Date.now();
      const stage = getNuclearSiteStage(site);
      if (stage === 'locked') return site.cooldown1Ms - (now - site.addedAt);
      if (stage === 'unblocking') return site.cooldown2Ms - (now - site.unblockClickedAt);
      return 0;
    }

    function fuzzyTimeLeft(ms) {
      const MONTH = 30*24*60*60*1000, DAY = 24*60*60*1000, HOUR = 60*60*1000;
      if (ms <= 0) return null;
      if (ms >= MONTH) return Math.ceil(ms / MONTH) + ' months';
      if (ms >= 2 * DAY) return Math.ceil(ms / DAY) + ' days';
      if (ms >= DAY) return '1 day';
      if (ms >= 2 * HOUR) return Math.floor(ms / HOUR) + ' hours';
      if (ms >= HOUR) return '1 hour';
      return 'Less than 1 hour';
    }

    function getNuclearData() {
      return settings.nuclearBlockData && settings.nuclearBlockData.sites
        ? settings.nuclearBlockData : { sites: [] };
    }

    function saveNuclear(nuclear) {
      save({ nuclearBlockData: nuclear });
    }

    function addNuclearException() {
      const input = document.getElementById('nuclearExceptionInput');
      const path = input.value.trim().replace(/^(https?:\/\/)?(www\.)?/, '');
      if (!path) return;
      input.value = '';
      const container = document.getElementById('nuclearExceptionChips');
      // Check for duplicate
      if (container.querySelector(`[data-path="${CSS.escape(path)}"]`)) return;
      const chip = document.createElement('span');
      chip.className = 'exception-chip';
      chip.dataset.path = path;
      chip.textContent = path;
      const remove = document.createElement('span');
      remove.className = 'remove-chip';
      remove.textContent = '\u00d7';
      remove.onclick = () => chip.remove();
      chip.appendChild(remove);
      container.appendChild(chip);
    }

    function collectNuclearExceptions() {
      return Array.from(document.querySelectorAll('#nuclearExceptionChips .exception-chip'))
        .map(c => c.dataset.path);
    }

    function addNuclearSiteFromUI() {
      const cooldown1Ms = parseInt(document.getElementById('nuclearCooldown').value, 10);
      const cooldown2Ms = parseInt(document.getElementById('nuclearSecondCooldown').value, 10);
      const exceptions = collectNuclearExceptions();
      const nuclear = getNuclearData();
      const existingDomains = new Set();
      nuclear.sites.forEach(s => {
        if (s.domains) s.domains.forEach(d => existingDomains.add(d));
        else if (s.domain) existingDomains.add(s.domain);
      });

      const entries = [];

      // Collect checked presets
      PRESET_NUCLEAR_SITES.forEach(preset => {
        const key = preset.domain || preset.domains[0];
        const cb = document.getElementById('nuclear-preset-' + key);
        if (cb && cb.checked && !cb.disabled) {
          entries.push({
            id: 'nuclear-' + Date.now() + '-' + Math.random().toString(36).slice(2),
            name: preset.name,
            ...(preset.domain ? { domain: preset.domain } : { domains: preset.domains }),
            addedAt: Date.now(), cooldown1Ms, cooldown2Ms, unblockClickedAt: null,
            exceptions,
          });
        }
      });

      // Collect custom domain
      const customInput = document.getElementById('nuclearCustomDomain');
      const customDomain = customInput.value.trim().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '').toLowerCase();
      if (customDomain && !existingDomains.has(customDomain)) {
        entries.push({
          id: 'nuclear-' + Date.now() + '-' + Math.random().toString(36).slice(2),
          name: customDomain, domain: customDomain,
          addedAt: Date.now(), cooldown1Ms, cooldown2Ms, unblockClickedAt: null,
          exceptions,
        });
      }

      if (entries.length === 0) {
        alert('Select at least one preset or enter a domain to add.');
        return;
      }

      entries.forEach(e => nuclear.sites.push(e));
      customInput.value = '';
      document.getElementById('nuclearExceptionChips').innerHTML = '';
      // Uncheck presets
      PRESET_NUCLEAR_SITES.forEach(p => {
        const cb = document.getElementById('nuclear-preset-' + (p.domain || p.domains[0]));
        if (cb) cb.checked = false;
      });
      saveNuclear(nuclear);
    }

    function clickUnblockNuclear(id) {
      const nuclear = getNuclearData();
      const site = nuclear.sites.find(s => s.id === id);
      if (!site) return;
      if (!site.cooldown2Ms || site.cooldown2Ms <= 0) {
        nuclear.sites = nuclear.sites.filter(s => s.id !== id);
      } else {
        site.unblockClickedAt = Date.now();
      }
      saveNuclear(nuclear);
    }

    function confirmUnblockNuclear(id) {
      if (!confirm('Are you sure you want to permanently unblock this site?')) return;
      const nuclear = getNuclearData();
      nuclear.sites = nuclear.sites.filter(s => s.id !== id);
      saveNuclear(nuclear);
    }

    function blockAgainNuclear(id, selectEl) {
      const ms = parseInt(selectEl.value, 10);
      if (!ms) return;
      const nuclear = getNuclearData();
      const site = nuclear.sites.find(s => s.id === id);
      if (!site) return;
      site.addedAt = Date.now();
      site.cooldown1Ms = ms;
      site.unblockClickedAt = null;
      saveNuclear(nuclear);
    }

    function addNuclearSiteException(id) {
      const input = document.getElementById('nuclear-ex-input-' + id);
      if (!input) return;
      const path = input.value.trim().replace(/^(https?:\/\/)?(www\.)?/, '');
      if (!path) return;
      const nuclear = getNuclearData();
      const site = nuclear.sites.find(s => s.id === id);
      if (!site) return;
      if (!site.exceptions) site.exceptions = [];
      if (site.exceptions.includes(path)) return;
      site.exceptions.push(path);
      saveNuclear(nuclear);
    }

    function removeNuclearSiteException(id, exPath) {
      const nuclear = getNuclearData();
      const site = nuclear.sites.find(s => s.id === id);
      if (!site || !site.exceptions) return;
      site.exceptions = site.exceptions.filter(e => e !== exPath);
      saveNuclear(nuclear);
    }

    /* ===== Reset ===== */

    async function resetSettings() {
      if (!confirm('Reset all settings to defaults? Nuclear blocks will be preserved.')) return;
      try {
        const nuclearBackup = settings.nuclearBlockData;
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workMinutes: 50, rewardMinutes: 10,
            strictMode: false, blockTaskManager: false,
            idleTimeoutSeconds: 180,
            nuclearBlockData: nuclearBackup,
          }),
        });
        await loadSettings();
        flashSaved();
      } catch (e) {
        console.error('Reset failed:', e);
      }
    }

    /* ===== Rendering ===== */

    function renderAll() {
      renderLists();
      renderNuclearBlock();
      // Sync dropdown
      populateSelect('idleTimeoutSeconds', IDLE_OPTIONS, settings.idleTimeoutSeconds);
    }

    function renderLists() {
      const container = document.getElementById('listsContainer');
      const lists = settings.lists || [];
      const canDelete = lists.length > 1;

      container.innerHTML = lists.map(list => {
        const isOpen = list.id === expandedListId;
        const blocked = list.blocked || {};
        const productive = list.productive || {};
        const sitesCount = (blocked.sites || []).length;
        const appsCount = (blocked.apps || []).length;
        const productiveMode = productive.mode || 'all-except-blocked';
        const prodSitesCount = (productive.sites || []).length;
        const prodAppsCount = (productive.apps || []).length;
        const summaryParts = [];
        if (sitesCount > 0) summaryParts.push(`${sitesCount} site${sitesCount !== 1 ? 's' : ''} blocked`);
        if (appsCount > 0) summaryParts.push(`${appsCount} app${appsCount !== 1 ? 's' : ''}`);
        if (productiveMode === 'all-except-blocked') {
          summaryParts.push('All sites & apps productive');
        } else {
          const prodParts = [];
          if (prodSitesCount > 0) prodParts.push(`${prodSitesCount} productive site${prodSitesCount !== 1 ? 's' : ''}`);
          if (prodAppsCount > 0) prodParts.push(`${prodAppsCount} productive app${prodAppsCount !== 1 ? 's' : ''}`);
          if (prodParts.length > 0) summaryParts.push(...prodParts);
        }
        const summary = summaryParts.length > 0 ? summaryParts.join(' · ') : 'No items';

        const modeOpts = MODE_OPTIONS.map(o =>
          `<option value="${o.value}"${o.value === list.mode ? ' selected' : ''}>${o.label}</option>`
        ).join('');

        const showWhitelistFields = productiveMode === 'whitelist';

        const whitelistFields = showWhitelistFields ? `
          <div class="card-field">
            <div class="card-field-label">Productive Sites</div>
            <div class="tag-list">${renderTags(productive.sites || [], `removeFromList.bind(null,'${list.id}','productive','sites')`)}</div>
            <div class="add-row">
              <input type="text" id="input-productive-sites-${list.id}" placeholder="e.g. stackoverflow.com"
                onkeydown="if(event.key==='Enter')addToList('${list.id}','productive','sites','input-productive-sites-${list.id}')">
              <button onclick="addToList('${list.id}','productive','sites','input-productive-sites-${list.id}')">Add</button>
            </div>
          </div>
          <div class="card-field">
            <div class="card-field-label">Productive Apps</div>
            <div class="tag-list">${renderTags(productive.apps || [], `removeFromList.bind(null,'${list.id}','productive','apps')`)}</div>
            <div class="add-row">
              <input type="text" id="input-productive-apps-${list.id}" placeholder="e.g. Code.exe"
                onkeydown="if(event.key==='Enter')addToList('${list.id}','productive','apps','input-productive-apps-${list.id}')">
              <button onclick="addToList('${list.id}','productive','apps','input-productive-apps-${list.id}')">Add</button>
            </div>
          </div>
          ${renderPresetPicker(list, 'productive')}` : '';

        return `
          <div class="list-card${isOpen ? ' open' : ''}" id="list-card-${list.id}">
            <div class="list-card-header" onclick="toggleListCard('${list.id}')">
              <span class="list-card-arrow">&#9654;</span>
              <span class="list-card-name">${escHtml(list.name)}</span>
              <span class="${modeBadgeClass(list.mode)}">${modeBadgeLabel(list.mode)}</span>
              <span class="list-card-summary">${summary}</span>
            </div>
            <div class="list-card-body">
              <div class="card-field">
                <div class="card-field-label">Name</div>
                <input class="card-name-input" type="text" value="${escHtml(list.name)}"
                  onblur="renameList('${list.id}', this.value)"
                  onkeydown="if(event.key==='Enter')this.blur()">
              </div>
              <div class="card-field">
                <div class="card-field-label">Mode</div>
                <select class="card-mode-select" onchange="changeListMode('${list.id}', this.value)">${modeOpts}</select>
              </div>

              <div class="card-section-heading">What to Block</div>
              <div class="card-field">
                <div class="card-field-label">Blocked Sites</div>
                <div class="tag-list">${renderTags(blocked.sites || [], `removeFromList.bind(null,'${list.id}','blocked','sites')`)}</div>
                <div class="add-row">
                  <input type="text" id="input-blocked-sites-${list.id}" placeholder="e.g. tiktok.com"
                    onkeydown="if(event.key==='Enter')addToList('${list.id}','blocked','sites','input-blocked-sites-${list.id}')">
                  <button onclick="addToList('${list.id}','blocked','sites','input-blocked-sites-${list.id}')">Add</button>
                </div>
              </div>
              <div class="card-field">
                <div class="card-field-label">Blocked Apps</div>
                <div class="tag-list">${renderTags(blocked.apps || [], `removeFromList.bind(null,'${list.id}','blocked','apps')`)}</div>
                <div class="add-row">
                  <input type="text" id="input-blocked-apps-${list.id}" placeholder="e.g. discord.exe"
                    onkeydown="if(event.key==='Enter')addToList('${list.id}','blocked','apps','input-blocked-apps-${list.id}')">
                  <button onclick="addToList('${list.id}','blocked','apps','input-blocked-apps-${list.id}')">Add</button>
                </div>
              </div>
              ${renderPresetPicker(list, 'blocked')}
              <div class="card-field">
                <div class="card-field-label">Allowed Paths</div>
                <div class="card-field-sublabel">Exceptions within blocked sites</div>
                <div class="tag-list">${renderTags(blocked.allowedPaths || [], `removeFromList.bind(null,'${list.id}','blocked','allowedPaths')`)}</div>
                <div class="add-row">
                  <input type="text" id="input-blocked-allowedPaths-${list.id}" placeholder="e.g. youtube.com/veritasium"
                    onkeydown="if(event.key==='Enter')addToList('${list.id}','blocked','allowedPaths','input-blocked-allowedPaths-${list.id}')">
                  <button onclick="addToList('${list.id}','blocked','allowedPaths','input-blocked-allowedPaths-${list.id}')">Add</button>
                </div>
              </div>

              <div class="card-section-heading">What Counts as Productive</div>
              <div class="card-field">
                <div class="radio-group">
                  <label class="radio-label">
                    <input type="radio" name="prod-mode-${list.id}" value="all-except-blocked"
                      ${productiveMode === 'all-except-blocked' ? 'checked' : ''}
                      onchange="changeProductiveMode('${list.id}', 'all-except-blocked')">
                    All sites except blocked ones
                  </label>
                  <label class="radio-label">
                    <input type="radio" name="prod-mode-${list.id}" value="whitelist"
                      ${productiveMode === 'whitelist' ? 'checked' : ''}
                      onchange="changeProductiveMode('${list.id}', 'whitelist')">
                    Only the sites I select
                  </label>
                </div>
              </div>
              ${whitelistFields}

              <button class="btn-delete-list" onclick="deleteList('${list.id}')"
                ${canDelete ? '' : 'disabled'}>Delete List</button>
            </div>
          </div>`;
      }).join('');
    }

    function toggleListCard(id) {
      expandedListId = expandedListId === id ? null : id;
      renderLists();
    }

    function renderNuclearBlock() {
      // Render presets
      const presetsGrid = document.getElementById('nuclearPresetsList');
      if (!presetsGrid) return;
      const nuclear = getNuclearData();
      const existingDomains = new Set();
      nuclear.sites.forEach(s => {
        if (s.domains) s.domains.forEach(d => existingDomains.add(d));
        else if (s.domain) existingDomains.add(s.domain);
      });

      presetsGrid.innerHTML = PRESET_NUCLEAR_SITES.map(preset => {
        const key = preset.domain || preset.domains[0];
        const domains = preset.domains || [preset.domain];
        const alreadyAdded = domains.every(d => existingDomains.has(d));
        return `<label class="nuclear-preset-item" style="${alreadyAdded ? 'opacity:0.5;' : ''}">
          <input type="checkbox" id="nuclear-preset-${escHtml(key)}" ${alreadyAdded ? 'disabled' : ''}>
          <span>${escHtml(preset.name)}</span>
        </label>`;
      }).join('');

      // Render site cards
      const list = document.getElementById('nuclearSitesList');
      if (!nuclear.sites.length) {
        list.innerHTML = '<p class="nuclear-empty">No sites added yet.</p>';
      } else {
        list.innerHTML = nuclear.sites.map(site => {
          const stage = getNuclearSiteStage(site);
          const name = escHtml(site.name || site.domain || (site.domains || [])[0] || '?');
          let countdownHtml = '';
          if (stage === 'locked') {
            const fuzzy = fuzzyTimeLeft(getNuclearCountdownMs(site)) || '1 day';
            countdownHtml = `<div class="site-countdown">${fuzzy} until you can request unblock</div>`;
          } else if (stage === 'ready') {
            countdownHtml = '';
          } else if (stage === 'unblocking') {
            const fuzzy = fuzzyTimeLeft(getNuclearCountdownMs(site)) || '1 day';
            countdownHtml = `<div class="site-countdown unblocking">${fuzzy} until site is removed</div>`;
          } else if (stage === 'confirm') {
            countdownHtml = `<div class="site-countdown">Waiting for your final decision</div>`;
          }

          // Exception display
          let exceptionsHtml = '';
          if (site.exceptions && site.exceptions.length > 0) {
            const chips = site.exceptions.map(ex => {
              const removeBtn = stage === 'confirm'
                ? `<span class="remove-chip" onclick="removeNuclearSiteException('${site.id}','${escHtml(ex)}')">&times;</span>`
                : '';
              return `<span class="exception-chip">${escHtml(ex)}${removeBtn}</span>`;
            }).join('');
            exceptionsHtml = `<div class="nuclear-exception-list"><span style="font-size:11px;color:var(--text-muted);margin-right:6px;">Exceptions:</span>${chips}</div>`;
          }

          // Add exception input for confirm stage
          let addExHtml = '';
          if (stage === 'confirm') {
            addExHtml = `<div class="exception-add-row" style="margin-top:6px;">
              <input type="text" id="nuclear-ex-input-${site.id}" placeholder="Add exception path..."
                style="flex:1;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:11px;"
                onkeydown="if(event.key==='Enter'){event.preventDefault();addNuclearSiteException('${site.id}')}">
              <button onclick="addNuclearSiteException('${site.id}')"
                style="padding:4px 10px;font-size:11px;background:var(--accent);color:white;border:none;border-radius:6px;cursor:pointer;">Add</button>
            </div>`;
          }

          // Action buttons
          let actionsHtml = '';
          if (stage === 'ready' || stage === 'confirm') {
            const btnLabel = (stage === 'confirm' || !site.cooldown2Ms || site.cooldown2Ms <= 0) ? 'Unblock Now' : 'Unblock';
            const btnAction = stage === 'confirm'
              ? `confirmUnblockNuclear('${site.id}')`
              : `clickUnblockNuclear('${site.id}')`;
            actionsHtml += `<button class="btn-unblock" onclick="${btnAction}">${btnLabel}</button>`;
            actionsHtml += `<select class="select-block-again" onchange="blockAgainNuclear('${site.id}', this)">
              <option value="" disabled selected>Block Again</option>
              <option value="10000">⚠ 10s (test)</option>
              <option value="86400000">24 hours</option>
              <option value="172800000">48 hours</option>
              <option value="604800000">1 week</option>
              <option value="2592000000">1 month</option>
              <option value="7776000000">3 months</option>
              <option value="15552000000">6 months</option>
              <option value="31536000000">1 year</option>
            </select>`;
          }

          return `<div class="nuclear-site-card">
            <div class="site-info">
              <div class="site-name">${name}</div>
              ${countdownHtml}
              ${exceptionsHtml}
              ${addExHtml}
            </div>
            ${actionsHtml}
          </div>`;
        }).join('');
      }

      // Cooldown test warning
      updateNuclearCooldownWarning();
    }

    function updateNuclearCooldownWarning() {
      const c1 = document.getElementById('nuclearCooldown');
      const c2 = document.getElementById('nuclearSecondCooldown');
      const warn = document.getElementById('nuclearCooldownTestWarning');
      if (!c1 || !c2 || !warn) return;
      const testMode = c1.value === '10000' || c2.value === '5000';
      warn.style.display = testMode ? 'block' : 'none';
    }

    /* ===== Init ===== */

    setupSelect('idleTimeoutSeconds', parseInt);

    // Nuclear cooldown warning listeners
    document.getElementById('nuclearCooldown').addEventListener('change', updateNuclearCooldownWarning);
    document.getElementById('nuclearSecondCooldown').addEventListener('change', updateNuclearCooldownWarning);

    // Refresh nuclear countdowns every minute
    setInterval(() => renderNuclearBlock(), 60 * 1000);

    function connectWS() {
      const ws = new WebSocket(`ws://${location.host}`);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'settings-updated') {
            settings = msg.data;
            renderAll();
          }
        } catch (e) {}
      };
      ws.onclose = () => setTimeout(connectWS, 2000);
    }

    connectWS();
    loadSettings();

// Shared constants — single source of truth for defaults and magic numbers

// ── Display name (change here to rename everywhere) ──
// NOTE: Also update manifest.json "name" field — it can't read JS constants.
const APP_NAME = 'Brainrot Blocker';
const APP_NAME_FULL = 'Brainrot Blocker';

const DEFAULTS = {
  workMinutes: 50,
  rewardMinutes: 10,
  rewardSites: [
    // Social Media
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'x.com',
    'tiktok.com',
    'snapchat.com',
    'linkedin.com',
    'pinterest.com',
    'tumblr.com',
    'reddit.com',
    'discord.com',
    'telegram.org',
    'whatsapp.com',
    'messenger.com',
    // Video Platforms
    'youtube.com',
    'twitch.tv',
    'vimeo.com',
    'dailymotion.com',
    'netflix.com',
    'hulu.com',
    'disneyplus.com',
    'primevideo.com',
    'hbomax.com',
    'peacocktv.com',
    'paramountplus.com',
    'crunchyroll.com',
    // News
    'cnn.com',
    'bbc.com',
    'nytimes.com',
    'theguardian.com',
    'washingtonpost.com',
    'foxnews.com',
    'reuters.com',
    'apnews.com',
    'nbcnews.com',
    'bloomberg.com',
    'wsj.com',
    'usatoday.com',
    // Shopping
    'amazon.com',
    'ebay.com',
    'etsy.com',
    'walmart.com',
    'target.com',
    'bestbuy.com',
    'aliexpress.com',
    'wish.com',
    'shein.com',
    'zappos.com',
    'wayfair.com',
    'overstock.com',
    // Gaming
    'steampowered.com',
    'epicgames.com',
    'roblox.com',
    'minecraft.net',
    'ign.com',
    'gamespot.com',
    'polygon.com',
    'kotaku.com',
    'pcgamer.com',
    'ea.com',
    'ubisoft.com',
  ],
  productiveSites: [
    'docs.google.com',
    'notion.so',
    'github.com',
    // Music & Production
    'ableton.com',
    'image-line.com',
    'native-instruments.com',
    'izotope.com',
    'waves.com',
    'fabfilter.com',
    'arturia.com',
    'spotify.com',
    'soundcloud.com',
    'bandcamp.com',
    'beatport.com',
    'syntorial.com',
    'sonicacademy.com',
    'pointblankmusicschool.com',
    'producertech.com',
  ],
  allowedPaths: [],
  productiveMode: 'all-except-blocked',
  productiveApps: [],
  blockedApps: [],
  strictMode: 'off',
  penaltyType: 'Charity',
  penaltyTarget: '',
  penaltyAmount: 5,
  paymentMethod: '',
};

const CURATED_APPS = [
  // Communication
  { name: 'Discord', process: 'Discord', category: 'Communication' },
  { name: 'Microsoft Teams', process: 'ms-teams', category: 'Communication' },
  { name: 'Slack', process: 'slack', category: 'Communication' },
  { name: 'Zoom', process: 'Zoom', category: 'Communication' },
  // Office
  { name: 'Adobe Acrobat', process: 'Acrobat', category: 'Office' },
  { name: 'Microsoft Excel', process: 'EXCEL', category: 'Office' },
  { name: 'Microsoft PowerPoint', process: 'POWERPNT', category: 'Office' },
  { name: 'Microsoft Word', process: 'WINWORD', category: 'Office' },
  // Productivity
  { name: 'ClickUp', process: 'ClickUp', category: 'Productivity' },
  { name: 'Notion', process: 'Notion', category: 'Productivity' },
  { name: 'Obsidian', process: 'Obsidian', category: 'Productivity' },
  { name: 'OneNote', process: 'ONENOTE', category: 'Productivity' },
  { name: 'Todoist', process: 'Todoist', category: 'Productivity' },
  // AI Assistants
  { name: 'ChatGPT Desktop', process: 'ChatGPT', category: 'AI Assistants' },
  { name: 'Claude Desktop', process: 'claude', category: 'AI Assistants' },
  { name: 'Cursor', process: 'Cursor', category: 'AI Assistants' },
  // Design
  { name: 'Adobe Illustrator', process: 'Illustrator', category: 'Design' },
  { name: 'Adobe Photoshop', process: 'Photoshop', category: 'Design' },
  { name: 'Blender', process: 'blender', category: 'Design' },
  { name: 'Figma', process: 'Figma', category: 'Design' },
  { name: 'Unity', process: 'Unity', category: 'Design' },
  // Development — IDEs & Editors
  { name: 'Android Studio', process: 'studio64', category: 'Development' },
  { name: 'JetBrains IDEs', process: 'idea64', category: 'Development' },
  { name: 'Notepad++', process: 'notepad++', category: 'Development' },
  { name: 'PyCharm', process: 'pycharm64', category: 'Development' },
  { name: 'Sublime Text', process: 'sublime_text', category: 'Development' },
  { name: 'Vim/Neovim', process: 'nvim', category: 'Development' },
  { name: 'Visual Studio', process: 'devenv', category: 'Development' },
  { name: 'Visual Studio Code', process: 'Code', category: 'Development' },
  { name: 'WebStorm', process: 'webstorm64', category: 'Development' },
  // Development — Terminals & Tools
  { name: 'Command Prompt', process: 'cmd', category: 'Development' },
  { name: 'Docker Desktop', process: 'Docker Desktop', category: 'Development' },
  { name: 'Git Bash', process: 'mintty', category: 'Development' },
  { name: 'Insomnia', process: 'Insomnia', category: 'Development' },
  { name: 'Postman', process: 'Postman', category: 'Development' },
  { name: 'PowerShell', process: 'powershell', category: 'Development' },
  { name: 'Windows Terminal', process: 'WindowsTerminal', category: 'Development' },
  // Development — Database
  { name: 'Azure Data Studio', process: 'azuredatastudio', category: 'Development' },
  { name: 'DBeaver', process: 'dbeaver', category: 'Development' },
  { name: 'MySQL Workbench', process: 'MySQLWorkbench', category: 'Development' },
  { name: 'pgAdmin', process: 'pgAdmin4', category: 'Development' },
  { name: 'SQL Workbench', process: 'SQLWorkbench', category: 'Development' },
  { name: 'SSMS', process: 'Ssms', category: 'Development' },
  // Deployment & Hosting
  { name: 'FileZilla', process: 'filezilla', category: 'Deployment & Hosting' },
  { name: 'PuTTY', process: 'putty', category: 'Deployment & Hosting' },
  { name: 'WinSCP', process: 'WinSCP', category: 'Deployment & Hosting' },
  // Virtualization
  { name: 'Hyper-V Manager', process: 'virtmgmt', category: 'Virtualization' },
  { name: 'VirtualBox', process: 'VirtualBoxVM', category: 'Virtualization' },
  { name: 'VMware Player', process: 'vmplayer', category: 'Virtualization' },
  { name: 'VMware Workstation', process: 'vmware', category: 'Virtualization' },
];

const PRODUCTIVITY_CHECK_MINUTES = 10; // minutes before "Are you really working?" popup

const NATIVE_HOST_NAME = 'com.brainrotblocker.native';

const ALARM_PERIOD_MINUTES = 0.25;
const ALLOW_RULE_ID_OFFSET = 1000;

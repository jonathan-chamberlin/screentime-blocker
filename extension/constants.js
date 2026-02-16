// Shared constants — single source of truth for defaults and magic numbers

// ── Display name (change here to rename everywhere) ──
// NOTE: Also update manifest.json "name" field — it can't read JS constants.
const APP_NAME = 'Brainrot Blocker';
const APP_NAME_FULL = 'Brainrot Blocker';

const DEFAULTS = {
  workMinutes: 50,
  rewardMinutes: 10,
  rewardSites: ['youtube.com'],
  productiveSites: ['docs.google.com', 'notion.so', 'github.com'],
  allowedPaths: [],
  productiveMode: 'all-except-blocked',
  productiveApps: [],
  strictMode: 'off',
  penaltyType: 'Charity',
  penaltyTarget: '',
  penaltyAmount: 5,
  paymentMethod: '',
};

const CURATED_APPS = [
  // Development
  { name: 'Visual Studio Code', process: 'Code', category: 'Development' },
  { name: 'Visual Studio', process: 'devenv', category: 'Development' },
  { name: 'JetBrains IDEs', process: 'idea64', category: 'Development' },
  { name: 'Sublime Text', process: 'sublime_text', category: 'Development' },
  { name: 'Notepad++', process: 'notepad++', category: 'Development' },
  { name: 'Windows Terminal', process: 'WindowsTerminal', category: 'Development' },
  { name: 'Command Prompt', process: 'cmd', category: 'Development' },
  { name: 'PowerShell', process: 'powershell', category: 'Development' },
  { name: 'Git Bash', process: 'mintty', category: 'Development' },
  // Office
  { name: 'Microsoft Word', process: 'WINWORD', category: 'Office' },
  { name: 'Microsoft Excel', process: 'EXCEL', category: 'Office' },
  { name: 'Microsoft PowerPoint', process: 'POWERPNT', category: 'Office' },
  { name: 'Adobe Acrobat', process: 'Acrobat', category: 'Office' },
  // Productivity
  { name: 'Notion', process: 'Notion', category: 'Productivity' },
  { name: 'Obsidian', process: 'Obsidian', category: 'Productivity' },
  { name: 'OneNote', process: 'ONENOTE', category: 'Productivity' },
  // Communication
  { name: 'Slack', process: 'slack', category: 'Communication' },
  { name: 'Zoom', process: 'Zoom', category: 'Communication' },
  { name: 'Microsoft Teams', process: 'ms-teams', category: 'Communication' },
  // Design
  { name: 'Figma', process: 'Figma', category: 'Design' },
];

const PRODUCTIVITY_CHECK_MINUTES = 1; // minutes before "Are you really working?" popup

const NATIVE_HOST_NAME = 'com.brainrotblocker.native';

const ALARM_PERIOD_MINUTES = 0.25;
const ALLOW_RULE_ID_OFFSET = 1000;

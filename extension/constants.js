// Shared constants — single source of truth for defaults and magic numbers

// ── Display name (change here to rename everywhere) ──
// NOTE: Also update manifest.json "name" field — it can't read JS constants.
const APP_NAME = 'Brainrot Blocker';
const APP_NAME_FULL = 'Brainrot Blocker';

const DEFAULTS = {
  workMinutes: 50,
  rewardMinutes: 10,
  rewardSites: [
    'youtube.com',
    'reddit.com',
    'instagram.com',
    'tiktok.com',
    'twitter.com',
    'x.com',
    'facebook.com',
    'twitch.tv',
    'netflix.com',
    'hulu.com',
    'disneyplus.com',
  ],
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
  // Sales & Customer Support
  { name: 'Freshdesk', process: 'Freshdesk', category: 'Sales & Customer Support' },
  { name: 'HubSpot', process: 'HubSpot', category: 'Sales & Customer Support' },
  { name: 'Intercom', process: 'Intercom', category: 'Sales & Customer Support' },
  { name: 'Salesforce', process: 'Salesforce', category: 'Sales & Customer Support' },
  { name: 'Zendesk', process: 'Zendesk', category: 'Sales & Customer Support' },
  { name: 'Zoho CRM', process: 'ZohoCRM', category: 'Sales & Customer Support' },
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
  { name: 'AWS Console', process: 'aws', category: 'Deployment & Hosting' },
  { name: 'Azure CLI', process: 'az', category: 'Deployment & Hosting' },
  { name: 'FileZilla', process: 'filezilla', category: 'Deployment & Hosting' },
  { name: 'Google Cloud CLI', process: 'gcloud', category: 'Deployment & Hosting' },
  { name: 'Kubernetes (kubectl)', process: 'kubectl', category: 'Deployment & Hosting' },
  { name: 'PuTTY', process: 'putty', category: 'Deployment & Hosting' },
  { name: 'Terraform', process: 'terraform', category: 'Deployment & Hosting' },
  { name: 'WinSCP', process: 'WinSCP', category: 'Deployment & Hosting' },
  // Virtualization
  { name: 'Hyper-V Manager', process: 'virtmgmt', category: 'Virtualization' },
  { name: 'VirtualBox', process: 'VirtualBoxVM', category: 'Virtualization' },
  { name: 'VMware Player', process: 'vmplayer', category: 'Virtualization' },
  { name: 'VMware Workstation', process: 'vmware', category: 'Virtualization' },
];

const NATIVE_HOST_NAME = 'com.brainrotblocker.native';

const ALARM_PERIOD_MINUTES = 0.25;
const ALLOW_RULE_ID_OFFSET = 1000;

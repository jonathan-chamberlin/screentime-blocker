// Shared constants — single source of truth for defaults and magic numbers

const DEFAULTS = {
  workMinutes: 50,
  rewardMinutes: 10,
  rewardSites: ['youtube.com'],
  productiveSites: ['docs.google.com', 'notion.so', 'github.com'],
  allowedPaths: [],
  productiveMode: 'all-except-blocked',
  strictMode: 'off',
  penaltyType: 'Charity',
  penaltyTarget: '',
  penaltyAmount: 5,
  paymentMethod: '',
};

const ALARM_PERIOD_MINUTES = 0.25;
const ALLOW_RULE_ID_OFFSET = 1000;

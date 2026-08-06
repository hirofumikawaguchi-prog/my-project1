const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'config.json');

function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const config = JSON.parse(raw);

  return {
    port: config.port || 4000,
    meetingsPath: path.resolve(PROJECT_ROOT, config.meetingsPath || './meetings'),
    dueSoonDays: Number.isFinite(config.dueSoonDays) ? config.dueSoonDays : 3,
    users: Array.isArray(config.users) ? config.users : [],
  };
}

module.exports = { loadConfig, CONFIG_PATH, PROJECT_ROOT };

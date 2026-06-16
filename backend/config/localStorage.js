const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(name) {
  ensureDir();
  return path.join(DATA_DIR, name);
}

function readJSON(file, fallback) {
  const p = filePath(file);
  try {
    if (!fs.existsSync(p)) return fallback;
    const raw = fs.readFileSync(p, 'utf8');
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  const p = filePath(file);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

function uuidLike() {
  return Math.random().toString(16).slice(2) + '-' + Date.now().toString(16);
}

module.exports = {
  DATA_DIR,
  readJSON,
  writeJSON,
  uuidLike
};


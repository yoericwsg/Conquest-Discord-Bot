const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

fs.mkdirSync(DATA_DIR, { recursive: true });

function ensureFile(filePath, defaultValue = {}) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
}

function read(file, defaultValue = {}) {
  const filePath = path.join(DATA_DIR, file);
  ensureFile(filePath, defaultValue);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return defaultValue;
  }
}

function write(file, data) {
  const filePath = path.join(DATA_DIR, file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function get(file, key, defaultValue = {}) {
  const data = read(file);
  if (!data[key]) {
    data[key] = defaultValue;
    write(file, data);
  }
  return data[key];
}

function set(file, key, value) {
  const data = read(file);
  data[key] = value;
  write(file, data);
}

function update(file, key, updater, defaultValue = {}) {
  const data = read(file);
  data[key] = updater(data[key] ?? defaultValue);
  write(file, data);
}

module.exports = { read, write, get, set, update, DATA_DIR };

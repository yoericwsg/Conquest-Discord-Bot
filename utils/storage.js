const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
let temporaryWriteSequence = 0;

fs.mkdirSync(DATA_DIR, { recursive: true });

function ensureFile(filePath, defaultValue = {}) {
  if (!fs.existsSync(filePath)) {
    writePathAtomically(filePath, defaultValue);
  }
}

function resolveDataPath(file) {
  if (typeof file !== 'string' || path.basename(file) !== file || !file.endsWith('.json')) {
    throw new TypeError('Storage filenames must be plain .json filenames inside the data directory.');
  }
  return path.join(DATA_DIR, file);
}

function writePathAtomically(filePath, data) {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.${temporaryWriteSequence++}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temporaryPath, filePath);
  } catch (error) {
    try { fs.unlinkSync(temporaryPath); } catch {}
    throw error;
  }
}

function read(file, defaultValue = {}) {
  const filePath = resolveDataPath(file);
  ensureFile(filePath, defaultValue);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) {
      const backupPrefix = `${path.basename(filePath)}.corrupt-`;
      const alreadyPreserved = fs.readdirSync(DATA_DIR).some(name => name.startsWith(backupPrefix));
      if (!alreadyPreserved) {
        const backupPath = `${filePath}.corrupt-${Date.now()}`;
        try {
          fs.copyFileSync(filePath, backupPath, fs.constants.COPYFILE_EXCL);
          console.error(`[STORAGE] Invalid JSON in ${file}; preserved the original at ${path.basename(backupPath)}.`);
        } catch (backupError) {
          console.error(`[STORAGE] Invalid JSON in ${file}; unable to preserve a recovery copy: ${backupError.message}`);
        }
      }
    }
    return defaultValue;
  }
}

function write(file, data) {
  const filePath = resolveDataPath(file);
  writePathAtomically(filePath, data);
}

function get(file, key, defaultValue = {}) {
  const data = read(file);
  if (!Object.prototype.hasOwnProperty.call(data, key)) {
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

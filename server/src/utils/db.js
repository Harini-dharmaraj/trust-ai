import fs from 'fs';
import path from 'path';

const storePath = path.resolve('data_store.json');

// Initialize store file if not present
if (!fs.existsSync(storePath)) {
  fs.writeFileSync(
    storePath,
    JSON.stringify({
      users: [],
      groups: [],
      payments: [],
      expenses: [],
      proposals: [],
      messages: [],
      notifications: [],
    }, null, 2)
  );
}

export function readStore() {
  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return {
      users: [],
      groups: [],
      payments: [],
      expenses: [],
      proposals: [],
      messages: [],
      notifications: [],
    };
  }
}

export function writeStore(data) {
  try {
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to local datastore:', error);
    return false;
  }
}

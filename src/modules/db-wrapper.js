// Async wrapper for database operations
// This provides a synchronous-like interface for Firebase while maintaining backward compatibility

const dbModule = require('./db');
const logger = require('@mirasaki/logger');

// Check if using Firebase
const useFirebase = !!(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY &&
  process.env.FIREBASE_DATABASE_URL
);

// Wrapper for getGuildSettings that handles both sync (LokiJS) and async (Firebase)
function getGuildSettings(guildId) {
  const result = dbModule.getGuildSettings(guildId);
  
  // If using Firebase, it returns a Promise, but we can still return it
  // The calling code will need to handle it appropriately
  if (useFirebase && result && typeof result.then === 'function') {
    return result;
  }
  
  return result;
}

// Wrapper for saveDb
function saveDb(cb) {
  return dbModule.saveDb(cb);
}

// Wrapper for updateGuildSettings (Firebase-specific)
function updateGuildSettings(guildId, updates) {
  if (useFirebase && dbModule.updateGuildSettings) {
    return dbModule.updateGuildSettings(guildId, updates);
  }
  
  // For LokiJS, we need to get, modify, and save
  const settings = getGuildSettings(guildId);
  Object.assign(settings, updates);
  
  const guilds = dbModule.db.getCollection('guilds');
  guilds.update(settings);
  return new Promise((resolve) => {
    saveDb(() => resolve());
  });
}

// Export with backward compatibility
module.exports = {
  db: dbModule.db,
  saveDb,
  getGuildSettings,
  updateGuildSettings: useFirebase && dbModule.updateGuildSettings ? dbModule.updateGuildSettings : updateGuildSettings,
  setGuildSettings: dbModule.setGuildSettings,
  deleteGuildSettings: dbModule.deleteGuildSettings,
  getGuildCount: dbModule.getGuildCount,
  saveUserData: dbModule.saveUserData,
  getUserData: dbModule.getUserData,
  firestore: dbModule.firestore,
  admin: dbModule.admin,
  useFirebase
};

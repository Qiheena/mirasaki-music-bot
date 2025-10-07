// Firebase Admin SDK for persistent cloud database
const admin = require('firebase-admin');
const logger = require('@mirasaki/logger');
const chalk = require('chalk');
const { clientConfig } = require('../util');

// Initialize Firebase Admin
let firebaseInitialized = false;
let db;

function initializeFirebase() {
  if (firebaseInitialized) return;

  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    db = admin.firestore();
    firebaseInitialized = true;
    logger.success('Firebase initialized successfully');
  } catch (error) {
    logger.syserr('Failed to initialize Firebase:');
    logger.printErr(error);
    throw error;
  }
}

initializeFirebase();

const guildSettingsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function getGuildSettings(guildId) {
  const cached = guildSettingsCache.get(guildId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return JSON.parse(JSON.stringify(cached.data));
  }

  try {
    const docRef = db.collection('guilds').doc(guildId);
    const doc = await docRef.get();

    let settings;
    if (!doc.exists) {
      settings = {
        guildId,
        prefix: '!',
        volume: clientConfig.defaultVolume,
        repeatMode: clientConfig.defaultRepeatMode,
        musicChannelIds: [],
        useThreadSessions: clientConfig.defaultUseThreadSessions,
        threadSessionStrictCommandChannel: clientConfig.defaultThreadSessionStrictCommandChannel,
        leaveOnEndCooldown: clientConfig.defaultLeaveOnEndCooldown,
        leaveOnEmpty: clientConfig.defaultLeaveOnEmpty,
        leaveOnEmptyCooldown: clientConfig.defaultLeaveOnEmptyCooldown,
        djRoleIds: [],
        equalizer: 'null',
        autoDeleteDuration: 30,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await docRef.set(settings);
      logger.info(`Created new guild settings for ${guildId}`);
    } else {
      settings = doc.data();
      
      let needsUpdate = false;
      const defaults = {
        volume: clientConfig.defaultVolume,
        repeatMode: clientConfig.defaultRepeatMode,
        useThreadSessions: clientConfig.defaultUseThreadSessions,
        threadSessionStrictCommandChannel: clientConfig.defaultThreadSessionStrictCommandChannel,
        leaveOnEndCooldown: clientConfig.defaultLeaveOnEndCooldown,
        leaveOnEmpty: clientConfig.defaultLeaveOnEmpty,
        leaveOnEmptyCooldown: clientConfig.defaultLeaveOnEmptyCooldown,
        djRoleIds: [],
        equalizer: 'null',
        prefix: '!',
        autoDeleteDuration: 30,
        musicChannelIds: []
      };

      for (const [key, defaultValue] of Object.entries(defaults)) {
        if (typeof settings[key] === 'undefined') {
          settings[key] = defaultValue;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        const cleanedSettings = JSON.parse(JSON.stringify(settings));
        cleanedSettings.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        await docRef.set(cleanedSettings, { merge: true });
      }
    }

    guildSettingsCache.set(guildId, {
      data: JSON.parse(JSON.stringify(settings)),
      timestamp: Date.now()
    });

    return JSON.parse(JSON.stringify(settings));
  } catch (error) {
    logger.syserr(`Error getting guild settings for ${guildId}:`);
    logger.printErr(error);
    throw error;
  }
}

async function updateGuildSettings(guildId, updates) {
  try {
    const docRef = db.collection('guilds').doc(guildId);
    
    const cleanedUpdates = JSON.parse(JSON.stringify(updates));
    cleanedUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await docRef.set(cleanedUpdates, { merge: true });
    
    guildSettingsCache.delete(guildId);
    logger.debug(`Updated guild settings for ${guildId}`);
  } catch (error) {
    logger.syserr(`Error updating guild settings for ${guildId}:`);
    logger.printErr(error);
    guildSettingsCache.delete(guildId);
    throw error;
  }
}

async function setGuildSettings(guildId, settings) {
  try {
    const docRef = db.collection('guilds').doc(guildId);
    
    const cleanedSettings = JSON.parse(JSON.stringify(settings));
    cleanedSettings.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await docRef.set(cleanedSettings, { merge: true });
    
    guildSettingsCache.delete(guildId);
    logger.debug(`Set guild settings for ${guildId}`);
  } catch (error) {
    logger.syserr(`Error setting guild settings for ${guildId}:`);
    logger.printErr(error);
    guildSettingsCache.delete(guildId);
    throw error;
  }
}

async function deleteGuildSettings(guildId) {
  try {
    await db.collection('guilds').doc(guildId).delete();
    guildSettingsCache.delete(guildId);
    logger.info(`Deleted guild settings for ${guildId}`);
  } catch (error) {
    logger.syserr(`Error deleting guild settings for ${guildId}:`);
    logger.printErr(error);
    throw error;
  }
}

async function getGuildCount() {
  try {
    const snapshot = await db.collection('guilds').count().get();
    return snapshot.data().count;
  } catch (error) {
    logger.syserr('Error getting guild count:');
    logger.printErr(error);
    return 0;
  }
}

async function saveUserData(userId, guildId, data) {
  try {
    const docRef = db.collection('users').doc(userId).collection('guilds').doc(guildId);
    const cleanedData = JSON.parse(JSON.stringify(data));
    cleanedData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await docRef.set(cleanedData, { merge: true });
    logger.debug(`Saved user data for ${userId} in guild ${guildId}`);
  } catch (error) {
    logger.syserr(`Error saving user data for ${userId}:`);
    logger.printErr(error);
    throw error;
  }
}

async function getUserData(userId, guildId) {
  try {
    const docRef = db.collection('users').doc(userId).collection('guilds').doc(guildId);
    const doc = await docRef.get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    logger.syserr(`Error getting user data for ${userId}:`);
    logger.printErr(error);
    return null;
  }
}

const guildsCollection = {
  by: async (field, value) => {
    if (field === 'guildId') {
      return await getGuildSettings(value);
    }
    return null;
  },
  insertOne: async (doc) => {
    return await setGuildSettings(doc.guildId, doc);
  },
  update: async (doc) => {
    return await setGuildSettings(doc.guildId, doc);
  },
  count: async () => {
    return await getGuildCount();
  }
};

const mockDb = {
  getCollection: (name) => {
    if (name === 'guilds') {
      return guildsCollection;
    }
    return null;
  }
};

const saveDb = async (cb) => {
  if (typeof cb === 'function') {
    setImmediate(cb);
  }
};

module.exports = {
  db: mockDb,
  firestore: db,
  admin,
  saveDb,
  getGuildSettings,
  updateGuildSettings,
  setGuildSettings,
  deleteGuildSettings,
  getGuildCount,
  saveUserData,
  getUserData
};

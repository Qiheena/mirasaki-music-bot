// Database module - now using Firebase Firestore for cloud persistence
// Maintains backward compatibility with LokiJS interface

const logger = require('@mirasaki/logger');
const chalk = require('chalk');

// Check if Firebase credentials are available
const useFirebase = !!(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY &&
  process.env.FIREBASE_DATABASE_URL
);

let dbModule;

if (useFirebase) {
  // Use Firebase for production
  logger.info('Using Firebase Firestore for database');
  dbModule = require('./firebase-db');
} else {
  // Fallback to LokiJS for local development
  logger.warn('Firebase credentials not found, using LokiJS (local file storage)');
  
  const loki = require('lokijs');
  const fsAdapter = new loki.LokiFsAdapter();
  const pkg = require('../../package.json');
  const { clientConfig } = require('../util');

  // Initialize our db + collections
  const db = new loki(`${ pkg.name }.db`, {
    adapter: fsAdapter,
    env: 'NODEJS',
    autosave: true,
    autosaveInterval: 1800,
    autoload: true,
    autoloadCallback: initializeDatabase
  });

  function initializeDatabase (err) {
    if (err) {
      logger.syserr('Error encountered while loading database from disk persistence:');
      logger.printErr(err);
      return;
    }

    db.getCollection('guilds')
      ?? db.addCollection('guilds', { unique: [ 'guildId' ] });

    runProgramLogic();
  }

  const runProgramLogic = () => {
    const guildCount = db.getCollection('guilds').count();
    logger.success(`Initialized ${ chalk.yellowBright(guildCount) } guild setting document${ guildCount === 1 ? '' : 's' }`);
  };

  const saveDb = (cb) => db
    .saveDatabase((err) => {
      if (err) {
        logger.syserr('Error encountered while saving database to disk:');
        logger.printErr(err);
      }
      if (typeof cb === 'function') cb();
    });

  const getGuildSettings = (guildId) => {
    const guilds = db.getCollection('guilds');
    let settings = guilds.by('guildId', guildId);
    if (!settings) {
      guilds.insertOne({
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
        autoDeleteDuration: 30
      });
      settings = guilds.by('guildId', guildId);
    }

    let needsUpdate = false;

    if (typeof settings.volume === 'undefined') {
      settings.volume = clientConfig.defaultVolume;
      needsUpdate = true;
    }

    if (typeof settings.repeatMode === 'undefined') {
      settings.repeatMode = clientConfig.defaultRepeatMode;
      needsUpdate = true;
    }

    if (typeof settings.useThreadSessions === 'undefined') {
      settings.useThreadSessions = clientConfig.defaultUseThreadSessions;
      needsUpdate = true;
    }

    if (typeof settings.threadSessionStrictCommandChannel === 'undefined') {
      settings.threadSessionStrictCommandChannel = clientConfig.defaultThreadSessionStrictCommandChannel;
      needsUpdate = true;
    }

    if (typeof settings.leaveOnEndCooldown === 'undefined') {
      settings.leaveOnEndCooldown = clientConfig.defaultLeaveOnEndCooldown;
      needsUpdate = true;
    }

    if (typeof settings.djRoleIds === 'undefined') {
      settings.djRoleIds = [];
      needsUpdate = true;
    }

    if (typeof settings.equalizer === 'undefined') {
      settings.equalizer = 'null';
      needsUpdate = true;
    }

    if (typeof settings.leaveOnEmpty === 'undefined') {
      settings.leaveOnEmpty = clientConfig.defaultLeaveOnEmpty;
      needsUpdate = true;
    }

    if (typeof settings.leaveOnEmptyCooldown === 'undefined') {
      settings.leaveOnEmptyCooldown = clientConfig.defaultLeaveOnEmptyCooldown;
      needsUpdate = true;
    }

    if (typeof settings.prefix === 'undefined') {
      settings.prefix = '!';
      needsUpdate = true;
    }

    if (typeof settings.autoDeleteDuration === 'undefined') {
      settings.autoDeleteDuration = 30;
      needsUpdate = true;
    }

    if (needsUpdate) {
      guilds.update(settings);
      process.nextTick(() => saveDb());
    }

    return settings;
  };

  dbModule = {
    db,
    saveDb,
    getGuildSettings
  };
}

module.exports = dbModule;

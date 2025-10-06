// Use lokijs for database, a super fast in-memory
// javascript document oriented database with fs persistency.
const loki = require('lokijs');
const fsAdapter = new loki.LokiFsAdapter();
const pkg = require('../../package.json');
const logger = require('@mirasaki/logger');
const chalk = require('chalk');
const { clientConfig } = require('../util');

// Initialize our db + collections
const db = new loki(`${ pkg.name }.db`, {
  adapter: fsAdapter,
  env: 'NODEJS',
  autosave: true,
  autosaveInterval: 1800, // Reduced from 3600 (1 hour) to 1800 (30 minutes) for faster persistence
  autoload: true,
  autoloadCallback: initializeDatabase
});

// Implement the autoLoadCallback referenced in loki constructor
function initializeDatabase (err) {
  if (err) {
    logger.syserr('Error encountered while loading database from disk persistence:');
    logger.printErr(err);
    return;
  }

  // Resolve guilds collection
  db.getCollection('guilds')
    ?? db.addCollection('guilds', { unique: [ 'guildId' ] });

  // Kick off any program logic or start listening to external events
  runProgramLogic();
}

// example method with any bootstrap logic to run after database initialized
const runProgramLogic = () => {
  const guildCount = db.getCollection('guilds').count();
  logger.success(`Initialized ${ chalk.yellowBright(guildCount) } guild setting document${ guildCount === 1 ? '' : 's' }`);
};

// Utility function so save database as a reusable function
const saveDb = (cb) => db
  .saveDatabase((err) => {
    if (err) {
      logger.syserr('Error encountered while saving database to disk:');
      logger.printErr(err);
    }
    if (typeof cb === 'function') cb();
  });

// Utility function for resolving guild settings
const getGuildSettings = (guildId) => {
  const guilds = db.getCollection('guilds');
  let settings = guilds.by('guildId', guildId);
  if (!settings) {
    // [DEV] - Add config validation
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

  // Batch update settings - check all undefined values first
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

  // Only update and save once if any changes were made
  if (needsUpdate) {
    guilds.update(settings);
    // Save asynchronously to not block
    process.nextTick(() => saveDb());
  }

  return settings;
};

module.exports = {
  db,
  saveDb,
  getGuildSettings
};

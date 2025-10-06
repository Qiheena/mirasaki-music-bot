const logger = require('@mirasaki/logger');
const chalk = require('chalk');

module.exports = async (client) => {
  // Logging our process uptime to the developer
  const upTimeStr = chalk.yellow(`${ Math.floor(process.uptime()) || 1 } second(s)`);

  logger.success(`Client logged in as ${
    chalk.cyanBright(client.user.username)
  }${
    chalk.grey(`#${ client.user.discriminator }`)
  } after ${ upTimeStr }`);

  // Initialize Lavalink if enabled
  if (process.env.USE_LAVALINK === 'true') {
    try {
      const { initializeLavalink } = require('../../lavalink-setup');
      client.lavalink = initializeLavalink(client);
      await client.lavalink.init(client.user);
      logger.success('Lavalink initialized successfully');
    } catch (error) {
      logger.syserr('Failed to initialize Lavalink:');
      logger.printErr(error);
      logger.warn('Bot will continue without Lavalink. Music commands may not work properly.');
    }
  }

  // Calculating the membercount
  const memberCount = client.guilds.cache.reduce(
    (previousValue, currentValue) => previousValue += currentValue.memberCount, 0
  ).toLocaleString('en-US');

  // Getting the server count
  const serverCount = (client.guilds.cache.size).toLocaleString('en-US');

  // Logging counts to developers
  logger.info(`Ready to serve ${ memberCount } members across ${ serverCount } servers!`);
};

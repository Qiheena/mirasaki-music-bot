// Require our shared environmental file as early as possible
require('dotenv').config();

// Importing from packages
const chalk = require('chalk');
const logger = require('@mirasaki/logger');
let express;

// Try to import express
try {
  express = require('express');
}
catch (err) {
  logger.syserr('You have enabled "USE_API" in the .env file, but missing the "express" dependency, to address this - run the "npm install express" command. This is done to minimize dependencies as most users don\'t require the command API');
  process.exit(1);
}

// Importing our routes
const commandRoutes = require('./commands.routes');

// Destructure from our environmental file
// Set our default port to 3000 if it's missing from environmental file
const { NODE_ENV, PORT = 3000 } = process.env;

/***
 * Initialize our express app
 */
const app = express();

// Routes Middleware
// Health check endpoint for Render
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'RasaVedic Music Bot'
  });
});

// Additional health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

app.use('/api/commands', commandRoutes);

// Serving our generated client documentation as root
app.use(
  '/',
  express.static('docs', { extensions: [ 'html' ] })
);

// Serving our static public files
app.use(express.static('public'));

// Actively listen for requests to our API/backend
// Bind to 0.0.0.0 for Render/cloud deployment compatibility
app.listen(
  PORT,
  '0.0.0.0',
  () => logger.success(chalk.yellow.bold(`API running in ${ NODE_ENV }-mode on port ${ PORT }`))
);

// logger.js
// This module provides a single function to log all whitelist actions

const { TextChannel } = require('discord.js');

// Hard-coded ID of your logging channel
const LOG_CHANNEL_ID = '1401279235284406312';

/**
 * @typedef {'STARTUP'|'CHECK'|'CHECK_USER'|'ADD_USER'|'REMOVE_USER'|'ADD_FAIL'|'REMOVE_FAIL'|'AUTH_FAIL'|'INPUT_FAIL'|'TARGET_FAIL'|'ERROR'} LogType
 */

/**
 * Initialize the logger with your Discord client
 * @param {import('discord.js').Client} client
 * @returns {(type: LogType, details: Record<string, any>) => Promise<void>}
 */
module.exports = (client) => async (type, details) => {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (!(channel instanceof TextChannel)) return;

    const timestamp = new Date().toISOString();
    let message = `**[${timestamp}]** **${type}**`;

    for (const [key, value] of Object.entries(details)) {
      message += `\n• **${key}:** ${value}`;
    }

    await channel.send(message);
  } catch (err) {
    console.error('Logger error:', err);
  }
};

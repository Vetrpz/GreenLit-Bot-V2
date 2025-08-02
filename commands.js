const { SlashCommandBuilder } = require('discord.js');

module.exports = [
  new SlashCommandBuilder()
    .setName('checkmywhitelist')
    .setDescription('Check what systems you’re whitelisted for (via RoWifi)'),

  new SlashCommandBuilder()
    .setName('checkuser')
    .setDescription('Check if a user is whitelisted')
    .addStringOption(option =>
      option.setName('robloxid')
        .setDescription('Enter a Roblox user ID')
        .setRequired(false))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Tag a Discord user')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('adduser')
    .setDescription('Add a user to a whitelist')
    .addStringOption(option =>
      option.setName('robloxid')
        .setDescription('Roblox user ID')
        .setRequired(false))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Discord user tag')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('system')
        .setDescription('System to add to')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('removeuser')
    .setDescription('Remove a user from a whitelist')
    .addStringOption(option =>
      option.setName('robloxid')
        .setDescription('Roblox user ID')
        .setRequired(false))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Discord user tag')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('system')
        .setDescription('System to remove from')
        .setRequired(false)),
];

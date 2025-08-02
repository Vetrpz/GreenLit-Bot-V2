require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const createLogger = require('./logger');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const log = createLogger(client);
const OWNER_ID = process.env.OWNER_ID;

const SYSTEMS = {
  BLASTERS: process.env.WHITELIST_BLASTERS_URL,
  LIGHTSABER: process.env.WHITELIST_LIGHTSABER_URL,
  MORPH: process.env.WHITELIST_MORPH_URL,
  STARFIGHTERS: process.env.WHITELIST_STARFIGHTERS_URL,
  UTILITIES: process.env.WHITELIST_UTILITIES_URL,
};

client.once('ready', () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
  log('STARTUP', { info: `Bot started as ${client.user.tag}` });
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = interaction.commandName;
  const executor = interaction.user.tag;
  const userId = interaction.user.id;
  const isOwner = userId === OWNER_ID;

  // /checkmywhitelist
  if (cmd === 'checkmywhitelist') {
    await interaction.deferReply({ ephemeral: true });
    try {
      const res = await axios.get(
        `https://api.rowifi.xyz/v3/guilds/${process.env.GUILD_ID}/members/${userId}`,
        { headers: { Authorization: `Bot ${process.env.ROWIFI_TOKEN}` } }
      );
      const robloxId = res.data.roblox_id;
      if (!robloxId) {
        await interaction.editReply({ content: "❌ You're not verified with RoWifi." });
        log('CHECK', { executor, platformId: userId, result: 'not verified' });
        return;
      }

      let reply = `🎯 **Roblox ID:** \`${robloxId}\`\n\n`;
      for (const [system, url] of Object.entries(SYSTEMS)) {
        try {
          const check = await axios.get(url);
          const has = check.data.includes(String(robloxId));
          reply += has ? `✅ ${system}\n` : `❌ ${system}\n`;
        } catch {
          reply += `⚠️ ${system} (load fail)\n`;
        }
      }
      await interaction.editReply({ content: reply });
      log('CHECK', { executor, robloxId, result: 'completed' });
    } catch (error) {
      await interaction.editReply({ content: "⚠️ Error fetching from RoWifi." });
      log('ERROR', { executor, context: '/checkmywhitelist', error: error.message });
    }
    return;
  }

  // Admin-only commands
  if (!isOwner) {
    interaction.reply({ content: "❌ You're not authorized to use this command.", ephemeral: true });
    log('AUTH_FAIL', { executor, attempted: cmd });
    return;
  }

  const discordUser = interaction.options.getUser('user');
  const manualRobloxId = interaction.options.getString('robloxid');
  if (!manualRobloxId && !discordUser) {
    interaction.reply({ content: '❌ Provide a Roblox ID or tag a Discord user.', ephemeral: true });
    log('INPUT_FAIL', { executor, cmd, reason: 'no target provided' });
    return;
  }

  let targetRobloxId, targetDiscordTag;
  if (manualRobloxId) {
    targetRobloxId = manualRobloxId;
    targetDiscordTag = 'Manual Entry';
  } else {
    const targetDiscordId = discordUser.id;
    targetDiscordTag = `<@${targetDiscordId}>`;
    const robloxRes = await axios.get(
      `https://api.rowifi.xyz/v3/guilds/${process.env.GUILD_ID}/members/${targetDiscordId}`,
      { headers: { Authorization: `Bot ${process.env.ROWIFI_TOKEN}` } }
    ).catch(() => null);
    if (!robloxRes || !robloxRes.data.roblox_id) {
      interaction.reply({ content: `❌ ${targetDiscordTag} not verified.`, ephemeral: true });
      log('TARGET_FAIL', { executor, cmd, target: targetDiscordTag, reason: 'not verified' });
      return;
    }
    targetRobloxId = String(robloxRes.data.roblox_id);
  }

  // /checkuser
  if (cmd === 'checkuser') {
    await interaction.deferReply({ ephemeral: true });
    let reply = `🎯 **${targetDiscordTag} → Roblox ID:** \`${targetRobloxId}\`\n\n`;
    for (const [system, url] of Object.entries(SYSTEMS)) {
      try {
        const res = await axios.get(url);
        const has = res.data.includes(String(targetRobloxId));
        reply += has ? `✅ ${system}\n` : `❌ ${system}\n`;
      } catch {
        reply += `⚠️ ${system} (load fail)\n`;
      }
    }
    await interaction.editReply({ content: reply });
    log('CHECK_USER', { executor, target: targetDiscordTag, robloxId: targetRobloxId });
    return;
  }

  // /adduser and /removeuser
  const systemKey = interaction.options.getString('system');
  if (!systemKey) {
    interaction.reply({ content: '❌ Specify a system.', ephemeral: true });
    log('INPUT_FAIL', { executor, cmd, reason: 'no system specified' });
    return;
  }

  const apiUrl = `https://api.github.com/repos/${process.env.GITHUB_REPO}/contents/${systemKey.charAt(0) + systemKey.slice(1).toLowerCase()}.json`;

  try {
    const ghRes = await axios.get(apiUrl, { headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` } });
    const fileContent = Buffer.from(ghRes.data.content, 'base64').toString();
    let list = JSON.parse(fileContent).map(id => Number(id));
    const robloxNum = Number(targetRobloxId);

    if (cmd === 'adduser') {
      if (list.includes(robloxNum)) {
        interaction.reply({ content: '⚠️ Already in list.', ephemeral: true });
        log('ADD_FAIL', { executor, robloxNum, system: systemKey, reason: 'exists' });
        return;
      }
      list.unshift(robloxNum);
    } else {
      if (!list.includes(robloxNum)) {
        interaction.reply({ content: '⚠️ Not in list.', ephemeral: true });
        log('REMOVE_FAIL', { executor, robloxNum, system: systemKey, reason: 'missing' });
        return;
      }
      list = list.filter(id => id !== robloxNum);
    }

    const sha = ghRes.data.sha;
    await axios.put(apiUrl, {
      message: `${cmd.toUpperCase()} ${robloxNum} in ${systemKey}`,
      content: Buffer.from(JSON.stringify(list, null, 2)).toString('base64'),
      sha: sha
    }, { headers: { Authorization: `token ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json' } });

    interaction.reply({ content: `✅ ${cmd === 'adduser' ? 'Added' : 'Removed'} \`${robloxNum}\` ${cmd === 'adduser' ? 'to' : 'from'} **${systemKey}**`, ephemeral: true });
    log(cmd === 'adduser' ? 'ADD_USER' : 'REMOVE_USER', { executor, robloxNum, system: systemKey });
  } catch (err) {
    console.error(err);
    interaction.reply({ content: '❌ Update failed.', ephemeral: true });
    log('ERROR', { executor, cmd, error: err.message });
  }
});

client.login(process.env.DISCORD_TOKEN);

const { ComponentCommand } = require('../../classes/Commands');
const { getGuildSettings, saveDb, db } = require('../../modules/db');
const { createSuccessEmbed, createErrorEmbed, createInfoEmbed } = require('../../modules/embed-utils');

module.exports = new ComponentCommand({
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild, customId, channel } = interaction;

    // Parse customId: prefix_guild_{userId}_{newPrefix}
    const parts = customId.split('_');
    const userId = parts[2];
    const newPrefix = parts.slice(3).join('_');

    // Check if the button was clicked by the right user
    if (member.id !== userId) {
      const errorEmbed = createErrorEmbed(`${emojis.error} This button is not for you!`);
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    // Check if user has permissions (Administrator or Moderator role or Server Owner)
    const isOwner = guild.ownerId === member.id;
    const isAdmin = member.permissions.has('Administrator');
    const settings = await getGuildSettings(guild.id);
    const djRoles = settings.djRoleIds || [];
    const hasDJRole = djRoles.some(roleId => member.roles.cache.has(roleId));

    if (!isOwner && !isAdmin && !hasDJRole) {
      const errorEmbed = createErrorEmbed(`${emojis.error} ${member}, you need to be a Server Owner, Administrator, or have a DJ role to change the server prefix!`);
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    try {
      // Update guild prefix
      const guilds = db.getCollection('guilds');
      settings.prefix = newPrefix;
      await guilds.update(settings);
      await saveDb();

      // Update the interaction message
      const successEmbed = createSuccessEmbed(`${emojis.success} ${member}, server prefix has been updated to \`${newPrefix}\`!`);
      await interaction.update({ embeds: [successEmbed], components: [] });

      // Send announcement to the channel
      const announcementEmbed = createInfoEmbed([
        `📢 **Server Prefix Updated!**`,
        '',
        `Hello @everyone! The server prefix has been changed to: **\`${newPrefix}\`**`,
        '',
        `🎵 You can now use commands like:`,
        `• \`${newPrefix}play <song>\` - Play music`,
        `• \`${newPrefix}queue\` - View queue`,
        `• \`${newPrefix}skip\` - Skip song`,
        `• \`${newPrefix}help\` - View all commands`,
        '',
        `💡 **Pro Tip:** You can also set a personal prefix using \`/setprefix\` and choosing "Personal Prefix"`,
        '',
        `Changed by: ${member}`
      ].join('\n'));

      await channel.send({ embeds: [announcementEmbed] });
    } catch (e) {
      const errorEmbed = createErrorEmbed(`${emojis.error} ${member}, something went wrong:\n\n${e.message}`);
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
});

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType } = require('discord.js');
const AllowedChannels = require('../../settings/models/AllowedChannels');
const WhitelistRoles = require('../../settings/models/WhitelistRoles');
const AccessControlRoles = require('../../settings/models/AccessControlRoles');
const RoleAccessControl = require('../../utils/roleAccessControl');

module.exports = {
    name: ["manage-channels"],
    description: "🔧 Manage allowed channels for bot commands (Admin only)",
    run: async (interaction, client) => {
        try {
            // Check if user has administrator permission
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                const noPermEmbed = new EmbedBuilder()
                    .setDescription("❌ **Access Denied**\n\nYou need **Administrator** permission to use this command.")
                    .setColor("#ff0000");
                await interaction.reply({ embeds: [noPermEmbed], flags: 64 });
                return;
            }

            // Create main menu
            const mainMenu = new StringSelectMenuBuilder()
                .setCustomId('manage_channels_menu')
                .setPlaceholder('Choose an action...')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Add Allowed Channel')
                        .setValue('add_channel')
                        .setDescription('Add a channel to the allowed list')
                        .setEmoji('✅'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Remove Allowed Channel')
                        .setValue('remove_channel')
                        .setDescription('Remove a channel from the allowed list')
                        .setEmoji('❌'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('List Allowed Channels')
                        .setValue('list_channels')
                        .setDescription('View all currently allowed channels')
                        .setEmoji('📋'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Enable All Channels')
                        .setValue('enable_all')
                        .setDescription('Remove all restrictions (allow all channels)')
                        .setEmoji('🌐'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Reset (Disable All)')
                        .setValue('reset')
                        .setDescription('Clear all allowed channels (disable bot in all channels)')
                        .setEmoji('🔒'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Add Whitelist Role')
                        .setValue('add_whitelist_role')
                        .setDescription('Add a role that bypasses anti-spam restrictions')
                        .setEmoji('⚪'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Remove Whitelist Role')
                        .setValue('remove_whitelist_role')
                        .setDescription('Remove a role from anti-spam whitelist')
                        .setEmoji('⚫'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('List Whitelist Roles')
                        .setValue('list_whitelist_roles')
                        .setDescription('View all whitelisted roles')
                        .setEmoji('📝'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Add Access Role')
                        .setValue('add_access_role')
                        .setDescription('Add a role that can use bot commands')
                        .setEmoji('🔑'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Remove Access Role')
                        .setValue('remove_access_role')
                        .setDescription('Remove a role from bot access')
                        .setEmoji('🚫'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('List Access Roles')
                        .setValue('list_access_roles')
                        .setDescription('View all roles that can use the bot')
                        .setEmoji('👥'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Auto-Promo Status')
                        .setValue('autopromo_status')
                        .setDescription('View auto-promotional system status')
                        .setEmoji('📊'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Prefetch Queue Status')
                        .setValue('prefetch_queue_status')
                        .setDescription('View DB-backed prefetch queue depths and samples')
                        .setEmoji('🧾'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Start Auto-Promo')
                        .setValue('autopromo_start')
                        .setDescription('Start the auto-promotional system')
                        .setEmoji('▶️'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Stop Auto-Promo')
                        .setValue('autopromo_stop')
                        .setDescription('Stop the auto-promotional system')
                        .setEmoji('⏹️')
                );

            const row = new ActionRowBuilder().addComponents(mainMenu);

            // Get current status
            const allowedChannels = await AllowedChannels.find({
                guildId: interaction.guild.id,
                isActive: true
            });

            const whitelistRoles = await WhitelistRoles.find({
                guildId: interaction.guild.id,
                isActive: true
            });

            const accessRoles = await AccessControlRoles.find({
                guildId: interaction.guild.id,
                isActive: true
            });

            const statusText = allowedChannels.length === 0 
                ? "🌐 **All channels enabled** - No restrictions set"
                : `🔒 **Restricted mode** - Commands allowed in ${allowedChannels.length} channel(s)`;

            const whitelistText = whitelistRoles.length === 0
                ? "⚫ **No whitelist roles** - Anti-spam applies to all users"
                : `⚪ **${whitelistRoles.length} whitelist role(s)** - Can bypass anti-spam restrictions`;

            const accessText = accessRoles.length === 0
                ? "🔓 **No access restrictions** - All users can use the bot"
                : `🔑 **${accessRoles.length} access role(s)** - Only these roles can use bot commands`;

            const embed = new EmbedBuilder()
                .setTitle('🔧 Channel & Role Management')
                .setDescription(`**Current Status:**\n${statusText}\n${whitelistText}\n${accessText}\n\n` +
                               `**Channel Features:**\n` +
                               `• ✅ Add/remove channel permissions\n` +
                               `• 📋 View allowed channels list\n` +
                               `• 🌐 Enable all channels at once\n` +
                               `• 🔒 Disable all channels (reset)\n\n` +
                               `**Anti-Spam Whitelist:**\n` +
                               `• ⚪ Add roles that bypass anti-spam\n` +
                               `• ⚫ Remove whitelist roles\n` +
                               `• 📝 View whitelisted roles\n\n` +
                               `**Bot Access Control:**\n` +
                               `• 🔑 Add roles that can use bot commands\n` +
                               `• 🚫 Remove access roles\n` +
                               `• 👥 View all access roles\n\n` +
                               `**Select an action from the menu below:**`)
                .setColor('#0099ff')
                .setFooter({ text: 'Administrator permission required • Auto-delete: 30s' });

            await interaction.reply({ embeds: [embed], components: [row] });

            // Handle menu selection
            const filter = i => i.customId === 'manage_channels_menu' && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                try {
                    await i.deferUpdate();
                    
                    const selection = i.values[0];
                    
                    switch (selection) {
                        case 'add_channel':
                            await handleAddChannel(i, interaction, client);
                            break;
                        case 'remove_channel':
                            await handleRemoveChannel(i, interaction, client);
                            break;
                        case 'list_channels':
                            await handleListChannels(i, interaction, client);
                            break;
                        case 'enable_all':
                            await handleEnableAll(i, interaction, client);
                            break;
                        case 'reset':
                            await handleReset(i, interaction, client);
                            break;
                        case 'add_whitelist_role':
                            await handleAddWhitelistRole(i, interaction, client);
                            break;
                        case 'remove_whitelist_role':
                            await handleRemoveWhitelistRole(i, interaction, client);
                            break;
                        case 'list_whitelist_roles':
                            await handleListWhitelistRoles(i, interaction, client);
                            break;
                        case 'add_access_role':
                            await handleAddAccessRole(i, interaction, client);
                            break;
                        case 'remove_access_role':
                            await handleRemoveAccessRole(i, interaction, client);
                            break;
                        case 'list_access_roles':
                            await handleListAccessRoles(i, interaction, client);
                            break;
                        case 'autopromo_status':
                            await handleAutoPromoStatus(i, interaction, client);
                            break;
                            case 'prefetch_queue_status':
                                await handlePrefetchQueueStatus(i, interaction, client);
                                break;
                        case 'autopromo_start':
                            await handleAutoPromoStart(i, interaction, client);
                            break;
                        case 'autopromo_stop':
                            await handleAutoPromoStop(i, interaction, client);
                            break;
                        default:
                            const errorEmbed = new EmbedBuilder()
                                .setDescription("❌ Unknown selection.")
                                .setColor("#ff0000");
                            await i.editReply({ embeds: [errorEmbed], components: [] });
                    }
                } catch (error) {
                    console.error('Error handling menu selection:', error);
                    const errorEmbed = new EmbedBuilder()
                        .setDescription("❌ An error occurred while processing your request.")
                        .setColor("#ff0000");
                    await i.editReply({ embeds: [errorEmbed], components: [] }).catch(console.error);
                }
            });

            collector.on('end', async collected => {
                if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setDescription("⏰ Menu timed out. Please run the command again.")
                        .setColor("#ffaa00");
                    await interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(console.error);
                }
            });
        } catch (error) {
            console.error('Error in manage-channels command:', error);
            const errorEmbed = new EmbedBuilder()
                .setDescription("❌ An error occurred while setting up the command.")
                .setColor("#ff0000");
            
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(console.error);
            } else {
                await interaction.reply({ embeds: [errorEmbed], flags: 64 }).catch(console.error);
            }
        }
    }
};

// Helper functions
async function handleAddChannel(i, interaction, client) {
    // Get all text channels in the guild
    const textChannels = interaction.guild.channels.cache
        .filter(channel => channel.type === ChannelType.GuildText)
        .sort((a, b) => a.position - b.position);

    if (textChannels.size === 0) {
        const errorEmbed = new EmbedBuilder()
            .setDescription("❌ No text channels found in this server.")
            .setColor("#ff0000");
        await i.editReply({ embeds: [errorEmbed], components: [] });
        return;
    }

    // Get currently allowed channels
    const allowedChannels = await AllowedChannels.find({
        guildId: interaction.guild.id,
        isActive: true
    });

    const allowedChannelIds = allowedChannels.map(ac => ac.channelId);

    // Create options for channels not yet allowed
    const availableChannels = textChannels.filter(channel => !allowedChannelIds.includes(channel.id));

    if (availableChannels.size === 0) {
        const errorEmbed = new EmbedBuilder()
            .setDescription("✅ All text channels are already allowed for bot commands.")
            .setColor("#00ff00");
        await i.editReply({ embeds: [errorEmbed], components: [] });
        return;
    }

    const channelOptions = availableChannels.first(25).map(channel => // Discord limit of 25 options
        new StringSelectMenuOptionBuilder()
            .setLabel(`#${channel.name}`)
            .setValue(channel.id)
            .setDescription(`Add this channel to allowed list`)
            .setEmoji("✅")
    );

    const channelSelectMenu = new StringSelectMenuBuilder()
        .setCustomId("add_channel_select")
        .setPlaceholder("Select a channel to allow...")
        .addOptions(channelOptions);

    const channelRow = new ActionRowBuilder().addComponents(channelSelectMenu);

    const addEmbed = new EmbedBuilder()
        .setTitle("✅ Add Allowed Channel")
        .setDescription(`**Select a channel to allow bot commands**\n\n` +
                       `Currently **${allowedChannels.length}** channels are allowed.\n` +
                       `**${availableChannels.size}** channels can still be added.\n\n` +
                       `Select a channel from the menu below:`)
        .setColor("#00ff00");

    await i.editReply({ embeds: [addEmbed], components: [channelRow] });

    // Handle channel selection
    const channelFilter = channel_i => channel_i.customId === 'add_channel_select' && channel_i.user.id === interaction.user.id;
    const channelCollector = interaction.channel.createMessageComponentCollector({ filter: channelFilter, time: 60000 });

    channelCollector.on('collect', async channel_i => {
        try {
            await channel_i.deferUpdate();
            
            const channelId = channel_i.values[0];
            const channel = interaction.guild.channels.cache.get(channelId);

            if (!channel) {
                const errorEmbed = new EmbedBuilder()
                    .setDescription("❌ Channel not found.")
                    .setColor("#ff0000");
                await channel_i.editReply({ embeds: [errorEmbed], components: [] });
                return;
            }

            // Add channel to allowed list
            await AllowedChannels.create({
                guildId: interaction.guild.id,
                channelId: channelId,
                channelName: channel.name,
                addedBy: interaction.user.id,
                addedAt: new Date(),
                isActive: true
            });

            const successEmbed = new EmbedBuilder()
                .setDescription(`✅ **Channel added successfully**\n\n` +
                               `**Channel:** ${channel}\n` +
                               `**Added by:** ${interaction.user}\n\n` +
                               `Bot commands are now allowed in this channel.`)
                .setColor("#00ff00");

            await channel_i.editReply({ embeds: [successEmbed], components: [] });
            
        } catch (error) {
            console.error('Error adding channel:', error);
            const errorEmbed = new EmbedBuilder()
                .setDescription("❌ An error occurred while adding the channel.")
                .setColor("#ff0000");
            await channel_i.editReply({ embeds: [errorEmbed], components: [] }).catch(console.error);
        }
    });
}

async function handleRemoveChannel(i, interaction, client) {
    const allowedChannels = await AllowedChannels.find({
        guildId: interaction.guild.id,
        isActive: true
    });

    if (allowedChannels.length === 0) {
        const errorEmbed = new EmbedBuilder()
            .setDescription("📋 No channels are currently in the allowed list.\n\nBot commands work in all channels when no restrictions are set.")
            .setColor("#ffaa00");
        await i.editReply({ embeds: [errorEmbed], components: [] });
        return;
    }

    const channelOptions = allowedChannels.map(allowedChannel => {
        const channel = interaction.guild.channels.cache.get(allowedChannel.channelId);
        const channelName = channel ? channel.name : 'Unknown Channel';
        
        return new StringSelectMenuOptionBuilder()
            .setLabel(`#${channelName}`)
            .setValue(allowedChannel._id.toString())
            .setDescription(`Remove this channel from allowed list`)
            .setEmoji("❌");
    });

    const channelSelectMenu = new StringSelectMenuBuilder()
        .setCustomId("remove_channel_select")
        .setPlaceholder("Select a channel to remove...")
        .addOptions(channelOptions);

    const channelRow = new ActionRowBuilder().addComponents(channelSelectMenu);

    const removeEmbed = new EmbedBuilder()
        .setTitle("❌ Remove Allowed Channel")
        .setDescription(`**Select a channel to remove from allowed list**\n\n` +
                       `Currently **${allowedChannels.length}** channels are allowed.\n\n` +
                       `Select a channel from the menu below:`)
        .setColor("#ff0000");

    await i.editReply({ embeds: [removeEmbed], components: [channelRow] });

    // Handle channel selection
    const channelFilter = channel_i => channel_i.customId === 'remove_channel_select' && channel_i.user.id === interaction.user.id;
    const channelCollector = interaction.channel.createMessageComponentCollector({ filter: channelFilter, time: 60000 });

    channelCollector.on('collect', async channel_i => {
        try {
            await channel_i.deferUpdate();
            
            const allowedChannelId = channel_i.values[0];
            const allowedChannel = allowedChannels.find(ac => ac._id.toString() === allowedChannelId);

            if (!allowedChannel) {
                const errorEmbed = new EmbedBuilder()
                    .setDescription("❌ Allowed channel not found.")
                    .setColor("#ff0000");
                await channel_i.editReply({ embeds: [errorEmbed], components: [] });
                return;
            }

            // Remove channel from allowed list
            await AllowedChannels.findByIdAndDelete(allowedChannelId);

            const channel = interaction.guild.channels.cache.get(allowedChannel.channelId);
            const channelName = channel ? `#${channel.name}` : `#${allowedChannel.channelName}`;

            const successEmbed = new EmbedBuilder()
                .setDescription(`❌ **Channel removed successfully**\n\n` +
                               `**Channel:** ${channelName}\n` +
                               `**Removed by:** ${interaction.user}\n\n` +
                               `Bot commands are no longer allowed in this channel.`)
                .setColor("#ff0000");

            await channel_i.editReply({ embeds: [successEmbed], components: [] });
            
        } catch (error) {
            console.error('Error removing channel:', error);
            const errorEmbed = new EmbedBuilder()
                .setDescription("❌ An error occurred while removing the channel.")
                .setColor("#ff0000");
            await channel_i.editReply({ embeds: [errorEmbed], components: [] }).catch(console.error);
        }
    });
}

// Prefetch queue status - admin-only
async function handlePrefetchQueueStatus(i, interaction, client) {
    try {
        // If the interaction was already acknowledged (deferUpdate called by the menu handler),
        // we must not call deferReply again — use followUp instead.
        const alreadyAck = Boolean(i.deferred || i.replied);
        if (!alreadyAck) await i.deferReply({ ephemeral: true });
    const axios = require('axios');
    const PrefetchedLink = require('../../settings/models/PrefetchedLink');
        // Summarize counts by category for redgifs
        const agg = await PrefetchedLink.aggregate([
            { $match: { source: 'redgifs' } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).limit(50).exec();

        if (!agg || agg.length === 0) {
            const emptyEmbed = new EmbedBuilder().setDescription('✅ Prefetch queue is empty for Redgifs.').setColor('#00ff00');
            await i.editReply({ embeds: [emptyEmbed] });
            return;
        }

        const fields = [];
        for (const row of agg) {
            const cat = row._id || 'unknown';
            const cnt = row.count || 0;
            // fetch up to 3 sample URLs for this category
            const samples = await PrefetchedLink.find({ source: 'redgifs', category: cat }).sort({ fetchedAt: 1 }).limit(3).lean();
            const urls = samples.map(s => s.url).join('\n');
            fields.push({ name: `${cat} (${cnt})`, value: urls || 'No sample URLs', inline: false });
        }

        const embed = new EmbedBuilder()
            .setTitle('Prefetch Queue Status (Redgifs)')
            .setColor('#0099ff')
            .setDescription('Counts and up to 3 sample URLs per category')
            .addFields(fields.slice(0, 24)); // Discord embed limit

        // Post ephemeral reply to the admin. Use followUp when already acknowledged.
        if (i.deferred || i.replied) {
            await i.followUp({ embeds: [embed], ephemeral: true });
        } else {
            await i.editReply({ embeds: [embed] });
        }

        // Also POST a compact summary to the configured GUILD_LOGS webhook for visibility
        try {
            const webhook = process.env.GUILD_LOGS;
            if (webhook) {
                const content = agg.slice(0, 20).map(r => `${r._id}: ${r.count}`).join('\n');
                await axios.post(webhook, { content: `Prefetch Queue Summary (Redgifs)\n\n${content}` }).catch(() => null);
            }
        } catch (e) { /* ignore webhook failures */ }
    } catch (err) {
        console.error('Error fetching prefetch queue status:', err);
        const errorEmbed = new EmbedBuilder().setDescription('❌ Failed to fetch prefetch queue status').setColor('#ff0000');
        try { await i.editReply({ embeds: [errorEmbed] }); } catch (e) { console.error(e); }
    }
}

async function handleListChannels(i, interaction, client) {
    const allowedChannels = await AllowedChannels.find({
        guildId: interaction.guild.id,
        isActive: true
    }).sort({ addedAt: -1 });

    if (allowedChannels.length === 0) {
        const listEmbed = new EmbedBuilder()
            .setTitle("📋 Allowed Channels")
            .setDescription("**No channel restrictions are currently set**\n\n" +
                           "🌐 Bot commands work in **all channels**\n\n" +
                           "Use this command to add channel restrictions if needed.")
            .setColor("#00ff00");
        await i.editReply({ embeds: [listEmbed], components: [] });
        return;
    }

    const listEmbed = new EmbedBuilder()
        .setTitle("📋 Allowed Channels")
        .setDescription(`**Bot commands are restricted to these ${allowedChannels.length} channels:**\n\n` +
                       allowedChannels.map((allowedChannel, index) => {
                           const channel = interaction.guild.channels.cache.get(allowedChannel.channelId);
                           const channelName = channel ? channel.toString() : `#${allowedChannel.channelName} (deleted)`;
                           const addedBy = interaction.guild.members.cache.get(allowedChannel.addedBy);
                           const addedByName = addedBy ? addedBy.user.username : 'Unknown';
                           return `${index + 1}. ${channelName}\n   Added by: ${addedByName} • ${new Date(allowedChannel.addedAt).toLocaleDateString()}`;
                       }).join('\n\n'))
        .setColor("#00ff00")
        .setFooter({ text: `${allowedChannels.length} allowed channels • Commands auto-delete after 30s` });

    await i.editReply({ embeds: [listEmbed], components: [] });
}

async function handleEnableAll(i, interaction, client) {
    const safeMode = String(process.env.DISABLE_DESTRUCTIVE_ACTIONS || 'false').toLowerCase() === 'true';
    if (safeMode) {
        const blockedEmbed = new EmbedBuilder()
            .setDescription("⚠️ Bulk-enable blocked by server safety settings (DISABLE_DESTRUCTIVE_ACTIONS=true). Please temporarily disable this flag to perform bulk operations.")
            .setColor("#ffaa00");
        await i.editReply({ embeds: [blockedEmbed], components: [] });
        return;
    }

    const deleteResult = await AllowedChannels.deleteMany({ guildId: interaction.guild.id });

    const enableEmbed = new EmbedBuilder()
        .setDescription(`🌐 **All channels enabled**\n\n` +
                       `**Removed:** ${deleteResult.deletedCount} channel restriction(s)\n\n` +
                       `✅ Bot commands now work in **all channels**\n` +
                       `🕐 All responses still auto-delete after 30 seconds`)
        .setColor("#00ff00");

    await i.editReply({ embeds: [enableEmbed], components: [] });
}

async function handleReset(i, interaction, client) {
    const safeMode = String(process.env.DISABLE_DESTRUCTIVE_ACTIONS || 'false').toLowerCase() === 'true';
    if (safeMode) {
        const blockedEmbed = new EmbedBuilder()
            .setDescription("⚠️ Reset (clear) blocked by server safety settings (DISABLE_DESTRUCTIVE_ACTIONS=true). Please temporarily disable this flag to perform bulk operations.")
            .setColor("#ffaa00");
        await i.editReply({ embeds: [blockedEmbed], components: [] });
        return;
    }

    const deleteResult = await AllowedChannels.deleteMany({ guildId: interaction.guild.id });

    const resetEmbed = new EmbedBuilder()
        .setDescription(`🔒 **Reset to restricted mode**\n\n` +
                       `**Cleared:** ${deleteResult.deletedCount} channel(s)\n\n` +
                       `⚠️ Bot commands are now **disabled in all channels**\n` +
                       `Use this command to add allowed channels.`)
        .setColor("#ff0000");

    await i.editReply({ embeds: [resetEmbed], components: [] });
}

// Whitelist Role Management Functions
async function handleAddWhitelistRole(i, interaction, client) {
    // Get all roles in the guild except @everyone
    const roles = interaction.guild.roles.cache
        .filter(role => role.id !== interaction.guild.id && !role.managed)
        .sort((a, b) => b.position - a.position);

    if (roles.size === 0) {
        const errorEmbed = new EmbedBuilder()
            .setDescription("❌ No suitable roles found in this server.")
            .setColor("#ff0000");
        await i.editReply({ embeds: [errorEmbed], components: [] });
        return;
    }

    // Get currently whitelisted roles
    const whitelistRoles = await WhitelistRoles.find({
        guildId: interaction.guild.id,
        isActive: true
    });

    const whitelistRoleIds = whitelistRoles.map(wr => wr.roleId);

    // Create options for roles not yet whitelisted
    const availableRoles = roles.filter(role => !whitelistRoleIds.includes(role.id));

    if (availableRoles.size === 0) {
        const errorEmbed = new EmbedBuilder()
            .setDescription("✅ All suitable roles are already whitelisted for anti-spam bypass.")
            .setColor("#00ff00");
        await i.editReply({ embeds: [errorEmbed], components: [] });
        return;
    }

    const roleOptions = availableRoles.first(25).map(role => // Discord limit of 25 options
        new StringSelectMenuOptionBuilder()
            .setLabel(`@${role.name}`)
            .setValue(role.id)
            .setDescription(`Add this role to anti-spam whitelist`)
            .setEmoji("⚪")
    );

    const roleSelectMenu = new StringSelectMenuBuilder()
        .setCustomId("add_whitelist_role_select")
        .setPlaceholder("Select a role to whitelist...")
        .addOptions(roleOptions);

    const roleRow = new ActionRowBuilder().addComponents(roleSelectMenu);

    const addEmbed = new EmbedBuilder()
        .setTitle("⚪ Add Whitelist Role")
        .setDescription(`**Select a role to whitelist for anti-spam bypass**\n\n` +
                       `Users with whitelisted roles can bypass all anti-spam restrictions.\n\n` +
                       `Currently **${whitelistRoles.length}** roles are whitelisted.\n` +
                       `**${availableRoles.size}** roles can still be added.\n\n` +
                       `Select a role from the menu below:`)
        .setColor("#ffffff");

    await i.editReply({ embeds: [addEmbed], components: [roleRow] });

    // Handle role selection
    const roleFilter = role_i => role_i.customId === 'add_whitelist_role_select' && role_i.user.id === interaction.user.id;
    const roleCollector = interaction.channel.createMessageComponentCollector({ filter: roleFilter, time: 60000 });

    roleCollector.on('collect', async role_i => {
        try {
            await role_i.deferUpdate();
            
            const roleId = role_i.values[0];
            const role = interaction.guild.roles.cache.get(roleId);

            if (!role) {
                const errorEmbed = new EmbedBuilder()
                    .setDescription("❌ Role not found.")
                    .setColor("#ff0000");
                await role_i.editReply({ embeds: [errorEmbed], components: [] });
                return;
            }

            // Add role to whitelist
            await WhitelistRoles.create({
                guildId: interaction.guild.id,
                roleId: roleId,
                roleName: role.name,
                addedBy: interaction.user.id,
                addedAt: new Date(),
                isActive: true
            });

            const successEmbed = new EmbedBuilder()
                .setDescription(`⚪ **Role whitelisted successfully**\n\n` +
                               `**Role:** ${role}\n` +
                               `**Added by:** ${interaction.user}\n\n` +
                               `Users with this role can now bypass anti-spam restrictions.`)
                .setColor("#ffffff");

            await role_i.editReply({ embeds: [successEmbed], components: [] });
            
        } catch (error) {
            console.error('Error adding whitelist role:', error);
            const errorEmbed = new EmbedBuilder()
                .setDescription("❌ An error occurred while adding the whitelist role.")
                .setColor("#ff0000");
            await role_i.editReply({ embeds: [errorEmbed], components: [] }).catch(console.error);
        }
    });
}

async function handleRemoveWhitelistRole(i, interaction, client) {
    const whitelistRoles = await WhitelistRoles.find({
        guildId: interaction.guild.id,
        isActive: true
    });

    if (whitelistRoles.length === 0) {
        const errorEmbed = new EmbedBuilder()
            .setDescription("📋 No roles are currently whitelisted for anti-spam bypass.")
            .setColor("#ffaa00");
        await i.editReply({ embeds: [errorEmbed], components: [] });
        return;
    }

    const roleOptions = whitelistRoles.map(whitelistRole => {
        const role = interaction.guild.roles.cache.get(whitelistRole.roleId);
        const roleName = role ? role.name : 'Unknown Role';
        
        return new StringSelectMenuOptionBuilder()
            .setLabel(`@${roleName}`)
            .setValue(whitelistRole._id.toString())
            .setDescription(`Remove this role from anti-spam whitelist`)
            .setEmoji("⚫");
    });

    const roleSelectMenu = new StringSelectMenuBuilder()
        .setCustomId("remove_whitelist_role_select")
        .setPlaceholder("Select a role to remove...")
        .addOptions(roleOptions);

    const roleRow = new ActionRowBuilder().addComponents(roleSelectMenu);

    const removeEmbed = new EmbedBuilder()
        .setTitle("⚫ Remove Whitelist Role")
        .setDescription(`**Select a role to remove from anti-spam whitelist**\n\n` +
                       `Currently **${whitelistRoles.length}** roles are whitelisted.\n\n` +
                       `Select a role from the menu below:`)
        .setColor("#000000");

    await i.editReply({ embeds: [removeEmbed], components: [roleRow] });

    // Handle role selection
    const roleFilter = role_i => role_i.customId === 'remove_whitelist_role_select' && role_i.user.id === interaction.user.id;
    const roleCollector = interaction.channel.createMessageComponentCollector({ filter: roleFilter, time: 60000 });

    roleCollector.on('collect', async role_i => {
        try {
            await role_i.deferUpdate();
            
            const whitelistRoleId = role_i.values[0];
            const whitelistRole = whitelistRoles.find(wr => wr._id.toString() === whitelistRoleId);

            if (!whitelistRole) {
                const errorEmbed = new EmbedBuilder()
                    .setDescription("❌ Whitelist role not found.")
                    .setColor("#ff0000");
                await role_i.editReply({ embeds: [errorEmbed], components: [] });
                return;
            }

            // Remove role from whitelist
            await WhitelistRoles.findByIdAndDelete(whitelistRoleId);

            const role = interaction.guild.roles.cache.get(whitelistRole.roleId);
            const roleName = role ? `@${role.name}` : `@${whitelistRole.roleName}`;

            const successEmbed = new EmbedBuilder()
                .setDescription(`⚫ **Role removed from whitelist**\n\n` +
                               `**Role:** ${roleName}\n` +
                               `**Removed by:** ${interaction.user}\n\n` +
                               `Users with this role will now be subject to anti-spam restrictions.`)
                .setColor("#000000");

            await role_i.editReply({ embeds: [successEmbed], components: [] });
            
        } catch (error) {
            console.error('Error removing whitelist role:', error);
            const errorEmbed = new EmbedBuilder()
                .setDescription("❌ An error occurred while removing the whitelist role.")
                .setColor("#ff0000");
            await role_i.editReply({ embeds: [errorEmbed], components: [] }).catch(console.error);
        }
    });
}

async function handleListWhitelistRoles(i, interaction, client) {
    const whitelistRoles = await WhitelistRoles.find({
        guildId: interaction.guild.id,
        isActive: true
    }).sort({ addedAt: -1 });

    if (whitelistRoles.length === 0) {
        const listEmbed = new EmbedBuilder()
            .setTitle("📝 Whitelist Roles")
            .setDescription("**No roles are currently whitelisted for anti-spam bypass**\n\n" +
                           "⚫ All users are subject to anti-spam restrictions\n\n" +
                           "Use this command to add whitelist roles if needed.")
            .setColor("#000000");
        await i.editReply({ embeds: [listEmbed], components: [] });
        return;
    }

    const listEmbed = new EmbedBuilder()
        .setTitle("📝 Whitelist Roles")
        .setDescription(`**These ${whitelistRoles.length} roles bypass anti-spam restrictions:**\n\n` +
                       whitelistRoles.map((whitelistRole, index) => {
                           const role = interaction.guild.roles.cache.get(whitelistRole.roleId);
                           const roleName = role ? role.toString() : `@${whitelistRole.roleName} (deleted)`;
                           const addedBy = interaction.guild.members.cache.get(whitelistRole.addedBy);
                           const addedByName = addedBy ? addedBy.user.username : 'Unknown';
                           return `${index + 1}. ${roleName}\n   Added by: ${addedByName} • ${new Date(whitelistRole.addedAt).toLocaleDateString()}`;
                       }).join('\n\n'))
        .setColor("#ffffff")
        .setFooter({ text: `${whitelistRoles.length} whitelisted roles • Commands auto-delete after 30s` });

    await i.editReply({ embeds: [listEmbed], components: [] });
}

// Handler for adding access roles
async function handleAddAccessRole(i, interaction, client) {
    const guild = interaction.guild;
    const availableRoles = guild.roles.cache.filter(role => 
        !role.managed && 
        role.id !== guild.id && 
        !role.permissions.has('Administrator')
    );

    if (availableRoles.size === 0) {
        const noRolesEmbed = new EmbedBuilder()
            .setDescription("❌ **No suitable roles found**\n\nThere are no roles available to add as access roles.")
            .setColor("#ff0000");
        await i.editReply({ embeds: [noRolesEmbed], components: [] });
        return;
    }

    const roleOptions = availableRoles.first(25).map(role =>
        new StringSelectMenuOptionBuilder()
            .setLabel(`@${role.name}`)
            .setValue(role.id)
            .setDescription(`Allow this role to use bot commands`)
            .setEmoji("🔑")
    );

    const roleSelectMenu = new StringSelectMenuBuilder()
        .setCustomId("add_access_role_select")
        .setPlaceholder("Select a role to grant bot access...")
        .addOptions(roleOptions);

    const roleRow = new ActionRowBuilder().addComponents(roleSelectMenu);

    const addEmbed = new EmbedBuilder()
        .setTitle("🔑 Add Access Role")
        .setDescription(`**Select a role to grant bot access**\n\n` +
                       `Users with access roles will be able to use all bot commands.\n` +
                       `If no access roles are set, all users can use the bot.\n\n` +
                       `⚠️ **Important:** Once you add access roles, only users with these roles (and administrators) will be able to use the bot!`)
        .setColor("#00ff00")
        .setFooter({ text: "Select a role from the menu below" });

    await i.editReply({ embeds: [addEmbed], components: [roleRow] });

    const roleFilter = role_i => role_i.customId === 'add_access_role_select' && role_i.user.id === interaction.user.id;
    const roleCollector = interaction.channel.createMessageComponentCollector({ filter: roleFilter, time: 30000 });

    roleCollector.on('collect', async role_i => {
        try {
            await role_i.deferUpdate();
            
            const selectedRoleId = role_i.values[0];
            const selectedRole = guild.roles.cache.get(selectedRoleId);
            
            if (!selectedRole) {
                const errorEmbed = new EmbedBuilder()
                    .setDescription("❌ **Role not found**\n\nThe selected role could not be found.")
                    .setColor("#ff0000");
                await role_i.editReply({ embeds: [errorEmbed], components: [] });
                return;
            }

            const result = await RoleAccessControl.addAccessRole(
                guild.id,
                selectedRole.id,
                selectedRole.name,
                interaction.user.id
            );

            if (result.success) {
                const successEmbed = new EmbedBuilder()
                    .setTitle("✅ Access Role Added")
                    .setDescription(`**Role:** ${selectedRole}\n**Action:** Added to bot access control\n\n` +
                                   `Users with this role can now use all bot commands.`)
                    .setColor("#00ff00")
                    .setFooter({ text: "Role-based access control active" });
                await role_i.editReply({ embeds: [successEmbed], components: [] });
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setDescription(`❌ **Failed to add access role**\n\n${result.message}`)
                    .setColor("#ff0000");
                await role_i.editReply({ embeds: [errorEmbed], components: [] });
            }

        } catch (error) {
            console.error('Error adding access role:', error);
            const errorEmbed = new EmbedBuilder()
                .setDescription("❌ **Error occurred**\n\nAn error occurred while adding the access role.")
                .setColor("#ff0000");
            await role_i.editReply({ embeds: [errorEmbed], components: [] });
        }
    });

    roleCollector.on('end', collected => {
        if (collected.size === 0) {
            const timeoutEmbed = new EmbedBuilder()
                .setDescription("⏰ **Selection timeout**\n\nNo role was selected within the time limit.")
                .setColor("#ffaa00");
            i.editReply({ embeds: [timeoutEmbed], components: [] }).catch(console.error);
        }
    });
}

// Handler for removing access roles
async function handleRemoveAccessRole(i, interaction, client) {
    const guild = interaction.guild;
    const accessRoles = await AccessControlRoles.find({
        guildId: guild.id,
        isActive: true
    });

    if (accessRoles.length === 0) {
        const noRolesEmbed = new EmbedBuilder()
            .setDescription("❌ **No access roles found**\n\nThere are currently no access roles configured.")
            .setColor("#ff0000");
        await i.editReply({ embeds: [noRolesEmbed], components: [] });
        return;
    }

    const roleOptions = accessRoles.map(accessRole => {
        const role = guild.roles.cache.get(accessRole.roleId);
        const roleName = role ? role.name : accessRole.roleName;
        
        return new StringSelectMenuOptionBuilder()
            .setLabel(`@${roleName}`)
            .setValue(accessRole.roleId)
            .setDescription(role ? 'Remove this role from bot access' : 'Role deleted - clean up entry')
            .setEmoji("🚫");
    });

    const roleSelectMenu = new StringSelectMenuBuilder()
        .setCustomId("remove_access_role_select")
        .setPlaceholder("Select a role to remove...")
        .addOptions(roleOptions);

    const roleRow = new ActionRowBuilder().addComponents(roleSelectMenu);

    const removeEmbed = new EmbedBuilder()
        .setTitle("🚫 Remove Access Role")
        .setDescription(`**Select a role to remove from bot access**\n\n` +
                       `Current access roles: ${accessRoles.length}\n\n` +
                       `⚠️ **Warning:** Removing roles will prevent users with those roles from using the bot!`)
        .setColor("#ff6600")
        .setFooter({ text: "Select a role from the menu below" });

    await i.editReply({ embeds: [removeEmbed], components: [roleRow] });

    const roleFilter = role_i => role_i.customId === 'remove_access_role_select' && role_i.user.id === interaction.user.id;
    const roleCollector = interaction.channel.createMessageComponentCollector({ filter: roleFilter, time: 30000 });

    roleCollector.on('collect', async role_i => {
        try {
            await role_i.deferUpdate();
            
            const selectedRoleId = role_i.values[0];
            const accessRole = accessRoles.find(ar => ar.roleId === selectedRoleId);
            const role = guild.roles.cache.get(selectedRoleId);
            const roleName = role ? role.name : accessRole.roleName;

            const result = await RoleAccessControl.removeAccessRole(guild.id, selectedRoleId);

            if (result.success) {
                const successEmbed = new EmbedBuilder()
                    .setTitle("✅ Access Role Removed")
                    .setDescription(`**Role:** @${roleName}\n**Action:** Removed from bot access control\n\n` +
                                   `Users with this role can no longer use bot commands (unless they have other access roles).`)
                    .setColor("#00ff00")
                    .setFooter({ text: "Role-based access control updated" });
                await role_i.editReply({ embeds: [successEmbed], components: [] });
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setDescription(`❌ **Failed to remove access role**\n\n${result.message}`)
                    .setColor("#ff0000");
                await role_i.editReply({ embeds: [errorEmbed], components: [] });
            }

        } catch (error) {
            console.error('Error removing access role:', error);
            const errorEmbed = new EmbedBuilder()
                .setDescription("❌ **Error occurred**\n\nAn error occurred while removing the access role.")
                .setColor("#ff0000");
            await role_i.editReply({ embeds: [errorEmbed], components: [] });
        }
    });

    roleCollector.on('end', collected => {
        if (collected.size === 0) {
            const timeoutEmbed = new EmbedBuilder()
                .setDescription("⏰ **Selection timeout**\n\nNo role was selected within the time limit.")
                .setColor("#ffaa00");
            i.editReply({ embeds: [timeoutEmbed], components: [] }).catch(console.error);
        }
    });
}

// Handler for listing access roles
async function handleListAccessRoles(i, interaction, client) {
    const accessRoles = await AccessControlRoles.find({
        guildId: interaction.guild.id,
        isActive: true
    });

    if (accessRoles.length === 0) {
        const noRolesEmbed = new EmbedBuilder()
            .setTitle("👥 Bot Access Roles")
            .setDescription("🔓 **No access restrictions configured**\n\n" +
                           "All users can currently use the bot commands.\n" +
                           "Use the menu to add access roles if you want to restrict bot usage.")
            .setColor("#00ff00")
            .setFooter({ text: "No access control • All users can use the bot" });
        await i.editReply({ embeds: [noRolesEmbed], components: [] });
        return;
    }

    const listEmbed = new EmbedBuilder()
        .setTitle("👥 Bot Access Roles")
        .setDescription(`**These ${accessRoles.length} roles can use bot commands:**\n\n` +
                       accessRoles.map((accessRole, index) => {
                           const role = interaction.guild.roles.cache.get(accessRole.roleId);
                           const roleName = role ? role.toString() : `@${accessRole.roleName} (deleted)`;
                           const addedBy = interaction.guild.members.cache.get(accessRole.addedBy);
                           const addedByName = addedBy ? addedBy.user.username : 'Unknown';
                           return `${index + 1}. ${roleName}\n   Added by: ${addedByName} • ${new Date(accessRole.addedAt).toLocaleDateString()}`;
                       }).join('\n\n') + 
                       `\n\n🔑 **Access Control Active**\nOnly users with these roles (and administrators) can use bot commands.`)
        .setColor("#0099ff")
        .setFooter({ text: `${accessRoles.length} access roles configured • Commands auto-delete after 30s` });

    await i.editReply({ embeds: [listEmbed], components: [] });
}

// Handler for auto-promo status
async function handleAutoPromoStatus(i, interaction, client) {
    const status = client.autoPromo.getStatus();
    
    const statusEmbed = new EmbedBuilder()
        .setTitle("📊 Auto-Promotional System Status")
        .setDescription(`**🔑 Role Acquisition Promo**\n` +
                       `Status: ${status.rolePromo.isRunning ? '🟢 **Running**' : '🔴 **Stopped**'}\n` +
                       `Channel: <#${status.rolePromo.channelId}>\n` +
                       `Schedule: Every ${status.rolePromo.interval}\n` +
                       `Next Message: ${status.rolePromo.nextScheduled}\n\n` +
                       `**💎 Premium Content Promo**\n` +
                       `Status: ${status.premiumPromo.isRunning ? '🟢 **Running**' : '🔴 **Stopped**'}\n` +
                       `Channel: <#${status.premiumPromo.channelId}>\n` +
                       `Schedule: Every ${status.premiumPromo.interval}\n` +
                       `Next Message: ${status.premiumPromo.nextScheduled}\n\n` +
                       `**Features:**\n` +
                       `• Dual promotional system\n` +
                       `• Automatic random scheduling\n` +
                       `• Single message per channel\n` +
                       `• Admin controls available`)
        .setColor(status.isRunning ? "#00ff00" : "#ff6600")
        .setFooter({ text: "Auto-promotional system • Admins can start/stop" });

    await i.editReply({ embeds: [statusEmbed], components: [] });
}

// Handler for starting auto-promo
async function handleAutoPromoStart(i, interaction, client) {
    const status = client.autoPromo.getStatus();
    if (status.isRunning) {
        const alreadyRunningEmbed = new EmbedBuilder()
            .setDescription("⚠️ **Auto-promotional system is already running**\n\nUse the status option to view current details.")
            .setColor("#ffaa00");
        await i.editReply({ embeds: [alreadyRunningEmbed], components: [] });
        return;
    }

    await client.autoPromo.start();
    
    const startedEmbed = new EmbedBuilder()
        .setTitle("✅ Auto-Promotional System Started")
        .setDescription(`**Status:** 🟢 **Now Running**\n\n` +
                       `**🔑 Role Promo Channel:** <#${client.autoPromo.rolePromoConfig.channelId}>\n` +
                       `**💎 Premium Promo Channel:** <#${client.autoPromo.premiumPromoConfig.channelId}>\n\n` +
                       `**Schedules:**\n` +
                       `• Role acquisition: Every 60-120 minutes\n` +
                       `• Premium content: Every 12-24 hours\n\n` +
                       `Both promotional systems are now running automatically.`)
        .setColor("#00ff00")
        .setFooter({ text: "Auto-promotional system started • Running in background" });

    await i.editReply({ embeds: [startedEmbed], components: [] });
}

// Handler for stopping auto-promo
async function handleAutoPromoStop(i, interaction, client) {
    const status = client.autoPromo.getStatus();
    if (!status.isRunning) {
        const notRunningEmbed = new EmbedBuilder()
            .setDescription("⚠️ **Auto-promotional system is not currently running**\n\nUse the start option to begin promotional messaging.")
            .setColor("#ffaa00");
        await i.editReply({ embeds: [notRunningEmbed], components: [] });
        return;
    }

    await client.autoPromo.stop();
    
    const stoppedEmbed = new EmbedBuilder()
        .setTitle("⏹️ Auto-Promotional System Stopped")
        .setDescription(`**Status:** 🔴 **Stopped**\n\n` +
                       `**🔑 Role Promo Channel:** <#${client.autoPromo.rolePromoConfig.channelId}>\n` +
                       `**💎 Premium Promo Channel:** <#${client.autoPromo.premiumPromoConfig.channelId}>\n\n` +
                       `Both promotional systems have been stopped and will no longer post messages automatically.`)
        .setColor("#ff6600")
        .setFooter({ text: "Auto-promotional system stopped • Use start to resume" });

    await i.editReply({ embeds: [stoppedEmbed], components: [] });
}

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionsBitField } = require("discord.js");
const AutoFeeds = require("../../settings/models/AutoFeeds");
require("dotenv").config();

module.exports = {
    name: ["autopost"],
    description: "Configure auto-posting for various content categories",
    run: async (interaction, client) => {
        // Only defer if not already replied to
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply({ ephemeral: false });
        }

        // Check permissions
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            const errorEmbed = new EmbedBuilder()
                .setDescription("❌ You need **Manage Channels** permission to use this command.")
                .setColor("#ff0000");
            return interaction.editReply({ embeds: [errorEmbed] });
        }

        if (!interaction.channel.nsfw) {
            const nsfwEmbed = new EmbedBuilder()
                .setDescription("❌ This command can only be used in NSFW channels.")
                .setColor("#ff0000");
            return interaction.editReply({ embeds: [nsfwEmbed] });
        }

        const categories = [
            { label: "Reddit Auto-Post", value: "reddit", description: "Auto-post from various Reddit communities", emoji: "🔥" },
            { label: "Redgifs Auto-Post", value: "redgifs", description: "Auto-post from Redgifs (10-30 min intervals)", emoji: "🎬" },
            { label: "X (Twitter) Auto-Post", value: "twitter", description: "Auto-post from X/Twitter (10-30 min intervals)", emoji: "🐦" },
            { label: "Amateur Content", value: "amateur", description: "Auto-post amateur content", emoji: "💖" },
            { label: "Asian Content", value: "asian", description: "Auto-post Asian content", emoji: "🌸" },
            { label: "MILF Content", value: "milf", description: "Auto-post MILF content", emoji: "👩" },
            { label: "Anal Content", value: "anal", description: "Auto-post anal content", emoji: "🍑" },
            { label: "Boobs Content", value: "boobs", description: "Auto-post boobs content", emoji: "👙" },
            { label: "Lesbian Content", value: "lesbian", description: "Auto-post lesbian content", emoji: "💕" },
            { label: "Hentai Content", value: "hentai", description: "Auto-post hentai content", emoji: "🎨" },
            { label: "Manage Existing", value: "manage", description: "View and delete existing autoposts", emoji: "📋" },
            { label: "Stop All Auto-Post", value: "disable", description: "Disable all auto-posting", emoji: "⛔" }
        ];

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("autopost_select")
            .setPlaceholder("Choose an auto-posting category...")
            .addOptions(
                categories.map(cat => 
                    new StringSelectMenuOptionBuilder()
                        .setLabel(cat.label)
                        .setValue(cat.value)
                        .setDescription(cat.description)
                        .setEmoji(cat.emoji)
                )
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setTitle("🤖 Auto-Posting Configuration")
            .setDescription(`**Configure auto-posting for ${interaction.channel}**\n\n` +
                           `📋 **Available Categories:**\n` +
                           `🔥 Reddit (Random communities)\n` +
                           `💖 Amateur content\n` +
                           `🌸 Asian content\n` +
                           `👩 MILF content\n` +
                           `🍑 Anal content\n` +
                           `👙 Boobs content\n` +
                           `💕 Lesbian content\n` +
                           `🎨 Hentai content\n\n` +
                           `🛠️ **Management:**\n` +
                           `📋 Manage existing autoposts (view & delete)\n` +
                           `⛔ Stop all auto-posting\n\n` +
                           `⚠️ **Requirements:**\n` +
                           `• NSFW channel only\n` +
                           `• Manage Channels permission\n` +
                           `• Bot webhook permissions\n\n` +
                           `📝 Select a category from the menu below to configure auto-posting.`)
            .setColor(client.color || "#ca2c2b")
            .setFooter({ text: "Auto-posting will send content every 3-15 minutes" });

        await interaction.editReply({ embeds: [embed], components: [row] });

        // Handle select menu interactions
        const filter = i => i.customId === 'autopost_select' && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 }); // 5 minutes instead of 1

        collector.on('collect', async i => {
            try {
                await i.deferUpdate();
                
                const selectedValue = i.values[0];
                const selectedCategory = categories.find(cat => cat.value === selectedValue);

                // Handle new web scraping auto-post options
                if (selectedValue === 'redgifs' || selectedValue === 'twitter') {
                    try {
                        if (selectedValue === 'redgifs') {
                            // Check if Redgifs is enabled
                            if (process.env.ENABLE_REDGIFS !== 'true') {
                                const disabledEmbed = new EmbedBuilder()
                                    .setDescription("❌ Redgifs auto-posting is currently disabled in bot configuration.")
                                    .setColor("#ff0000");
                                return await i.editReply({ embeds: [disabledEmbed], components: [] });
                            }

                            // Start Redgifs auto-posting with default category
                            if (client.autoWebScrapeSender) {
                                await client.autoWebScrapeSender.startRedgifsPosting(interaction.channel.id, 'amateur');
                                
                                const enabledEmbed = new EmbedBuilder()
                                    .setTitle("🎬 Redgifs Auto-Posting Started")
                                    .setDescription(`✅ **Redgifs auto-posting** enabled for ${interaction.channel}\n\n` +
                                                   `📂 **Category:** Amateur (default)\n` +
                                                   `⏰ **Interval:** 3-10 minutes (random)\n` +
                                                   `🎯 **Source:** Redgifs API\n\n` +
                                                   `💡 **Tip:** Use \`/auto-redgifs action:start\` to select specific categories!`)
                                    .setColor("#00ff00")
                                    .setTimestamp();
                                
                                await i.editReply({ embeds: [enabledEmbed], components: [] });
                                collector.stop('completed');
                                return;
                            }
                        } else if (selectedValue === 'twitter') {
                            // Check if X Twitter is enabled
                            if (process.env.ENABLE_X_TWITTER !== 'true') {
                                const disabledEmbed = new EmbedBuilder()
                                    .setDescription("❌ X (Twitter) auto-posting is currently disabled in bot configuration.")
                                    .setColor("#ff0000");
                                return await i.editReply({ embeds: [disabledEmbed], components: [] });
                            }

                            // Start X auto-posting with default category
                            if (client.autoWebScrapeSender) {
                                await client.autoWebScrapeSender.startXPosting(interaction.channel.id, 'amateur');
                                
                                const enabledEmbed = new EmbedBuilder()
                                    .setTitle("🐦 X (Twitter) Auto-Posting Started")
                                    .setDescription(`✅ **X (Twitter) auto-posting** enabled for ${interaction.channel}\n\n` +
                                                   `📂 **Category:** Amateur (default)\n` +
                                                   `⏰ **Interval:** 3-10 minutes (random)\n` +
                                                   `🎯 **Source:** X/Twitter Search\n\n` +
                                                   `💡 **Tip:** Use \`/auto-x action:start\` to select specific categories!`)
                                    .setColor("#00ff00")
                                    .setTimestamp();
                                
                                await i.editReply({ embeds: [enabledEmbed], components: [] });
                                collector.stop('completed');
                                return;
                            }
                        }

                        // Fallback if autoWebScrapeSender not available
                        const errorEmbed = new EmbedBuilder()
                            .setDescription("❌ Web scraping system not available. Please try again later.")
                            .setColor("#ff0000");
                        await i.editReply({ embeds: [errorEmbed], components: [] });
                        return;

                    } catch (error) {
                        console.error(`Error starting ${selectedValue} auto-posting:`, error);
                        const errorEmbed = new EmbedBuilder()
                            .setDescription(`❌ Failed to start ${selectedValue} auto-posting. Check console for details.`)
                            .setColor("#ff0000");
                        await i.editReply({ embeds: [errorEmbed], components: [] });
                        return;
                    }
                }

                if (selectedValue === 'disable') {
                    // Disable auto-posting - remove from database
                    try {
                        const deleted = await AutoFeeds.findOneAndDelete({
                            guildId: interaction.guild.id,
                            channelId: interaction.channel.id
                        });

                        const disabledEmbed = new EmbedBuilder()
                            .setDescription(`⛔ **Auto-posting disabled** for ${interaction.channel}\n\n` +
                                           `${deleted ? 'Previous configuration removed from database.' : 'No existing configuration found.'}\n` +
                                           `All scheduled posts have been stopped.`)
                            .setColor("#ff0000");
                        
                        await i.editReply({ embeds: [disabledEmbed], components: [] });
                        collector.stop('completed');
                    } catch (dbError) {
                        console.error('Database error disabling auto-post:', dbError);
                        const errorEmbed = new EmbedBuilder()
                            .setDescription("❌ Error disabling auto-posting. Please try again.")
                            .setColor("#ff0000");
                        await i.editReply({ embeds: [errorEmbed], components: [] });
                    }
                } else if (selectedValue === 'manage') {
                    // Show existing autoposts for this guild
                    try {
                        const existingAutoposts = await AutoFeeds.find({
                            guildId: interaction.guild.id,
                            isActive: { $ne: false }
                        });

                        if (existingAutoposts.length === 0) {
                            const noAutopostsEmbed = new EmbedBuilder()
                                .setDescription("📋 **No active autoposts found**\n\n" +
                                               "You don't have any active autoposts in this server.\n" +
                                               "Use this command again to create new autoposts.")
                                .setColor("#ffaa00");
                            
                            await i.editReply({ embeds: [noAutopostsEmbed], components: [] });
                            collector.stop('completed');
                            return;
                        }

                        // Create a select menu for existing autoposts
                        const autopostOptions = existingAutoposts.map((autopost, index) => {
                            const channel = interaction.guild.channels.cache.get(autopost.channelId);
                            const channelName = channel ? channel.name : 'Unknown Channel';
                            
                            return new StringSelectMenuOptionBuilder()
                                .setLabel(`${channelName} - ${autopost.contenttype}`)
                                .setValue(autopost._id.toString())
                                .setDescription(`Posts every 3-15 minutes • Last: ${autopost.lastPost ? new Date(autopost.lastPost).toLocaleString() : 'Never'}`)
                                .setEmoji("🗑️");
                        });

                        const manageSelectMenu = new StringSelectMenuBuilder()
                            .setCustomId("manage_autopost_select")
                            .setPlaceholder("Select an autopost to delete...")
                            .addOptions(autopostOptions);

                        const manageRow = new ActionRowBuilder().addComponents(manageSelectMenu);

                        const manageEmbed = new EmbedBuilder()
                            .setTitle("📋 Manage Existing Autoposts")
                            .setDescription(`**Found ${existingAutoposts.length} active autopost(s)**\n\n` +
                                           `Select an autopost from the menu below to **delete** it.\n\n` +
                                           `⚠️ **Warning:** This action cannot be undone!`)
                            .setColor(client.color || "#ca2c2b")
                            .setFooter({ text: "Select an autopost to delete it permanently" });

                        await i.editReply({ embeds: [manageEmbed], components: [manageRow] });

                        // Handle manage selection
                        const manageFilter = manage_i => manage_i.customId === 'manage_autopost_select' && manage_i.user.id === interaction.user.id;
                        const manageCollector = interaction.channel.createMessageComponentCollector({ filter: manageFilter, time: 60000 });

                        manageCollector.on('collect', async manage_i => {
                            try {
                                await manage_i.deferUpdate();
                                
                                const autopostId = manage_i.values[0];
                                const autopostToDelete = existingAutoposts.find(ap => ap._id.toString() === autopostId);
                                
                                if (!autopostToDelete) {
                                    const errorEmbed = new EmbedBuilder()
                                        .setDescription("❌ Autopost not found. It may have been deleted already.")
                                        .setColor("#ff0000");
                                    await manage_i.editReply({ embeds: [errorEmbed], components: [] });
                                    return;
                                }

                                // Delete the autopost
                                await AutoFeeds.findByIdAndDelete(autopostId);

                                const channel = interaction.guild.channels.cache.get(autopostToDelete.channelId);
                                const channelName = channel ? channel.name : 'Unknown Channel';

                                const deletedEmbed = new EmbedBuilder()
                                    .setDescription(`🗑️ **Autopost deleted successfully**\n\n` +
                                                   `**Channel:** ${channelName}\n` +
                                                   `**Content Type:** ${autopostToDelete.contenttype}\n` +
                                                   `**Database ID:** \`${autopostId}\`\n\n` +
                                                   `✅ The autopost has been permanently removed.`)
                                    .setColor("#00ff00");

                                await manage_i.editReply({ embeds: [deletedEmbed], components: [] });
                                manageCollector.stop('completed');
                                
                            } catch (error) {
                                console.error('Error deleting autopost:', error);
                                const errorEmbed = new EmbedBuilder()
                                    .setDescription("❌ An error occurred while deleting the autopost.")
                                    .setColor("#ff0000");
                                await manage_i.editReply({ embeds: [errorEmbed], components: [] }).catch(console.error);
                            }
                        });

                        manageCollector.on('end', (collected, reason) => {
                            if (reason !== 'completed') {
                                const timeoutEmbed = new EmbedBuilder()
                                    .setDescription("⏰ Management selection timed out.")
                                    .setColor("#ffaa00");
                                
                                i.editReply({ embeds: [timeoutEmbed], components: [] }).catch(console.error);
                            }
                        });

                        collector.stop('completed');
                    } catch (dbError) {
                        console.error('Database error managing autoposts:', dbError);
                        const errorEmbed = new EmbedBuilder()
                            .setDescription("❌ Database error while fetching autoposts. Please try again.")
                            .setColor("#ff0000");
                        await i.editReply({ embeds: [errorEmbed], components: [] });
                    }
                } else {
                    // Enable auto-posting - save to database
                    try {
                        // Create webhook for the channel
                        let webhook;
                        let webhookCreated = false;
                        try {
                            const existingWebhooks = await interaction.channel.fetchWebhooks();
                            webhook = existingWebhooks.find(wh => wh.name === 'Aurora Auto-Post');
                            
                            if (!webhook) {
                                webhook = await interaction.channel.createWebhook({
                                    name: 'Aurora Auto-Post',
                                    avatar: client.user.displayAvatarURL()
                                });
                                webhookCreated = true;
                            }
                        } catch (webhookError) {
                            console.error('Webhook creation error:', webhookError);
                            const errorEmbed = new EmbedBuilder()
                                .setDescription("❌ Failed to create webhook. Please ensure the bot has webhook permissions.")
                                .setColor("#ff0000");
                            return await i.editReply({ embeds: [errorEmbed], components: [] });
                        }

                        // Remove any existing configuration first
                        await AutoFeeds.findOneAndDelete({
                            guildId: interaction.guild.id,
                            channelId: interaction.channel.id
                        });

                        // Save new configuration to database
                        const newConfig = await AutoFeeds.create({
                            guildId: interaction.guild.id,
                            channelId: interaction.channel.id,
                            webhook: webhook.url,
                            contenttype: selectedValue,
                            lastPost: new Date(0), // Set to epoch so it posts immediately
                            isActive: true
                        });

                        // Calculate next post time (3-15 minutes from now)
                        const nextPostMinutes = Math.floor(Math.random() * 13) + 3; // 3-15 minutes
                        const nextPostTime = new Date(Date.now() + (nextPostMinutes * 60 * 1000));

                        const enabledEmbed = new EmbedBuilder()
                            .setDescription(`✅ **${selectedCategory.emoji} ${selectedCategory.label}** enabled for ${interaction.channel}\n\n` +
                                           `🔗 **Webhook:** ${webhookCreated ? 'Created new webhook' : 'Using existing webhook'}\n` +
                                           `⏰ **First post:** ~${nextPostMinutes} minutes\n` +
                                           `🔄 **Interval:** Every 3-15 minutes\n` +
                                           `� **Database ID:** \`${newConfig._id}\`\n\n` +
                                           `🎯 **Configuration saved successfully!**\n` +
                                           `Use this command again to change settings.`)
                            .setColor("#00ff00")
                            .setFooter({ text: `Category: ${selectedCategory.label} | Next: ${nextPostTime.toLocaleTimeString()}` });
                        
                        await i.editReply({ embeds: [enabledEmbed], components: [] });
                        collector.stop('completed');
                    } catch (dbError) {
                        console.error('Database error enabling auto-post:', dbError);
                        const errorEmbed = new EmbedBuilder()
                            .setDescription("❌ Database error while configuring auto-posting. Please try again.")
                            .setColor("#ff0000");
                        await i.editReply({ embeds: [errorEmbed], components: [] });
                    }
                }
            } catch (error) {
                console.error('Auto-post selection error:', error);
                const errorEmbed = new EmbedBuilder()
                    .setDescription("❌ An error occurred while processing your selection.")
                    .setColor("#ff0000");
                await i.editReply({ embeds: [errorEmbed], components: [] }).catch(console.error);
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason !== 'completed') {
                const timeoutEmbed = new EmbedBuilder()
                    .setDescription("⏰ Auto-posting configuration timed out. Use the command again to configure.")
                    .setColor("#ffaa00");
                
                interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(console.error);
            }
        });
    }
}

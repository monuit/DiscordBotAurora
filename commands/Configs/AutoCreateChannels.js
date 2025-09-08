const { EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const AutoWebScrapeSender = require('../../Functions/AutoWebScrapeSender');

module.exports = {
    name: ["auto-create-channels"],
    description: "Auto-create all required NSFW channels with Redgifs enabled",
    type: "CHAT_INPUT",
    options: [
        {
            name: "action",
            description: "Action to perform",
            type: 3, // STRING
            required: true,
            choices: [
                { name: "Create All Channels", value: "create" },
                { name: "Preview Channel List", value: "preview" },
                { name: "Delete All Created", value: "delete" }
            ]
        },
        {
            name: "category",
            description: "Category ID to create channels in",
            type: 3, // STRING
            required: false
        }
    ],
    run: async (interaction) => {
        const { guild, member } = interaction;
        
        // Check permissions
        if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#ff0000")
                .setTitle("❌ Access Denied")
                .setDescription("You need `Manage Channels` permission to use this command.")
                .setTimestamp();
            return interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }

        const action = interaction.options.getString('action');
        const categoryId = interaction.options.getString('category') || '1413953820689567916';
        
        // Channel categories to create
        const channelCategories = [
            { name: '💦-amateur', category: 'amateur' },
            { name: '💦-anal', category: 'anal' },
            { name: '💦-asian', category: 'asian' },
            { name: '💦-ass', category: 'ass' },
            { name: '💦-bdsm', category: 'bdsm' },
            { name: '💦-blowjob', category: 'blowjob' },
            { name: '💦-boobs', category: 'boobs' },
            { name: '💦-celebrity', category: 'celebrity' },
            { name: '💦-cum', category: 'cum' },
            { name: '💦-feet', category: 'feet' },
            { name: '💦-gonewild', category: 'gonewild' },
            { name: '💦-hentai', category: 'hentai' },
            { name: '💦-lesbian', category: 'lesbian' },
            { name: '💦-milf', category: 'milf' },
            { name: '💦-onlyfans', category: 'onlyfans' },
            { name: '💦-porn', category: 'porn' },
            { name: '💦-public', category: 'public' },
            { name: '💦-pussy', category: 'pussy' },
            { name: '💦-teens', category: 'teens' },
            { name: '💦-thick', category: 'thick' }
        ];

        if (action === 'preview') {
            const previewEmbed = new EmbedBuilder()
                .setColor("#0099ff")
                .setTitle("📋 Channel Creation Preview")
                .setDescription(`**Category ID:** ${categoryId}\n\n**Channels to create:**`)
                .addFields({
                    name: "Channel List",
                    value: channelCategories.map(ch => `• ${ch.name}`).join('\n'),
                    inline: false
                })
                .addFields({
                    name: "Features",
                    value: "• All channels will be NSFW\n• Redgifs auto-posting enabled\n• Random 10-30 minute intervals",
                    inline: false
                })
                .setTimestamp();
            
            return interaction.reply({ embeds: [previewEmbed], flags: 64 });
        }

        if (action === 'delete') {
            try {
                await interaction.deferReply();
            } catch (error) {
                console.log(`[AUTO-CREATE-CHANNELS] Interaction already acknowledged:`, error.message);
            }
            
            const category = guild.channels.cache.get(categoryId);
            if (!category) {
                const errorEmbed = new EmbedBuilder()
                    .setColor("#ff0000")
                    .setTitle("❌ Category Not Found")
                    .setDescription(`Category with ID ${categoryId} not found.`)
                    .setTimestamp();
                return interaction.editReply({ embeds: [errorEmbed] });
            }

            let deletedCount = 0;
            const deletedChannels = [];

            for (const channelData of channelCategories) {
                const existingChannel = guild.channels.cache.find(ch => 
                    ch.name === channelData.name && ch.parentId === categoryId
                );
                
                if (existingChannel) {
                    try {
                        await existingChannel.delete();
                        deletedChannels.push(channelData.name);
                        deletedCount++;
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit protection
                    } catch (error) {
                        console.error(`Failed to delete channel ${channelData.name}:`, error);
                    }
                }
            }

            const deleteEmbed = new EmbedBuilder()
                .setColor("#ff9900")
                .setTitle("🗑️ Channels Deleted")
                .setDescription(`Successfully deleted ${deletedCount} channels.`)
                .addFields({
                    name: "Deleted Channels",
                    value: deletedChannels.length > 0 ? deletedChannels.join('\n') : "No channels found to delete",
                    inline: false
                })
                .setTimestamp();

            return interaction.editReply({ embeds: [deleteEmbed] });
        }

        if (action === 'create') {
            try {
                await interaction.deferReply();
            } catch (error) {
                console.log(`[AUTO-CREATE-CHANNELS] Interaction already acknowledged:`, error.message);
            }
            
            console.log(`[AUTO-CREATE] Starting channel creation for category ${categoryId}`);
            
            const category = guild.channels.cache.get(categoryId);
            if (!category) {
                console.log(`[AUTO-CREATE] Error: Category ${categoryId} not found`);
                const errorEmbed = new EmbedBuilder()
                    .setColor("#ff0000")
                    .setTitle("❌ Category Not Found")
                    .setDescription(`Category with ID ${categoryId} not found.`)
                    .setTimestamp();
                    
                try {
                    if (interaction.deferred) {
                        return interaction.editReply({ embeds: [errorEmbed] });
                    } else if (interaction.replied) {
                        return interaction.followUp({ embeds: [errorEmbed] });
                    } else {
                        return interaction.reply({ embeds: [errorEmbed] });
                    }
                } catch (error) {
                    console.log(`[AUTO-CREATE-CHANNELS] Error sending response, trying channel send:`, error.message);
                    // Fallback: send directly to the channel
                    try {
                        await interaction.channel.send({ embeds: [errorEmbed] });
                    } catch (fallbackError) {
                        console.log(`[AUTO-CREATE-CHANNELS] Channel fallback failed:`, fallbackError.message);
                    }
                    return;
                }
            }

            console.log(`[AUTO-CREATE] Found category: ${category.name}`);

            let createdCount = 0;
            const createdChannels = [];
            const skippedChannels = [];
            const errors = [];
            
            console.log(`[AUTO-CREATE] Creating AutoWebScrapeSender instance`);
            let autoWebSender;
            try {
                autoWebSender = new AutoWebScrapeSender(interaction.client);
                console.log(`[AUTO-CREATE] AutoWebScrapeSender created successfully`);
            } catch (error) {
                console.error(`[AUTO-CREATE] Failed to create AutoWebScrapeSender:`, error);
                errors.push(`AutoWebScrapeSender init: ${error.message}`);
            }

            console.log(`[AUTO-CREATE] Starting to process ${channelCategories.length} channels`);

            for (const channelData of channelCategories) {
                console.log(`[AUTO-CREATE] Processing channel: ${channelData.name}`);
                try {
                    // Check if channel already exists
                    const existingChannel = guild.channels.cache.find(ch => 
                        ch.name === channelData.name && ch.parentId === categoryId
                    );
                    
                    if (existingChannel) {
                        console.log(`[AUTO-CREATE] Channel ${channelData.name} already exists, skipping creation`);
                        skippedChannels.push(channelData.name);
                        
                        // Still enable Redgifs for existing channel
                        if (autoWebSender) {
                            try {
                                console.log(`[AUTO-CREATE] Enabling Redgifs for existing channel ${channelData.name}`);
                                await autoWebSender.startAutoPost(existingChannel.id, 'redgifs', channelData.category, interaction.user.id);
                                console.log(`[AUTO-CREATE] Redgifs enabled for existing channel ${channelData.name}`);
                            } catch (error) {
                                console.error(`[AUTO-CREATE] Failed to enable Redgifs for existing channel ${channelData.name}:`, error);
                                errors.push(`Redgifs setup for ${channelData.name}: ${error.message}`);
                            }
                        }
                        continue;
                    }

                    console.log(`[AUTO-CREATE] Creating new channel: ${channelData.name}`);
                    // Create the channel
                    const newChannel = await guild.channels.create({
                        name: channelData.name,
                        type: ChannelType.GuildText,
                        parent: categoryId,
                        nsfw: true,
                        topic: `Automated ${channelData.category} content from Redgifs`,
                        reason: 'Auto-created NSFW channel with Redgifs integration'
                    });

                    console.log(`[AUTO-CREATE] Successfully created channel: ${channelData.name} (${newChannel.id})`);
                    createdChannels.push(channelData.name);
                    createdCount++;

                    // Enable Redgifs auto-posting for this channel
                    if (autoWebSender) {
                        try {
                            console.log(`[AUTO-CREATE] Enabling Redgifs for new channel ${channelData.name}`);
                            await autoWebSender.startAutoPost(newChannel.id, 'redgifs', channelData.category, interaction.user.id);
                            console.log(`[AUTO-CREATE] Redgifs enabled for new channel ${channelData.name}`);
                        } catch (error) {
                            console.error(`[AUTO-CREATE] Failed to enable Redgifs for ${channelData.name}:`, error);
                            errors.push(`Redgifs setup for ${channelData.name}: ${error.message}`);
                        }
                    }

                    // Rate limit protection
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    console.error(`[AUTO-CREATE] Failed to create channel ${channelData.name}:`, error);
                    errors.push(`Channel creation for ${channelData.name}: ${error.message}`);
                    skippedChannels.push(`${channelData.name} (error)`);
                }
            }

            console.log(`[AUTO-CREATE] Completed processing. Created: ${createdCount}, Skipped: ${skippedChannels.length}, Errors: ${errors.length}`);

            const successEmbed = new EmbedBuilder()
                .setColor(errors.length > 0 ? "#ff9900" : "#00ff00")
                .setTitle("✅ Channel Creation Complete")
                .setDescription(`Created ${createdCount} new channels. ${errors.length > 0 ? `⚠️ ${errors.length} errors occurred.` : 'All operations successful!'}`)
                .addFields({
                    name: "Created Channels",
                    value: createdChannels.length > 0 ? createdChannels.join('\n') : "None",
                    inline: true
                })
                .addFields({
                    name: "Skipped/Existing",
                    value: skippedChannels.length > 0 ? skippedChannels.join('\n') : "None",
                    inline: true
                })
                .addFields({
                    name: "Features Enabled",
                    value: "• NSFW channels\n• Redgifs auto-posting\n• 10-30 minute intervals\n• API overlap prevention",
                    inline: false
                });

            if (errors.length > 0) {
                successEmbed.addFields({
                    name: "Errors Encountered",
                    value: errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''),
                    inline: false
                });
            }

            successEmbed.setTimestamp();

            try {
                if (interaction.deferred) {
                    return interaction.editReply({ embeds: [successEmbed] });
                } else if (interaction.replied) {
                    return interaction.followUp({ embeds: [successEmbed] });
                } else {
                    return interaction.reply({ embeds: [successEmbed] });
                }
            } catch (error) {
                console.log(`[AUTO-CREATE-CHANNELS] Error sending success response, trying channel send:`, error.message);
                // Fallback: send directly to the channel
                try {
                    await interaction.channel.send({ embeds: [successEmbed] });
                } catch (fallbackError) {
                    console.log(`[AUTO-CREATE-CHANNELS] Channel fallback failed:`, fallbackError.message);
                }
            }
        }
    }
};

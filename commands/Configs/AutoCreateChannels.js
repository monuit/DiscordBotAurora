const { EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { AutoWebScrapeSender } = require('../../Functions/AutoWebScrapeSender');

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
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
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
            
            return interaction.reply({ embeds: [previewEmbed], ephemeral: true });
        }

        if (action === 'delete') {
            await interaction.deferReply();
            
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
            await interaction.deferReply();
            
            const category = guild.channels.cache.get(categoryId);
            if (!category) {
                const errorEmbed = new EmbedBuilder()
                    .setColor("#ff0000")
                    .setTitle("❌ Category Not Found")
                    .setDescription(`Category with ID ${categoryId} not found.`)
                    .setTimestamp();
                return interaction.editReply({ embeds: [errorEmbed] });
            }

            let createdCount = 0;
            const createdChannels = [];
            const skippedChannels = [];
            const autoWebSender = new AutoWebScrapeSender();

            for (const channelData of channelCategories) {
                try {
                    // Check if channel already exists
                    const existingChannel = guild.channels.cache.find(ch => 
                        ch.name === channelData.name && ch.parentId === categoryId
                    );
                    
                    if (existingChannel) {
                        skippedChannels.push(channelData.name);
                        
                        // Still enable Redgifs for existing channel
                        try {
                            await autoWebSender.scheduleAutoPost(guild.id, existingChannel.id, {
                                source: 'redgifs',
                                category: channelData.category,
                                interval: { min: 10, max: 30 }
                            });
                        } catch (error) {
                            console.error(`Failed to enable Redgifs for existing channel ${channelData.name}:`, error);
                        }
                        continue;
                    }

                    // Create the channel
                    const newChannel = await guild.channels.create({
                        name: channelData.name,
                        type: ChannelType.GuildText,
                        parent: categoryId,
                        nsfw: true,
                        topic: `Automated ${channelData.category} content from Redgifs`,
                        reason: 'Auto-created NSFW channel with Redgifs integration'
                    });

                    createdChannels.push(channelData.name);
                    createdCount++;

                    // Enable Redgifs auto-posting for this channel
                    try {
                        await autoWebSender.scheduleAutoPost(guild.id, newChannel.id, {
                            source: 'redgifs',
                            category: channelData.category,
                            interval: { min: 10, max: 30 }
                        });
                    } catch (error) {
                        console.error(`Failed to enable Redgifs for ${channelData.name}:`, error);
                    }

                    // Rate limit protection
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    console.error(`Failed to create channel ${channelData.name}:`, error);
                    skippedChannels.push(`${channelData.name} (error)`);
                }
            }

            const successEmbed = new EmbedBuilder()
                .setColor("#00ff00")
                .setTitle("✅ Channel Creation Complete")
                .setDescription(`Successfully created ${createdCount} new channels with Redgifs enabled!`)
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
                })
                .setTimestamp();

            return interaction.editReply({ embeds: [successEmbed] });
        }
    }
};

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionsBitField } = require("discord.js");
const AutoFeeds = require("../../settings/models/AutoFeeds");

module.exports = {
    name: ["remove", "autopost"],
    description: "Remove autopost configurations from your server",
    run: async (interaction, client) => {
        await interaction.deferReply({ ephemeral: false });
        
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            const perm = new EmbedBuilder()
                .setDescription(`❌ You need **Manage Channels** permission to use this command.`)
                .setColor("#ff0000")
            return await interaction.editReply({
                embeds: [perm]
            })
        }

        try {
            const autoposts = await AutoFeeds.find({ 
                guildId: interaction.guild.id,
                isActive: { $ne: false }
            });

            if (autoposts.length === 0) {
                const embed = new EmbedBuilder()
                    .setDescription(`📋 **No active autoposts found**\n\n` +
                                   `This server (${interaction.guild.name}) doesn't have any active autoposts.\n` +
                                   `Use \`/autopost\` to create new autoposts.`)
                    .setColor("#ffaa00")

                return interaction.editReply({
                    embeds: [embed]
                });
            }

            // Create options for each autopost
            const autopostOptions = autoposts.map((autopost) => {
                const channel = interaction.guild.channels.cache.get(autopost.channelId);
                const channelName = channel ? `#${channel.name}` : 'Unknown Channel';
                
                return new StringSelectMenuOptionBuilder()
                    .setLabel(`${channelName} - ${autopost.contenttype}`)
                    .setValue(autopost._id.toString())
                    .setDescription(`Last post: ${autopost.lastPost ? new Date(autopost.lastPost).toLocaleString() : 'Never'} • Total: ${autopost.totalPosts || 0}`)
                    .setEmoji("🗑️");
            });

            // Add "Delete All" option
            autopostOptions.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel("🚨 DELETE ALL AUTOPOSTS")
                    .setValue("delete_all")
                    .setDescription(`Remove all ${autoposts.length} autoposts from this server`)
                    .setEmoji("⚠️")
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("remove_autopost_select")
                .setPlaceholder("Select an autopost to remove...")
                .addOptions(autopostOptions);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setTitle("🗑️ Remove Autoposts")
                .setDescription(`**Found ${autoposts.length} active autopost(s) in ${interaction.guild.name}**\n\n` +
                               `Select an autopost from the menu below to **permanently delete** it.\n\n` +
                               `⚠️ **Warning:** This action cannot be undone!\n` +
                               `All selected autoposts will be removed from the database.`)
                .setColor("#ff0000")
                .addFields(
                    autoposts.map(autopost => {
                        const channel = interaction.guild.channels.cache.get(autopost.channelId);
                        const channelName = channel ? `#${channel.name}` : 'Unknown Channel';
                        return {
                            name: `${channelName}`,
                            value: `**Type:** ${autopost.contenttype}\n**Last Post:** ${autopost.lastPost ? new Date(autopost.lastPost).toLocaleString() : 'Never'}\n**ID:** \`${autopost._id}\``,
                            inline: true
                        };
                    })
                )
                .setFooter({ text: "Select an autopost to remove it permanently" });

            await interaction.editReply({ embeds: [embed], components: [row] });

            // Handle selection
            const filter = i => i.customId === 'remove_autopost_select' && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                try {
                    await i.deferUpdate();
                    
                    const selectedValue = i.values[0];

                    if (selectedValue === 'delete_all') {
                        // Delete all autoposts for this guild
                        const deleteResult = await AutoFeeds.deleteMany({ guildId: interaction.guild.id });

                        const allDeletedEmbed = new EmbedBuilder()
                            .setDescription(`🚨 **All autoposts deleted**\n\n` +
                                           `**Server:** ${interaction.guild.name}\n` +
                                           `**Deleted:** ${deleteResult.deletedCount} autopost(s)\n\n` +
                                           `✅ All autoposts have been permanently removed from this server.`)
                            .setColor("#ff0000");

                        await i.editReply({ embeds: [allDeletedEmbed], components: [] });
                    } else {
                        // Delete specific autopost
                        const autopostToDelete = autoposts.find(ap => ap._id.toString() === selectedValue);
                        
                        if (!autopostToDelete) {
                            const errorEmbed = new EmbedBuilder()
                                .setDescription("❌ Autopost not found. It may have been deleted already.")
                                .setColor("#ff0000");
                            await i.editReply({ embeds: [errorEmbed], components: [] });
                            return;
                        }

                        await AutoFeeds.findByIdAndDelete(selectedValue);

                        const channel = interaction.guild.channels.cache.get(autopostToDelete.channelId);
                        const channelName = channel ? `#${channel.name}` : 'Unknown Channel';

                        const deletedEmbed = new EmbedBuilder()
                            .setDescription(`🗑️ **Autopost removed successfully**\n\n` +
                                           `**Channel:** ${channelName}\n` +
                                           `**Content Type:** ${autopostToDelete.contenttype}\n` +
                                           `**Total Posts:** ${autopostToDelete.totalPosts || 0}\n` +
                                           `**Database ID:** \`${selectedValue}\`\n\n` +
                                           `✅ The autopost has been permanently removed.`)
                            .setColor("#00ff00");

                        await i.editReply({ embeds: [deletedEmbed], components: [] });
                    }
                    
                    collector.stop('completed');
                    
                } catch (error) {
                    console.error('Error removing autopost:', error);
                    const errorEmbed = new EmbedBuilder()
                        .setDescription("❌ An error occurred while removing the autopost. Please try again.")
                        .setColor("#ff0000");
                    await i.editReply({ embeds: [errorEmbed], components: [] }).catch(console.error);
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason !== 'completed') {
                    const timeoutEmbed = new EmbedBuilder()
                        .setDescription("⏰ Selection timed out. Use the command again to remove autoposts.")
                        .setColor("#ffaa00");
                    
                    interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(console.error);
                }
            });

        } catch (error) {
            console.error('Database error in removeautopost:', error);
            const errorEmbed = new EmbedBuilder()
                .setDescription("❌ Database error while fetching autoposts. Please try again.")
                .setColor("#ff0000");
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
}

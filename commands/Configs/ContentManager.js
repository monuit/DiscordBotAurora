const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: ["content-manager"],
    description: "📊 Manage content deduplication and tracking system (Admin only)",
    options: [
        {
            name: "action",
            description: "Action to perform",
            type: 3, // STRING
            required: true,
            choices: [
                { name: "Stats", value: "stats" },
                { name: "Cleanup", value: "cleanup" },
                { name: "Check URL", value: "check" }
            ]
        },
        {
            name: "url",
            description: "URL to check (only for check action)",
            type: 3, // STRING
            required: false
        }
    ],
    
    run: async (interaction, client) => {
        // Only defer if not already replied to
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply({ ephemeral: true });
        }

        // Check permissions - only administrators and manage channels
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            const errorEmbed = new EmbedBuilder()
                .setDescription("❌ You need **Manage Channels** permission to use this command.")
                .setColor("#ff0000");
            return interaction.editReply({ embeds: [errorEmbed] });
        }

        const action = interaction.options.getString('action');

        if (action === 'stats') {
            try {
                if (!client.autoWebScrapeSender) {
                    const errorEmbed = new EmbedBuilder()
                        .setDescription("❌ Auto web scrape system not available.")
                        .setColor("#ff0000");
                    return interaction.editReply({ embeds: [errorEmbed] });
                }

                const contentStats = await client.autoWebScrapeSender.getContentStats();
                
                if (!contentStats) {
                    const errorEmbed = new EmbedBuilder()
                        .setDescription("❌ Failed to retrieve content statistics.")
                        .setColor("#ff0000");
                    return interaction.editReply({ embeds: [errorEmbed] });
                }

                const dbStats = contentStats.database;
                const cacheStats = contentStats.cache;

                // Calculate efficiency metrics
                const cacheHitRate = cacheStats.size > 0 ? ((cacheStats.size / (dbStats?.total || 1)) * 100).toFixed(1) : '0.0';
                const recentActivity = dbStats?.last24h || 0;
                const weeklyActivity = dbStats?.last72h || 0;

                const embed = new EmbedBuilder()
                    .setTitle("📊 Content Deduplication Statistics")
                    .setDescription("72-hour deduplication window tracking")
                    .addFields(
                        {
                            name: "🗄️ Database Records",
                            value: `Total Records: ${dbStats?.total || 0}\nLast 24h: ${recentActivity}\nLast 72h: ${weeklyActivity}`,
                            inline: true
                        },
                        {
                            name: "⚡ Cache Performance",
                            value: `Cache Size: ${cacheStats?.size || 0}/${cacheStats?.maxSize || 0}\nHit Rate: ${cacheHitRate}%\nMemory Efficient: ${cacheStats?.size < 800 ? '✅' : '⚠️'}`,
                            inline: true
                        },
                        {
                            name: "📈 Activity Breakdown",
                            value: `${Object.entries(dbStats?.bySource || {}).map(([source, count]) => `${source}: ${count}`).join('\n') || 'No data'}`,
                            inline: true
                        }
                    )
                    .setColor("#00ff00")
                    .setFooter({ text: "Prevents duplicate content within 72 hours" })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });

            } catch (error) {
                console.error('[ContentManager] Error getting stats:', error);
                const errorEmbed = new EmbedBuilder()
                    .setDescription(`❌ Error retrieving statistics: ${error.message}`)
                    .setColor("#ff0000");
                return interaction.editReply({ embeds: [errorEmbed] });
            }
        }

        if (action === 'cleanup') {
            try {
                if (!client.autoWebScrapeSender) {
                    const errorEmbed = new EmbedBuilder()
                        .setDescription("❌ Auto web scrape system not available.")
                        .setColor("#ff0000");
                    return interaction.editReply({ embeds: [errorEmbed] });
                }

                const deletedCount = await client.autoWebScrapeSender.cleanupOldContent();

                const embed = new EmbedBuilder()
                    .setTitle("🧹 Content Cleanup Complete")
                    .setDescription(`✅ Removed **${deletedCount}** old content records`)
                    .addFields(
                        {
                            name: "Cleanup Details",
                            value: `• Records older than 75 hours removed\n• Cache optimized\n• Memory freed\n• Database performance improved`,
                            inline: false
                        }
                    )
                    .setColor("#00ff00")
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });

            } catch (error) {
                console.error('[ContentManager] Error during cleanup:', error);
                const errorEmbed = new EmbedBuilder()
                    .setDescription(`❌ Cleanup failed: ${error.message}`)
                    .setColor("#ff0000");
                return interaction.editReply({ embeds: [errorEmbed] });
            }
        }

        if (action === 'check') {
            const url = interaction.options.getString('url');
            
            if (!url) {
                const errorEmbed = new EmbedBuilder()
                    .setDescription("❌ Please provide a URL to check.")
                    .setColor("#ff0000");
                return interaction.editReply({ embeds: [errorEmbed] });
            }

            if (!url.startsWith('http')) {
                const errorEmbed = new EmbedBuilder()
                    .setDescription("❌ Please provide a valid URL starting with http:// or https://")
                    .setColor("#ff0000");
                return interaction.editReply({ embeds: [errorEmbed] });
            }

            try {
                if (!client.autoWebScrapeSender) {
                    const errorEmbed = new EmbedBuilder()
                        .setDescription("❌ Auto web scrape system not available.")
                        .setColor("#ff0000");
                    return interaction.editReply({ embeds: [errorEmbed] });
                }

                const result = await client.autoWebScrapeSender.checkContentDuplication(
                    url, 
                    'unknown', 
                    'unknown', 
                    interaction.channelId
                );

                let statusColor = result.canPost ? "#00ff00" : "#ff9900";
                let statusText = result.canPost ? "✅ Can Post" : "⚠️ Recently Posted";
                
                const embed = new EmbedBuilder()
                    .setTitle("🔍 Content Duplication Check")
                    .setDescription(`**URL**: ${url.length > 100 ? url.substring(0, 100) + '...' : url}`)
                    .addFields(
                        {
                            name: "Status",
                            value: statusText,
                            inline: true
                        },
                        {
                            name: "Reason",
                            value: result.reason.replace(/_/g, ' ').toUpperCase(),
                            inline: true
                        },
                        {
                            name: "Details",
                            value: result.lastPosted ? 
                                `Last Posted: ${result.lastPosted.toLocaleString()}\nAvailable After: ${result.availableAfter?.toLocaleString() || 'Unknown'}` :
                                "No previous posting found",
                            inline: false
                        }
                    )
                    .setColor(statusColor)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });

            } catch (error) {
                console.error('[ContentManager] Error checking URL:', error);
                const errorEmbed = new EmbedBuilder()
                    .setDescription(`❌ Error checking URL: ${error.message}`)
                    .setColor("#ff0000");
                return interaction.editReply({ embeds: [errorEmbed] });
            }
        }
    }
};

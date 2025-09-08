const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: ["system-optimizer"],
    description: "🔧 Manage system performance and auto-posting optimization (Admin only)",
    options: [
        {
            name: "action",
            description: "Action to perform",
            type: 3, // STRING
            required: true,
            choices: [
                { name: "Status", value: "status" },
                { name: "Optimize", value: "optimize" },
                { name: "Emergency Stop", value: "emergency" },
                { name: "Cleanup", value: "cleanup" }
            ]
        }
    ],
    
    run: async (interaction, client) => {
        // Only defer if not already replied to
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply({ flags: 64 });
        }

        // Check permissions - only administrators
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const errorEmbed = new EmbedBuilder()
                .setDescription("❌ You need **Administrator** permission to use this command.")
                .setColor("#ff0000");
            return interaction.editReply({ embeds: [errorEmbed] });
        }

        const action = interaction.options.getString('action');

        if (action === 'status') {
            // Get system status
            const memUsage = process.memoryUsage();
            const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
            const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
            const rssMB = Math.round(memUsage.rss / 1024 / 1024);
            const externalMB = Math.round(memUsage.external / 1024 / 1024);

            let autoPostStats = "Not available";
            let optimizerStats = "Not available";
            let contentStats = "Not available";

            if (client.autoWebScrapeSender) {
                const stats = client.autoWebScrapeSender.getSystemStats();
                autoPostStats = `Active Configs: ${stats.activeConfigs}/100\nActive Posts: ${stats.activePosts}/${stats.maxConcurrent}\nHeap Used: ${stats.heapUsed}MB`;
                
                // Get content deduplication stats
                try {
                    const contentData = await client.autoWebScrapeSender.getContentStats();
                    if (contentData) {
                        contentStats = `DB Records: ${contentData.database?.total || 0}\nLast 72h: ${contentData.database?.last72h || 0}\nCache Size: ${contentData.cache?.size || 0}/${contentData.cache?.maxSize || 0}`;
                    }
                } catch (error) {
                    contentStats = "Error loading stats";
                }
            }

            if (client.autoPostOptimizer) {
                const stats = await client.autoPostOptimizer.getStats();
                optimizerStats = `Monitoring: ${stats.monitoring ? '✅' : '❌'}\nScale: ${stats.optimization?.scale || 'Unknown'}\nOptimizations: ${stats.optimization.optimizations}\nContent Cleanups: ${stats.optimization.contentCleanups || 0}`;
            }

            // Determine status color based on memory usage (scaled for 100 channels)
            let statusColor = "#00ff00"; // Green
            if (heapUsedMB > 140) statusColor = "#ff0000"; // Red
            else if (heapUsedMB > 120) statusColor = "#ff9900"; // Orange
            else if (heapUsedMB > 100) statusColor = "#ffff00"; // Yellow

            const embed = new EmbedBuilder()
                .setTitle("🔧 System Performance Status (100-Channel Scale)")
                .setDescription("Current system performance and optimization status")
                .addFields(
                    { 
                        name: "💾 Memory Usage", 
                        value: `Heap Used: ${heapUsedMB}MB / ${heapTotalMB}MB\nRSS: ${rssMB}MB\nExternal: ${externalMB}MB`, 
                        inline: true 
                    },
                    { 
                        name: "🚀 Auto-Post System", 
                        value: autoPostStats, 
                        inline: true 
                    },
                    { 
                        name: "⚡ Optimizer", 
                        value: optimizerStats, 
                        inline: true 
                    },
                    {
                        name: "🔄 Content Deduplication",
                        value: contentStats,
                        inline: false
                    }
                )
                .setColor(statusColor)
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        if (action === 'optimize') {
            if (!client.autoPostOptimizer) {
                const errorEmbed = new EmbedBuilder()
                    .setDescription("❌ Auto-post optimizer not available.")
                    .setColor("#ff0000");
                return interaction.editReply({ embeds: [errorEmbed] });
            }

            client.autoPostOptimizer.performMemoryCleanup();
            client.autoPostOptimizer.checkSystemHealth();

            const embed = new EmbedBuilder()
                .setTitle("⚡ System Optimization")
                .setDescription("✅ Manual optimization completed\n\n• Memory cleanup performed\n• System health check executed\n• Performance thresholds applied")
                .setColor("#00ff00")
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        if (action === 'emergency') {
            if (!client.autoWebScrapeSender) {
                const errorEmbed = new EmbedBuilder()
                    .setDescription("❌ Auto web scrape system not available.")
                    .setColor("#ff0000");
                return interaction.editReply({ embeds: [errorEmbed] });
            }

            const stoppedCount = await client.autoWebScrapeSender.emergencyStop();

            const embed = new EmbedBuilder()
                .setTitle("🚨 Emergency Stop Executed")
                .setDescription(`**${stoppedCount}** auto-posting configurations stopped immediately.\n\nThis action was taken to preserve system stability.`)
                .addFields(
                    { name: "Actions Taken", value: "• All auto-posts stopped\n• All timeouts cleared\n• Memory references cleaned\n• Emergency mode activated", inline: false }
                )
                .setColor("#ff0000")
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        if (action === 'cleanup') {
            // Perform comprehensive cleanup
            if (client.autoWebScrapeSender) {
                client.autoWebScrapeSender.cleanup();
            }

            if (client.autoPostOptimizer) {
                client.autoPostOptimizer.performMemoryCleanup();
            }

            // Force garbage collection
            if (global.gc) {
                global.gc();
            }

            const memUsage = process.memoryUsage();
            const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

            const embed = new EmbedBuilder()
                .setTitle("🧹 System Cleanup")
                .setDescription("✅ Comprehensive system cleanup completed")
                .addFields(
                    { 
                        name: "Actions Performed", 
                        value: "• Auto-post cleanup\n• Memory optimization\n• Timeout clearing\n• Garbage collection", 
                        inline: true 
                    },
                    { 
                        name: "Current Memory", 
                        value: `${heapUsedMB}MB heap used`, 
                        inline: true 
                    }
                )
                .setColor("#00ff00")
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }
};

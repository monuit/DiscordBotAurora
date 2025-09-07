const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: ["auto-redgifs"],
    description: "Start auto-posting Redgifs content",
    options: [
        {
            name: "action",
            description: "Action to perform",
            type: 3, // STRING
            required: true,
            choices: [
                { name: "start", value: "start" },
                { name: "stop", value: "stop" },
                { name: "status", value: "status" }
            ]
        },
        {
            name: "category",
            description: "Category of content to post",
            type: 3, // STRING
            required: false,
            choices: [
                { name: "Amateur", value: "amateur" },
                { name: "Anal", value: "anal" },
                { name: "Asian", value: "asian" },
                { name: "BBW", value: "bbw" },
                { name: "Big Ass", value: "big-ass" },
                { name: "Big Tits", value: "big-tits" },
                { name: "Blonde", value: "blonde" },
                { name: "Blowjob", value: "blowjob" },
                { name: "Brunette", value: "brunette" },
                { name: "Creampie", value: "creampie" },
                { name: "Cumshot", value: "cumshot" },
                { name: "Deepthroat", value: "deepthroat" },
                { name: "Doggystyle", value: "doggystyle" },
                { name: "Ebony", value: "ebony" },
                { name: "Facial", value: "facial" },
                { name: "Fetish", value: "fetish" },
                { name: "Hardcore", value: "hardcore" },
                { name: "Latina", value: "latina" },
                { name: "Lesbian", value: "lesbian" },
                { name: "MILF", value: "milf" },
                { name: "Oral", value: "oral" },
                { name: "Redhead", value: "redhead" },
                { name: "Threesome", value: "threesome" }
            ]
        },
        {
            name: "channel",
            description: "Channel to post in (current channel if not specified)",
            type: 7, // CHANNEL
            required: false
        }
    ],
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

        const action = interaction.options.getString('action');
        
        if (action === 'start') {
            const category = interaction.options.getString('category') || 'amateur';
            const channel = interaction.options.getChannel('channel') || interaction.channel;

            // Check if Redgifs is enabled - make it more flexible
            const redgifsEnabled = process.env.ENABLE_REDGIFS === 'true' || process.env.ENABLE_REDGIFS === '1' || !process.env.ENABLE_REDGIFS;
            if (!redgifsEnabled && process.env.ENABLE_REDGIFS === 'false') {
                const disabledEmbed = new EmbedBuilder()
                    .setDescription("❌ Redgifs auto-posting is currently disabled.")
                    .setColor("#ff0000");
                return interaction.editReply({ embeds: [disabledEmbed] });
            }

            // Start auto-posting
            if (client.autoWebScrapeSender) {
                try {
                    const result = await client.autoWebScrapeSender.startRedgifsPosting(channel.id, category);
                    
                    // Calculate time until next post
                    let nextPostInfo = "Not scheduled";
                    if (result.nextPostTime) {
                        const timeUntil = result.nextPostTime.getTime() - Date.now();
                        const minutesUntil = Math.floor(timeUntil / (1000 * 60));
                        const secondsUntil = Math.floor((timeUntil % (1000 * 60)) / 1000);
                        nextPostInfo = `${minutesUntil}m ${secondsUntil}s (${result.nextPostTime.toLocaleTimeString()})`;
                    }
                    
                    const embed = new EmbedBuilder()
                        .setTitle("🟢 Redgifs Auto-Posting Started (100-Channel Scale)")
                        .setDescription(`**Category**: ${category}\n**Channel**: ${channel}\n**Interval**: 15-35 minutes (optimized for 100 channels)\n**Deduplication**: 72-hour window\n**Method**: Direct URL posting`)
                        .addFields(
                            { name: "⏰ Next Post", value: nextPostInfo, inline: true },
                            { name: "📊 Posts Sent", value: "0", inline: true },
                            { name: "🚀 Status", value: "Running", inline: true }
                        )
                        .setColor("#00ff00")
                        .setFooter({ text: "Use /auto-redgifs action:status for detailed information" })
                        .setTimestamp();

                    return interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    console.error('[AutoRedgifs] Error starting auto-posting:', error);
                    const errorEmbed = new EmbedBuilder()
                        .setDescription(`❌ Failed to start auto-posting: ${error.message}`)
                        .setColor("#ff0000");
                    return interaction.editReply({ embeds: [errorEmbed] });
                }
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setDescription("❌ Auto web scrape system not initialized.")
                    .setColor("#ff0000");
                return interaction.editReply({ embeds: [errorEmbed] });
            }
        }
        
        else if (action === 'stop') {
            if (client.autoWebScrapeSender) {
                try {
                    await client.autoWebScrapeSender.stopRedgifsPosting();
                    
                    const embed = new EmbedBuilder()
                        .setTitle("🔴 Redgifs Auto-Posting Stopped")
                        .setDescription("Auto-posting has been stopped.")
                        .setColor("#ff0000")
                        .setTimestamp();

                    return interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    console.error('[AutoRedgifs] Error stopping auto-posting:', error);
                    const errorEmbed = new EmbedBuilder()
                        .setDescription("❌ Failed to stop auto-posting.")
                        .setColor("#ff0000");
                    return interaction.editReply({ embeds: [errorEmbed] });
                }
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setDescription("❌ Auto web scrape system not initialized.")
                    .setColor("#ff0000");
                return interaction.editReply({ embeds: [errorEmbed] });
            }
        }
        
        else if (action === 'status') {
            if (client.autoWebScrapeSender) {
                try {
                    const status = client.autoWebScrapeSender.getRedgifsStatus();
                    
                    const embed = new EmbedBuilder()
                        .setTitle("📊 Redgifs Auto-Posting Status")
                        .setDescription(`**System Status:** ${status.systemStatus}`)
                        .addFields(
                            { name: "🟢 Active", value: status.isActive ? "Yes" : "No", inline: true },
                            { name: "📍 Channel", value: status.channelId ? `<#${status.channelId}>` : "None", inline: true },
                            { name: "🏷️ Category", value: status.category || "None", inline: true },
                            { name: "⏰ Next Post", value: status.nextPost, inline: true },
                            { name: "📊 Posts Sent", value: status.postsSent.toString(), inline: true },
                            { name: "⏱️ Uptime", value: status.uptime, inline: true },
                            { name: "🔄 Interval", value: status.interval, inline: true },
                            { name: "📅 Last Post", value: status.lastPost, inline: true },
                            { name: "❌ Errors", value: status.errors.toString(), inline: true },
                            { name: "💾 Memory", value: status.memoryUsage, inline: true },
                            { name: "⏸️ Suspended", value: status.suspended ? "Yes" : "No", inline: true },
                            { name: "🔧 Environment", value: process.env.ENABLE_REDGIFS === 'true' ? "Enabled" : "Disabled", inline: true }
                        )
                        .setColor(status.isActive ? "#00ff00" : "#ff0000")
                        .setFooter({ text: "Real-time status information" })
                        .setTimestamp();

                    return interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    console.error('[AutoRedgifs] Error getting status:', error);
                    const errorEmbed = new EmbedBuilder()
                        .setDescription("❌ Failed to get status.")
                        .setColor("#ff0000");
                    return interaction.editReply({ embeds: [errorEmbed] });
                }
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setDescription("❌ Auto web scrape system not initialized.")
                    .setColor("#ff0000");
                return interaction.editReply({ embeds: [errorEmbed] });
            }
        }
    }
};

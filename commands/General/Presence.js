const { EmbedBuilder, PermissionsBitField, ActivityType } = require("discord.js");

module.exports = {
    name: ["presence", "status"],
    description: "View the bot's presence rotation system status (Owner only)",
    type: "CHAT_INPUT",
    category: "General",
    cooldown: 5,
    nsfwMode: false,
    testMode: false,
    premium: false,

    run: async (interaction, client) => {
        try {
            // Check if user is bot owner
            if (interaction.user.id !== client.owner) {
                return interaction.reply({
                    content: "❌ Only the bot owner can manage presence settings.",
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            if (!client.presenceRotation) {
                return interaction.editReply({
                    content: "❌ Presence rotation system is not initialized."
                });
            }

            const status = client.presenceRotation.getStatus();
            const currentPresence = status.currentPresence;

            const embed = new EmbedBuilder()
                .setTitle("🎭 Presence Rotation System")
                .setDescription("Current status and controls for the NSFW presence rotation system")
                .addFields([
                    {
                        name: "📊 System Status",
                        value: `**Active:** ${status.isRotating ? '✅ Yes' : '❌ No'}\n**Total Statuses:** ${status.totalStatuses}\n**Current Index:** ${status.currentIndex + 1}/${status.totalStatuses}`,
                        inline: true
                    },
                    {
                        name: "🎯 Current Presence",
                        value: `**Status:** ${currentPresence.name}\n**Type:** ${ActivityType[currentPresence.type]}\n**URL:** ${currentPresence.url || 'None'}`,
                        inline: true
                    },
                    {
                        name: "⏰ Rotation Info",
                        value: `**Next Rotation:** ${status.nextRotationActive ? '⏳ Scheduled' : '❌ Not scheduled'}\n**Interval:** 6-72 hours (random)`,
                        inline: false
                    }
                ])
                .setColor("#ca2c2b")
                .setTimestamp()
                .setFooter({ text: "Aurora Presence Manager", iconURL: client.user.displayAvatarURL() });

            // Create action buttons (we'll use string responses for simplicity)
            const actionInfo = [
                "**Available Commands:**",
                "`/presence start` - Start rotation",
                "`/presence stop` - Stop rotation", 
                "`/presence force` - Force next update",
                "`/presence status` - Show this status"
            ].join('\n');

            await interaction.editReply({
                embeds: [embed],
                content: actionInfo
            });

        } catch (error) {
            console.error('[Presence Command Error]:', error);
            
            try {
                await interaction.editReply({
                    content: "❌ An error occurred while managing presence settings."
                });
            } catch (replyError) {
                console.error('Failed to send error reply:', replyError);
            }
        }
    }
};

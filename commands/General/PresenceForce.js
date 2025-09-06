const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    name: ["presence", "force"],
    description: "Force the next presence update (Owner only)",
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

            const oldStatus = client.presenceRotation.getStatus();
            client.presenceRotation.forceUpdate();
            const newStatus = client.presenceRotation.getStatus();

            const embed = new EmbedBuilder()
                .setTitle("🔄 Presence Force Updated")
                .setDescription("The presence has been manually updated to the next status!")
                .addFields([
                    {
                        name: "📊 Previous Status",
                        value: `${oldStatus.currentPresence.name}`,
                        inline: true
                    },
                    {
                        name: "🎯 New Status",
                        value: `${newStatus.currentPresence.name}`,
                        inline: true
                    },
                    {
                        name: "📈 Progress",
                        value: `${newStatus.currentIndex + 1}/${newStatus.totalStatuses}`,
                        inline: true
                    }
                ])
                .setColor("#ff9900")
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed]
            });

            console.log(`[Presence] Force update by ${interaction.user.tag} - Changed to: ${newStatus.currentPresence.name}`);

        } catch (error) {
            console.error('[Presence Force Command Error]:', error);
            
            try {
                await interaction.editReply({
                    content: "❌ An error occurred while forcing presence update."
                });
            } catch (replyError) {
                console.error('Failed to send error reply:', replyError);
            }
        }
    }
};

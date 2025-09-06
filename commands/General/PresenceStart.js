const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    name: ["presence", "start"],
    description: "Start the presence rotation system (Owner only)",
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

            if (client.presenceRotation.getStatus().isRotating) {
                return interaction.editReply({
                    content: "⚠️ Presence rotation is already active."
                });
            }

            client.presenceRotation.startRotation();

            const embed = new EmbedBuilder()
                .setTitle("✅ Presence Rotation Started")
                .setDescription("The NSFW presence rotation system has been activated!")
                .addFields([
                    {
                        name: "📊 System Info",
                        value: `**Total Statuses:** ${client.presenceRotation.getStatus().totalStatuses}\n**Rotation Interval:** 6-72 hours (random)\n**Status:** 🔄 Active`,
                        inline: false
                    }
                ])
                .setColor("#00ff00")
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed]
            });

            console.log(`[Presence] Rotation started by ${interaction.user.tag}`);

        } catch (error) {
            console.error('[Presence Start Command Error]:', error);
            
            try {
                await interaction.editReply({
                    content: "❌ An error occurred while starting presence rotation."
                });
            } catch (replyError) {
                console.error('Failed to send error reply:', replyError);
            }
        }
    }
};

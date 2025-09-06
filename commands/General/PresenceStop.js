const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    name: ["presence", "stop"],
    description: "Stop the presence rotation system (Owner only)",
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

            if (!client.presenceRotation.getStatus().isRotating) {
                return interaction.editReply({
                    content: "⚠️ Presence rotation is already stopped."
                });
            }

            client.presenceRotation.stopRotation();

            const embed = new EmbedBuilder()
                .setTitle("🛑 Presence Rotation Stopped")
                .setDescription("The NSFW presence rotation system has been deactivated.")
                .addFields([
                    {
                        name: "📊 System Info",
                        value: `**Status:** ❌ Stopped\n**Last Status:** ${client.presenceRotation.getStatus().currentPresence.name}\n**Total Statuses:** ${client.presenceRotation.getStatus().totalStatuses}`,
                        inline: false
                    }
                ])
                .setColor("#ff0000")
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed]
            });

            console.log(`[Presence] Rotation stopped by ${interaction.user.tag}`);

        } catch (error) {
            console.error('[Presence Stop Command Error]:', error);
            
            try {
                await interaction.editReply({
                    content: "❌ An error occurred while stopping presence rotation."
                });
            } catch (replyError) {
                console.error('Failed to send error reply:', replyError);
            }
        }
    }
};

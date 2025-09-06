// DISABLED: TikTok command disabled per user request
// This command has been disabled due to reliability issues

const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: ["tiktok-disabled"],
    description: "TikTok command has been disabled",
    run: async (interaction, client, user, language) => {
        await interaction.deferReply({ ephemeral: true });
        
        const disabledEmbed = new EmbedBuilder()
            .setDescription("❌ TikTok command has been disabled due to reliability issues.")
            .setColor(client.color || '#ff0000');
            
        interaction.editReply({ embeds: [disabledEmbed] });
    }
}

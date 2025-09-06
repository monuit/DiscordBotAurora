const { EmbedBuilder } = require("discord.js");
require("dotenv").config();

module.exports = {
    name: ["my-redeem"],
    description: "check your premium status (self-hosted)",
    run: async (interaction, client, language) => {
        await interaction.deferReply({ ephemeral: false });
        
        // Check if user is the owner
        const isOwner = interaction.user.id === process.env.OWNER_ID;
        
        const embed = new EmbedBuilder()
            .setColor(client.color);
            
        if (isOwner) {
            embed.setDescription(`🎉 **${interaction.user.username}** - You have **OWNER PREMIUM ACCESS**\n\n✅ All premium features unlocked\n✅ Permanent access\n✅ Self-hosted instance privileges`)
                 .setFooter({ text: "Owner Access - Self Hosted" });
        } else {
            embed.setDescription(`💎 **${interaction.user.username}** - This is a **SELF-HOSTED** instance\n\n🔓 All features are available to server members\n🎯 No premium system needed\n🏠 Enjoy the full bot experience!`)
                 .setFooter({ text: "Self-Hosted Access" });
        }

        return interaction.editReply({ embeds: [embed] });
    }
}

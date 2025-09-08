const { EmbedBuilder } = require("discord.js");
require("dotenv").config();

module.exports = {
    name: ["guild-premium-stats"],
    description: "check guild premium status (self-hosted)",
    run: async (interaction, client, language) => {
    await interaction.deferReply({ flags: 0 });
        
        // Check if user is the owner
        const isOwner = interaction.user.id === process.env.OWNER_ID;
        
        const embed = new EmbedBuilder()
            .setColor(client.color);
            
        if (isOwner) {
            embed.setDescription(`🏠 **${interaction.guild.name}** - **OWNER MANAGED SERVER**\n\n✅ Full bot access enabled\n✅ All premium features unlocked\n🔧 Self-hosted configuration\n👑 Owner privileges active`)
                 .setFooter({ text: "Owner Server - Self Hosted" });
        } else {
            embed.setDescription(`🏠 **${interaction.guild.name}** - **SELF-HOSTED INSTANCE**\n\n🎯 All features available\n🔓 No premium restrictions\n✨ Full bot functionality\n🎉 Enjoy unlimited access!`)
                 .setFooter({ text: "Self-Hosted Server Access" });
        }

        return interaction.editReply({ embeds: [embed] });
    }
}

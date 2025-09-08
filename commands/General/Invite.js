const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: ["invite"],
    description: "Bot invite information",
    run: async (interaction, client) => {
        const embed = new EmbedBuilder()
            .setDescription(`🔒 This bot is privately hosted and not available for public invitation.\n\nFor support, contact the server owner.`)
            .setColor(client.color)
            .setFooter({ text: "Private Instance" });

    interaction.reply({ embeds: [embed], flags: 64 });
    }
}

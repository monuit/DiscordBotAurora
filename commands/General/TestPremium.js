const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: ["test", "premium"],
    description: "🧪 Test the premium promotional message (Admin only)",
    type: "CHAT_INPUT",
    category: "General",
    cooldown: 10,
    nsfwMode: false,
    run: async (interaction, client) => {
        try {
            // Check if user has administrator permissions
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                const noPermEmbed = new EmbedBuilder()
                    .setDescription("❌ **Access Denied**\n\nYou need administrator permissions to use this command.")
                    .setColor("#ff0000");
                
                await interaction.reply({
                    embeds: [noPermEmbed],
                    flags: 64
                });
                return;
            }

            await interaction.deferReply({ flags: 64 });

            // Use the bot's existing auto promo instance
            const autoPromo = client.autoPromo;
            
            if (!autoPromo) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle("❌ System Error")
                    .setDescription(`**Auto-promo system not initialized**\n\nThe bot's auto-promotional system is not available.`)
                    .setColor("#ff0000");
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Send the premium promotional message
            const success = await autoPromo.testPremiumPromo();
            
            if (success) {
                const successEmbed = new EmbedBuilder()
                    .setTitle("✅ Premium Promo Test Successful")
                    .setDescription(`**Premium promotional message sent!**\n\n` +
                                   `📍 **Channel:** <#${autoPromo.premiumPromoConfig.channelId}>\n` +
                                   `💎 **Type:** Premium content promotion\n` +
                                   `⚡ **Status:** Message posted successfully`)
                    .setColor("#00ff00")
                    .setFooter({ text: "Premium auto-promotional test • Only visible to you" });
                
                await interaction.editReply({ embeds: [successEmbed] });
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setTitle("❌ Test Failed")
                    .setDescription(`**Failed to send premium promotional message**\n\n` +
                                   `Please check the bot's permissions and channel access.`)
                    .setColor("#ff0000")
                    .setFooter({ text: "Premium auto-promotional test • Only visible to you" });
                
                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Test premium command error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setDescription("❌ **Error occurred**\n\nAn error occurred while testing the premium promotional message.")
                .setColor("#ff0000");
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    embeds: [errorEmbed],
                    flags: 64
                });
            } else {
                await interaction.editReply({ embeds: [errorEmbed] });
            }
        }
    }
};

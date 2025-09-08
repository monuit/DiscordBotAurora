const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: ["test", "promo"],
    description: "🧪 Test the promotional auto-feed message (Admin only)",
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

            // Use the bot's existing auto promo instance instead of creating a new one
            const autoPromo = client.autoPromo;
            
            if (!autoPromo) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle("❌ System Error")
                    .setDescription(`**Auto-promo system not initialized**\n\nThe bot's auto-promotional system is not available.`)
                    .setColor("#ff0000");
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Send the promotional message using the main instance
            const success = await autoPromo.sendPromoMessage();
            
            if (success) {
                const successEmbed = new EmbedBuilder()
                    .setTitle("✅ Test Successful")
                    .setDescription(`**Promotional message sent!**\n\n` +
                                   `📍 **Channel:** <#${autoPromo.channelId}>\n` +
                                   `🎯 **Target Role:** <@&${autoPromo.roleId}>\n` +
                                   `⚡ **Status:** Message posted successfully`)
                    .setColor("#00ff00")
                    .setFooter({ text: "Auto-promotional test • Only visible to you" });
                
                await interaction.editReply({ embeds: [successEmbed] });
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setTitle("❌ Test Failed")
                    .setDescription(`**Failed to send promotional message**\n\n` +
                                   `Please check the bot's permissions and channel access.`)
                    .setColor("#ff0000")
                    .setFooter({ text: "Auto-promotional test • Only visible to you" });
                
                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Test promo command error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setDescription("❌ **Error occurred**\n\nAn error occurred while testing the promotional message.")
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

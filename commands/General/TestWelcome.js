const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    name: ["testwelcome"],
    description: "Test the welcome DM system",
    type: "CHAT_INPUT",
    category: "General",
    cooldown: 5,
    nsfwMode: false,
    testMode: false,
    premium: false,

    run: async (interaction, client) => {
        try {
            // Check if user has administrator permissions
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({
                    content: "❌ Only administrators can test the welcome DM system.",
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            // Create the same embeds as the welcome DM
            const promoEmbed = new EmbedBuilder()
                .setTitle("🎯 Over 1,3 Million Content Items & Growing Daily")
                .setDescription(`🏆 **Curated Quality Content** - We personally review every single upload. No user-generated spam - only the absolute best of the best content makes it to our platform.\n\n👥 **Community-Driven Excellence** - Built from months of suggestions and feedback from our 100K+ Discord network users. Every feature reflects real user needs and desires, ensuring complete satisfaction.\n\n**Dive into https://upgrade.chat/storeaurora – Where Lewd Meets Lovely.**\n\n24/7 support at discord now at: https://discord.gg/NFNEeKBzaW`)
                .setImage("https://images-ext-1.discordapp.net/external/zDcyR489Drn7MI1qz2LJ_EO03alPBqb75QSxNWVErjk/https/53i8m4rb.b-cdn.net/free/ads/AssondraSexton1.gif")
                .setColor("#ca2c2b")
                .setTimestamp();

            const serverEmbed = new EmbedBuilder()
                .setDescription(`**Sent from server:** [Aurora](https://discord.gg/NFNEeKBzaW)`)
                .setColor("#ca2c2b")
                .setFooter({ 
                    text: "Aurora Bot", 
                    iconURL: client.user?.displayAvatarURL() || "https://cdn.discordapp.com/embed/avatars/0.png"
                });

            // Try to send DM to the user
            try {
                await interaction.user.send({
                    embeds: [promoEmbed, serverEmbed]
                });

                await interaction.editReply({
                    content: "✅ **Welcome DM test successful!**\n\nThe welcome message has been sent to your DMs. This is exactly what new members will receive when they join the server."
                });

                console.log(`[Test Welcome DM] Successfully sent test DM to ${interaction.user.tag} (${interaction.user.id})`);

            } catch (dmError) {
                console.log(`[Test Welcome DM] Failed to send DM to ${interaction.user.tag}:`, dmError.message);
                
                await interaction.editReply({
                    content: `❌ **Failed to send welcome DM**\n\nError: ${dmError.message}\n\nThis could be because:\n• Your DMs are disabled\n• You have blocked the bot\n• You don't allow DMs from server members\n\nThe welcome system is still active for new members with open DMs.`
                });
            }

        } catch (error) {
            console.error('[Test Welcome Command Error]:', error);
            
            try {
                await interaction.editReply({
                    content: "❌ An error occurred while testing the welcome DM system."
                });
            } catch (replyError) {
                console.error('Failed to send error reply:', replyError);
            }
        }
    }
};

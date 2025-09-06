const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const antiSpamSystem = require("../../utils/antiSpamSystem");

module.exports = {
    name: ["antispam"],
    description: "Manage the anti-spam system (Admin only)",
    options: [
        {
            name: "action",
            description: "Action to perform",
            type: 3, // STRING
            required: true,
            choices: [
                { name: "stats", value: "stats" },
                { name: "unmute", value: "unmute" },
                { name: "list-muted", value: "list_muted" }
            ]
        },
        {
            name: "user",
            description: "User ID to unmute (only for unmute action)",
            type: 3, // STRING
            required: false
        }
    ],
    run: async (interaction, client, user, language) => {
        // Check if user has administrator permissions
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: "❌ You need Administrator permissions to use this command.",
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const action = interaction.options.getString("action");
        const targetUser = interaction.options.getString("user");

        switch (action) {
            case "stats":
                const stats = antiSpamSystem.getStats();
                const embed = new EmbedBuilder()
                    .setTitle("🛡️ Anti-Spam System Stats")
                    .setColor(client.color || '#0099ff')
                    .addFields([
                        { 
                            name: "📊 Current Status", 
                            value: `🔍 Tracked Users: **${stats.trackedUsers}**\n🔇 Muted Users: **${stats.mutedUsers}**`,
                            inline: true 
                        },
                        { 
                            name: "⚙️ Configuration", 
                            value: `📈 Max Commands/Min: **${stats.config.maxCommandsPerMinute}**\n🔄 Max Same Command: **${stats.config.maxSameCommandRepeats}**\n⏱️ Tracking Window: **${stats.config.trackingWindowMs/1000}s**`,
                            inline: true 
                        },
                        { 
                            name: "⏰ Mute Durations", 
                            value: `1st Offense: **${stats.config.firstOffenseMute/60000}m**\n2nd Offense: **${stats.config.secondOffenseMute/60000}m**\n3rd+ Offense: **${stats.config.thirdOffenseMute/60000}m**`,
                            inline: true 
                        }
                    ])
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
                break;

            case "unmute":
                if (!targetUser) {
                    return interaction.editReply({
                        content: "❌ Please provide a user ID to unmute."
                    });
                }

                const unmuted = antiSpamSystem.unmuteUser(targetUser);
                if (unmuted) {
                    await interaction.editReply({
                        content: `✅ User \`${targetUser}\` has been unmuted.`
                    });
                } else {
                    await interaction.editReply({
                        content: `❌ User \`${targetUser}\` is not currently muted.`
                    });
                }
                break;

            case "list_muted":
                const mutedUsers = [];
                for (const [userId, muteInfo] of antiSpamSystem.mutedUsers.entries()) {
                    const remaining = Math.ceil((muteInfo.mutedUntil - Date.now()) / 1000);
                    if (remaining > 0) {
                        mutedUsers.push(`👤 \`${userId}\` - ${remaining}s remaining (${muteInfo.reason})`);
                    }
                }

                const listEmbed = new EmbedBuilder()
                    .setTitle("🔇 Currently Muted Users")
                    .setColor(client.color || '#ff6b6b')
                    .setDescription(mutedUsers.length > 0 ? mutedUsers.join('\n') : "No users are currently muted.")
                    .setTimestamp();

                await interaction.editReply({ embeds: [listEmbed] });
                break;

            default:
                await interaction.editReply({
                    content: "❌ Invalid action specified."
                });
        }
    }
}

const { EmbedBuilder, ActionRowBuilder, SelectMenuBuilder, SelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const RoleAccessControl = require("../../utils/roleAccessControl");

module.exports = {
    name: ["help"],
    description: "Get help about bot commands and features",
    run: async (interaction, client) => {
        // Check role-based access control
        const accessCheck = await RoleAccessControl.checkUserAccess(interaction);
        if (!accessCheck.hasAccess) {
            await interaction.reply({
                embeds: [accessCheck.embed],
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(client.color || "#ca2c2b")
            .setTitle("🔥 Aurora Bot - Command Guide")
            .setDescription(`Welcome **${interaction.user.username}**! Here are my key commands:`)
            .addFields(
                { 
                    name: "⚡ **Quick Start Commands**", 
                    value: "• `/ping` - Check bot status and latency\n• `/reddit` - Fetch NSFW content from various subreddits\n• `/help` - This help menu", 
                    inline: false 
                },
                { 
                    name: "�️ **Setup & Management**", 
                    value: "• `/autopost` - Configure automatic content posting\n• `/manage channels` - Set channel restrictions (Admin only)\n• `/remove autopost` - Remove auto-posting setup", 
                    inline: false 
                },
                { 
                    name: "🎯 **Content Categories**", 
                    value: "• **NSFW Commands** - Various adult content categories\n• **Reddit Integration** - 18+ subreddit content\n• **Auto-feeds** - Scheduled content posting\n• **Channel Management** - Restrict bot to specific channels", 
                    inline: false 
                },
                { 
                    name: "🔧 **Bot Features**", 
                    value: "• ✅ Auto-delete responses (30 seconds)\n• ✅ Webhook-based posting system\n• ✅ Premium features (self-hosted)\n• ✅ NSFW presence rotation\n• ✅ Advanced error handling", 
                    inline: false 
                },
                { 
                    name: "� **How to Use**", 
                    value: "1. Type `/` to see all available commands\n2. Use `/autopost` to set up automatic posting\n3. Configure channel restrictions with `/manage channels`\n4. Enjoy unlimited access to all features!", 
                    inline: false 
                }
            )
            .setFooter({ 
                text: "Aurora Bot • Self-Hosted • Responses auto-delete in 30s • Made with ❤️", 
                iconURL: client.user.displayAvatarURL() 
            })
            .setTimestamp();

        const btns = new ActionRowBuilder();
        
        // Only add buttons if URLs are available
        if (client.invite && client.invite.trim()) {
            btns.addComponents(
                new ButtonBuilder()
                    .setLabel("Invite")
                    .setURL(client.invite)
                    .setStyle(ButtonStyle.Link)
            );
        }
        
        if (client.support && client.support.trim()) {
            btns.addComponents(
                new ButtonBuilder()
                    .setLabel("Support")
                    .setURL(client.support)
                    .setStyle(ButtonStyle.Link)
            );
        }

        const replyOptions = { 
            embeds: [embed],
            ephemeral: true  // Make the response only visible to the user
        };
        
        // Only add components if we have buttons
        if (btns.components.length > 0) {
            replyOptions.components = [btns];
        }

        interaction.reply(replyOptions);
    }
}

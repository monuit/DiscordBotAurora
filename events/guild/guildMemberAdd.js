const { EmbedBuilder } = require("discord.js");
const logger = require("../../utils/jsonLogger");

module.exports = async (client, member) => {
    try {
        // Don't DM bots
        if (member.user.bot) return;

        // Log the member join
        logger.info(`New member joined: ${member.user.tag}`, {
            userId: member.user.id,
            username: member.user.tag,
            guildId: member.guild.id,
            guildName: member.guild.name,
            memberCount: member.guild.memberCount
        });

        // Create the main promotional embed
        const promoEmbed = new EmbedBuilder()
            .setTitle("🎯 Over 1,3 Million Content Items & Growing Daily")
            .setDescription(`🏆 **Curated Quality Content** - We personally review every single upload. No user-generated spam - only the absolute best of the best content makes it to our platform.\n\n👥 **Community-Driven Excellence** - Built from months of suggestions and feedback from our 100K+ Discord network users. Every feature reflects real user needs and desires, ensuring complete satisfaction.\n\n**Dive into https://upgrade.chat/storeaurora – Where Lewd Meets Lovely.**\n\n24/7 support at discord now at: https://discord.gg/NFNEeKBzaW`)
            .setImage("https://images-ext-1.discordapp.net/external/zDcyR489Drn7MI1qz2LJ_EO03alPBqb75QSxNWVErjk/https/53i8m4rb.b-cdn.net/free/ads/AssondraSexton1.gif")
            .setColor("#ca2c2b")
            .setTimestamp();

        // Create the server reference embed
        const serverEmbed = new EmbedBuilder()
            .setDescription(`**Sent from server:** [Aurora](https://discord.gg/NFNEeKBzaW)`)
            .setColor("#ca2c2b")
            .setFooter({ 
                text: "Aurora Bot", 
                iconURL: client.user?.displayAvatarURL() || "https://cdn.discordapp.com/embed/avatars/0.png"
            });

        // Send DM to the new member
        try {
            await member.send({
                embeds: [promoEmbed, serverEmbed]
            });
            
            console.log(`[Member Join DM] Successfully sent welcome DM to ${member.user.tag} (${member.user.id})`);
            
            // Log successful DM
            logger.info(`Welcome DM sent successfully`, {
                userId: member.user.id,
                username: member.user.tag,
                guildId: member.guild.id,
                guildName: member.guild.name,
                action: 'welcome_dm_sent'
            });

        } catch (dmError) {
            // User has DMs disabled or blocked the bot
            console.log(`[Member Join DM] Could not send DM to ${member.user.tag}: ${dmError.message}`);
            
            // Log failed DM attempt
            logger.warning(`Failed to send welcome DM`, {
                userId: member.user.id,
                username: member.user.tag,
                guildId: member.guild.id,
                guildName: member.guild.name,
                error: dmError.message,
                action: 'welcome_dm_failed'
            });
        }

    } catch (error) {
        console.error('[Guild Member Add Error]:', error);
        
        // Log the error
        logger.error(`Guild member add event error`, {
            error: error.message,
            stack: error.stack,
            guildId: member?.guild?.id,
            userId: member?.user?.id
        });
    }
};
